/**
 * WebRTC viewer capacity ramp for the origin Ant Media droplet (SEC-192).
 *
 * What it does:
 *   1. snapshots every stream currently broadcasting — those are real cameras
 *   2. creates its own disposable broadcast and publishes a test pattern to it
 *   3. ramps synthetic WebRTC viewers onto *that* stream, in steps
 *   4. after every step, checks the thresholds in ramp.mjs and the real cameras
 *   5. tears down the broadcast and the publisher, whatever happened
 *
 * It loads a real server. There is no dry-run that produces a number, because a
 * number that did not come from a loaded server is not a measurement. The
 * confirmation flag exists so that is a decision, not an accident.
 *
 * Usage:
 *   node loadtest/run.mjs --confirm=i-am-load-testing-a-live-server \
 *     [--env=.env.local] [--start=5] [--step=5] [--max=40] [--hold=20000]
 *
 * The synthetic viewers run in one local Chromium. That machine is a real
 * constraint: past a few dozen decoding tabs the laptop becomes the bottleneck
 * before the droplet does, and the run reports that rather than pretending the
 * ceiling was the server's. See loadtest/README.md.
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'
import { loadEnv, createAmsClient, snapshotGuardStreams, guardStreamsHealthy } from './ams.mjs'
import { VIEWER_HTML } from './viewer-page.mjs'
import {
  planRamp,
  evaluateStep,
  abortReason,
  findKnee,
  recommendedCap,
  DEFAULT_THRESHOLDS,
} from './ramp.mjs'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const CONFIRM_PHRASE = 'i-am-load-testing-a-live-server'

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v = 'true'] = a.replace(/^--/, '').split('=')
    return [k, v]
  }),
)

if (args.confirm !== CONFIRM_PHRASE) {
  console.error(
    `Refusing to run.\n\n` +
      `This puts synthetic viewers on a live Ant Media server. Re-run with:\n` +
      `  --confirm=${CONFIRM_PHRASE}\n`,
  )
  process.exit(1)
}

const envPath = path.resolve(HERE, '..', args.env ?? '.env.local')
const env = loadEnv(envPath)

const required = ['ANTMEDIA_URL', 'ANTMEDIA_APP', 'ANTMEDIA_API_KEY', 'ANTMEDIA_RTMP_URL']
const missing = required.filter((k) => !env[k])
if (missing.length) {
  console.error(`Missing from ${envPath}: ${missing.join(', ')}`)
  process.exit(1)
}

// ffmpeg is not on this machine's session PATH even though it is installed;
// allow an override rather than failing on a PATH quirk.
const FFMPEG = args.ffmpeg ?? env.FFMPEG_PATH ?? 'ffmpeg'

const ams = createAmsClient({
  baseUrl: env.ANTMEDIA_URL,
  app: env.ANTMEDIA_APP,
  apiKey: env.ANTMEDIA_API_KEY,
})

const streamId = `primex-loadtest-${Date.now()}`
const ramp = planRamp({
  start: Number(args.start ?? 5),
  step: Number(args.step ?? 5),
  max: Number(args.max ?? 40),
  holdMs: Number(args.hold ?? 20_000),
})

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/**
 * How long a viewer gets to paint a frame before it counts as failed.
 *
 * Generous on purpose: WebRTC playback cannot paint until a keyframe arrives, so
 * a camera with a long GOP legitimately costs seconds before anything appears.
 * That is a property of the source, not of server capacity, and failing viewers
 * for it would report a ceiling that isn't there.
 */
const VIEWER_TIMEOUT_MS = 25_000

let ffmpeg = null
let browser = null
let server = null
let createdBroadcast = false
let publisherDied = null
let publisherRestarts = 0
let tearingDown = false
const viewers = []

async function teardown() {
  tearingDown = true
  console.log('\n--- teardown ---')
  for (const v of viewers) {
    await v.page.close().catch(() => {})
  }
  if (browser) await browser.close().catch(() => {})
  if (server) await new Promise((r) => server.close(r))
  if (ffmpeg && !ffmpeg.killed) {
    ffmpeg.kill('SIGKILL')
    console.log('publisher stopped')
  }
  if (createdBroadcast) {
    await ams
      .deleteBroadcast(streamId)
      .then(() => console.log(`deleted broadcast ${streamId}`))
      .catch((e) => console.warn(`could not delete ${streamId}: ${e.message}`))
  }
}

