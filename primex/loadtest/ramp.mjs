/**
 * Ramp planning and abort rules for the streaming load test (SEC-192).
 *
 * Pure functions, no I/O — this is the part that decides when to stop pushing
 * load at a server, so it is the part that has to be tested rather than trusted.
 *
 * The whole harness exists because nobody has measured the viewer ceiling of the
 * origin Ant Media droplet. `webRTCViewerLimit` shipped as an env-driven cap, but
 * a cap without a measured number is just a guess with better manners.
 */

/** Conservative defaults. The point is to find the knee, not to break the box. */
export const DEFAULT_THRESHOLDS = {
  /** Below this share of viewers reaching "playing", the step has failed. */
  minConnectRate: 0.9,
  /**
   * Absolute ceiling — a viewer waiting this long has given up, whatever the
   * baseline was. Deliberately generous, because it is the backstop and not the
   * primary signal.
   */
  maxTtffP95Ms: 20_000,
  /**
   * The primary signal: how much slower than the *first step* first-frame time
   * is allowed to get.
   *
   * Time-to-first-frame carries several seconds of fixed cost that has nothing
   * to do with load — page setup, SDP exchange, ICE, and then waiting for the
   * next keyframe, which on a 2s GOP averages a second on its own. An absolute
   * threshold therefore mostly measures that constant: the first calibration run
   * aborted at 8006ms against an 8000ms limit with every viewer connected and
   * the server agreeing, which is a tripped wire, not a ceiling.
   *
   * What matters is the *slope*. If 40 viewers take materially longer to start
   * than 5 did, the server is struggling; if they take the same, it isn't.
   */
  ttffDegradationFactor: 2.5,
  /**
   * How far the server's own viewer count may sit below what the client thinks
   * connected. A gap means the server is shedding, which the client can miss.
   */
  maxServerShortfall: 0.15,
}

/**
 * Step schedule. Deliberately linear rather than doubling: the interesting
 * region is a knee, and doubling walks straight past it.
 */
export function planRamp({ start = 5, step = 5, max = 40, holdMs = 20_000 } = {}) {
  if (start < 1) throw new Error('start must be at least 1')
  if (step < 1) throw new Error('step must be at least 1')
  if (max < start) throw new Error('max must be >= start')

  const steps = []
  for (let viewers = start; viewers <= max; viewers += step) {
    steps.push({ index: steps.length, viewers, holdMs })
  }
  return steps
}

/** Nearest-rank percentile. Small samples are the norm here, so no interpolation. */
export function percentile(values, p) {
  if (!values.length) return null
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.ceil((p / 100) * sorted.length)
  return sorted[Math.min(sorted.length - 1, Math.max(0, rank - 1))]
}

/**
 * Did this step hold up?
 *
 * `sample`:
 *   targetViewers      — how many we tried to open
 *   connected          — how many reached "playing" client-side
 *   ttffMs             — time-to-first-frame for each connected viewer
 *   serverViewerCount  — AMS's own count for the stream under test (null if unread)
 */
export function evaluateStep(sample, thresholds = DEFAULT_THRESHOLDS, baselineTtffP95 = null) {
  const failures = []
  const connectRate = sample.targetViewers > 0 ? sample.connected / sample.targetViewers : 0
  const ttffP95 = percentile(sample.ttffMs ?? [], 95)

  if (connectRate < thresholds.minConnectRate) {
    failures.push(
      `connect rate ${(connectRate * 100).toFixed(0)}% < ${(thresholds.minConnectRate * 100).toFixed(0)}%`,
    )
  }

  if (ttffP95 !== null && ttffP95 > thresholds.maxTtffP95Ms) {
    failures.push(`p95 time-to-first-frame ${ttffP95}ms > ${thresholds.maxTtffP95Ms}ms (unusable)`)
  }

  // Only once a baseline exists — the step that establishes it cannot be
  // compared against itself.
  if (ttffP95 !== null && baselineTtffP95) {
    const limit = baselineTtffP95 * thresholds.ttffDegradationFactor
    if (ttffP95 > limit) {
      failures.push(
        `p95 first frame ${ttffP95}ms is ${(ttffP95 / baselineTtffP95).toFixed(1)}x the ` +
          `${baselineTtffP95}ms baseline (limit ${thresholds.ttffDegradationFactor}x)`,
      )
    }
  }

  // Only meaningful when the server actually answered. A failed stats read is
  // not evidence of shedding, so it must not be scored as one.
  if (typeof sample.serverViewerCount === 'number' && sample.connected > 0) {
    const shortfall = (sample.connected - sample.serverViewerCount) / sample.connected
    if (shortfall > thresholds.maxServerShortfall) {
      failures.push(
        `server counts ${sample.serverViewerCount} of ${sample.connected} connected viewers`,
      )
    }
  }

  return { ok: failures.length === 0, connectRate, ttffP95, failures }
}

/**
 * Stop-the-run conditions, checked between steps.
 *
 * The first rule is the one that matters: this runs against the production
 * server carrying live cameras. If a real camera's broadcast drops while we are
 * adding synthetic viewers, the test is over — whether or not we caused it. It
 * is never worth another data point.
 */
export function abortReason(sample, thresholds = DEFAULT_THRESHOLDS, baselineTtffP95 = null) {
  if (sample.guardStreamsHealthy === false) {
    return 'a production camera stopped broadcasting during the ramp'
  }

  const { ok, failures } = evaluateStep(sample, thresholds, baselineTtffP95)
  if (!ok) return `step of ${sample.targetViewers} viewers failed: ${failures.join('; ')}`

  return null
}

/**
 * The knee: the largest step that met every threshold, and the step that broke.
 *
 * `results` is the ordered list of steps actually run, each `{ viewers, evaluation }`.
 * A run that never failed reports `brokeAt: null` — the ceiling is above what was
 * tested, which is a real and reportable outcome, not a missing result.
 */
export function findKnee(results) {
  let lastGood = null
  let brokeAt = null

  for (const result of results) {
    if (result.evaluation.ok) {
      lastGood = result.viewers
    } else {
      brokeAt = result.viewers
      break
    }
  }

  return { lastGood, brokeAt, reachedCeiling: brokeAt === null }
}

/**
 * What to actually put in `ANTMEDIA_WEBRTC_VIEWER_LIMIT`.
 *
 * A margin below the last good step, because the measurement was taken on an
 * idle-ish server and production has ingest, recording and the AI worker's
 * snapshot polling competing for the same box. Floors at 1 so a tiny result
 * cannot produce a cap of 0, which AMS would read as "refuse everyone".
 */
export function recommendedCap(lastGood, margin = 0.7) {
  if (!lastGood) return null
  return Math.max(1, Math.floor(lastGood * margin))
}