/** Open one viewer and time how long until it paints a frame. */
async function openViewer(index, playToken, viewerBase, wsUrl) {
  const page = await browser.newPage()
  const url =
    `${viewerBase}/?streamId=${encodeURIComponent(streamId)}` +
    `&ws=${encodeURIComponent(wsUrl)}` +
    (playToken ? `&token=${encodeURIComponent(playToken)}` : '')

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30_000 })
    await page.waitForFunction(() => window.__viewer?.firstFrameMs || window.__viewer?.error, null, {
      timeout: VIEWER_TIMEOUT_MS,
    })

    const state = await page.evaluate(() => window.__viewer)
    if (state.firstFrameMs) {
      viewers.push({ index, page, ttffMs: state.firstFrameMs, playStartedMs: state.playStartedMs, ok: true })
      return { ok: true }
    }
    viewers.push({ index, page, ttffMs: null, ok: false, error: state.error })
    return { ok: false, error: state.error }
  } catch (e) {
    // Keep the page: a viewer that failed to start still occupies whatever the
    // server allocated for it, and closing it would flatter the next step.
    const state = await page.evaluate(() => window.__viewer).catch(() => null)
    viewers.push({ index, page, ttffMs: null, ok: false, error: state?.error ?? 'timeout' })
    return { ok: false, error: state?.error ?? e.message.split('\n')[0] }
  }
}

async function main() {
  const version = await ams.version()
  console.log(`Ant Media ${version.versionName} (${version.versionType}) at ${ams.baseUrl}`)

  const guardIds = await snapshotGuardStreams(ams, streamId)
  console.log(
    guardIds.length
      ? `guarding ${guardIds.length} live camera stream(s): ${guardIds.join(', ')}`
      : 'no live camera streams to guard',
  )

  console.log(`\ncreating disposable broadcast ${streamId}`)
  await ams.createBroadcast({ streamId, name: 'Primex load test', type: 'liveStream' })
  createdBroadcast = true

  const expire = Math.floor(Date.now() / 1000) + 3600
  let publishToken = null
  try {
    publishToken = (await ams.token(streamId, 'publish', expire)).tokenId
  } catch (e) {
    console.warn(`publish token unavailable (${e.message.slice(0, 80)}) — publishing untokened`)
  }

  const rtmpBase = env.ANTMEDIA_RTMP_URL.replace(/\/+$/, '')
  const rtmpUrl = `${rtmpBase}/${streamId}${publishToken ? `?token=${publishToken}` : ''}`

  // The source profile is a parameter of the result, not a detail: per-viewer
  // server cost scales with bitrate, so a ceiling measured at 1500k does not
  // transfer to a fleet of 500k cameras. Defaults sit near the substream profile
  // the real cameras on this server publish, and a 2s GOP keeps time-to-first-
  // frame honest (WebRTC cannot paint until a keyframe arrives).
  const width = Number(args.width ?? 640)
  const height = Number(args.height ?? 360)
  const fps = Number(args.fps ?? 15)
  const bitrate = args.bitrate ?? '600k'
  console.log(`starting test-pattern publisher (${width}x${height}@${fps}, ${bitrate})`)

  /**
   * The RTMP publish drops on its own — the first full run lost it after ~90s
   * with WSAECONNABORTED. When that happens the stream stops, viewers fail to
   * start and the server reports zero viewers, which reads exactly like
   * saturation: that run would have reported a ceiling of 3 viewers.
   *
   * So respawn rather than give up, and count the restarts. A step is only
   * invalidated if the stream is still down when the step is evaluated.
   */
  function startPublisher() {
    // Video only by default. Every observed publish drop reported the failure on
    // the *audio* muxer (`aost#0:1/aac ... Error submitting a packet`), and the
    // cameras this models are video-only anyway, so the audio track was adding a
    // failure mode that production does not have. Pass --audio=true to restore.
    const audio = args.audio === 'true'
    const child = spawn(
      FFMPEG,
      [
        '-hide_banner', '-loglevel', 'error',
        '-re',
        '-f', 'lavfi', '-i', `testsrc2=size=${width}x${height}:rate=${fps}`,
        ...(audio ? ['-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=44100'] : []),
        '-c:v', 'libx264', '-preset', 'veryfast', '-tune', 'zerolatency',
        '-b:v', bitrate, '-g', String(fps * 2), '-pix_fmt', 'yuv420p',
        ...(audio ? ['-c:a', 'aac', '-b:a', '32k'] : ['-an']),
        '-f', 'flv', rtmpUrl,
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    )
    child.stderr.on('data', (d) => {
      const line = d.toString().trim()
      if (line) console.warn(`[ffmpeg] ${line.slice(0, 160)}`)
    })
    child.on('exit', (code, signal) => {
      if (tearingDown) return
      publisherRestarts += 1
      publisherDied = `publisher exited (code ${code}, signal ${signal ?? 'none'})`
      console.warn(`[publisher] ${publisherDied} — restart #${publisherRestarts}`)
      setTimeout(() => {
        if (!tearingDown) ffmpeg = startPublisher()
      }, 1000)
    })
    return child
  }

  ffmpeg = startPublisher()

  // Wait for AMS to see the ingest before pointing viewers at it.
  let live = false
  for (let i = 0; i < 30; i++) {
    await sleep(1000)
    const b = await ams.getBroadcast(streamId).catch(() => null)
    if (b?.status === 'broadcasting') {
      live = true
      break
    }
  }
  if (!live) throw new Error('test stream never reached "broadcasting" — publisher failed')
  console.log('test stream is live\n')

  // Serve the minimal viewer locally rather than loading AMS's play.html — see
  // viewer-page.mjs for why the demo player made the measurement meaningless.
  server = http.createServer((_req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' })
    res.end(VIEWER_HTML)
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const viewerBase = `http://127.0.0.1:${server.address().port}`
  const wsUrl = `${ams.baseUrl.replace(/^https/, 'wss')}/${ams.app}/websocket`
  console.log(`viewer page on ${viewerBase}, signaling to ${wsUrl}\n`)

  browser = await chromium.launch({
    args: ['--autoplay-policy=no-user-gesture-required', '--mute-audio'],
  })

  const results = []
  let aborted = null
  let invalid = null
  // Set by the first step and held fixed: every later step is judged against
  // how the server behaved when it was barely loaded.
  let baselineTtffP95 = null

  for (const step of ramp) {
    const toOpen = step.viewers - viewers.length
    process.stdout.write(`step ${step.index + 1}: ${step.viewers} viewers (+${toOpen}) ... `)

    const restartsAtStepStart = publisherRestarts

    // Tokens first (sequential, cheap), then all viewers at once. Opening them
    // one at a time made a 40-viewer ramp take ~6 minutes, and the RTMP publish
    // does not survive that long — the ramp kept losing its source before it
    // could reach an interesting number. A burst is also the realistic shape:
    // several dispatchers opening the same site at once is the scenario this
    // issue is about.
    const tokens = []
    for (let i = 0; i < toOpen; i++) {
      try {
        tokens.push((await ams.token(streamId, 'play', expire)).tokenId)
      } catch {
        tokens.push(null) // token control may be off; null is then correct
      }
    }

    const base = viewers.length
    const opened = await Promise.all(
      tokens.map((token, i) => openViewer(base + i, token, viewerBase, wsUrl)),
    )

    await sleep(step.holdMs)

    const broadcast = await ams.getBroadcast(streamId).catch(() => null)
    const healthy = await guardStreamsHealthy(ams, guardIds).catch(() => true)

    // Checked before the thresholds: a dead source invalidates the step rather
    // than failing it. A publisher that dropped and recovered is fine — what
    // matters is whether the stream is live *now*, as the step is judged.
    if (broadcast?.status !== 'broadcasting') {
      invalid =
        `test stream was not broadcasting when the step was evaluated ` +
        `(status: ${broadcast?.status ?? 'unreadable'}${publisherDied ? `; last publisher event: ${publisherDied}` : ''})`
      console.log(`\nINVALID: ${invalid}`)
      break
    }

    // A restart *within* the step is just as invalidating as a dead stream, and
    // far more deceptive: the new ingest session drops every attached viewer, so
    // the server's count collapses while status reads "broadcasting" again. The
    // previous run failed here — 33 viewers connected, server reported 1 — and
    // would have called it saturation at 35.
    if (publisherRestarts > restartsAtStepStart) {
      invalid = `publisher restarted during the ${step.viewers}-viewer step, dropping attached viewers`
      console.log(`\nINVALID: ${invalid}`)
      break
    }

    const sample = {
      targetViewers: step.viewers,
      connected: viewers.filter((v) => v.ok).length,
      ttffMs: viewers.filter((v) => v.ok).map((v) => v.ttffMs),
      serverViewerCount:
        typeof broadcast?.webRTCViewerCount === 'number' ? broadcast.webRTCViewerCount : null,
      guardStreamsHealthy: healthy,
    }

    const evaluation = evaluateStep(sample, DEFAULT_THRESHOLDS, baselineTtffP95)
    results.push({ viewers: step.viewers, sample, evaluation, baselineTtffP95 })

    console.log(
      `connected ${sample.connected}/${step.viewers}, ` +
        `server sees ${sample.serverViewerCount ?? '?'}, ` +
        `p95 first frame ${evaluation.ttffP95 ?? '?'}ms` +
        (baselineTtffP95 ? ` (${(evaluation.ttffP95 / baselineTtffP95).toFixed(1)}x base)` : '') +
        ` ${evaluation.ok ? 'OK' : 'FAIL'}`,
    )
    if (!evaluation.ok) console.log(`   ${evaluation.failures.join('\n   ')}`)
    if (opened.some((o) => !o.ok)) {
      console.log(`   ${opened.filter((o) => !o.ok).length} viewer(s) failed to start`)
    }

    if (baselineTtffP95 === null && evaluation.ok && evaluation.ttffP95) {
      baselineTtffP95 = evaluation.ttffP95
      console.log(`   baseline first frame: ${baselineTtffP95}ms`)
    }

    const reason = abortReason(sample, DEFAULT_THRESHOLDS, baselineTtffP95)
    if (reason) {
      aborted = reason
      console.log(`\nABORT: ${reason}`)
      break
    }
  }

  const knee = findKnee(results)
  const report = {
    valid: invalid === null,
    invalidReason: invalid,
    startedAt: new Date().toISOString(),
    server: `${ams.baseUrl}/${ams.app}`,
    amsVersion: version.versionName,
    streamId,
    thresholds: DEFAULT_THRESHOLDS,
    // Recorded because the ceiling is only valid for this source profile.
    source: { width, height, fps, bitrate },
    ramp: { start: ramp[0]?.viewers, step: args.step ?? 5, max: ramp.at(-1)?.viewers },
    guardedStreams: guardIds,
    publisherRestarts,
    aborted,
    knee,
    // No cap is derived from a run whose source died — the steps after the death
    // measured nothing.
    recommendedWebRTCViewerLimit: invalid ? null : recommendedCap(knee.lastGood),
    results,
  }

  const outDir = path.join(HERE, 'results')
  fs.mkdirSync(outDir, { recursive: true })
  const outFile = path.join(outDir, `${streamId}.json`)
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2))

  console.log(`\n--- result ---`)
  if (invalid) {
    console.log(`RUN CUT SHORT: ${invalid}`)
    // The steps before the source failed are still real measurements; only the
    // ceiling is unknown, because we stopped for a reason unrelated to capacity.
    const lastClean = results.filter((r) => r.evaluation.ok).at(-1)
    console.log(
      lastClean
        ? `Clean steps up to ${lastClean.viewers} viewers — the ceiling is above that, and was not found.`
        : 'No clean steps completed.',
    )
    console.log(`Full report: ${outFile}`)
    return
  }
  if (knee.reachedCeiling) {
    console.log(`No failure up to ${knee.lastGood} viewers — the ceiling is ABOVE what was tested.`)
  } else {
    console.log(`Last good step: ${knee.lastGood ?? 'none'} viewers. Broke at ${knee.brokeAt}.`)
  }
  console.log(`Suggested ANTMEDIA_WEBRTC_VIEWER_LIMIT: ${report.recommendedWebRTCViewerLimit ?? 'n/a'}`)
  console.log(`Full report: ${outFile}`)
}

main()
  .catch((e) => {
    console.error(`\nFAILED: ${e.message}`)
    process.exitCode = 1
  })
  .finally(teardown)
