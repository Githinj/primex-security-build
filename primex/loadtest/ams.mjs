/**
 * Minimal Ant Media REST client for the load harness (SEC-192).
 *
 * Separate from `src/lib/streaming/` on purpose: that code runs inside Next and
 * is bound to the app's env plumbing. This runs as a bare Node script against
 * whichever server you point it at, and must be readable at a glance by someone
 * deciding whether it is safe to run.
 *
 * The JWT format is the one in `src/lib/streaming/rest-jwt.ts` — HS256 over
 * `{exp}` only, sent raw in `Authorization` with no `Bearer` prefix. If this
 * ever 403s with "Invalid App JWT Token", that file is the reference.
 */
import fs from 'node:fs'
import crypto from 'node:crypto'

/** Read a dotenv file without pulling in a dependency. Values are not expanded. */
export function loadEnv(path) {
  const env = {}
  for (const line of fs.readFileSync(path, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/)
    if (match) env[match[1]] = match[2].trim().replace(/^["']|["']$/g, '')
  }
  return env
}

export function createAmsClient({ baseUrl, app, apiKey }) {
  const base = baseUrl.replace(/\/+$/, '')
  const prefix = `${base}/${app}/rest/v2`

  function jwt() {
    const b64 = (v) => Buffer.from(v).toString('base64url')
    const header = b64(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
    const payload = b64(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 60 }))
    const input = `${header}.${payload}`
    const sig = crypto.createHmac('sha256', apiKey).update(input, 'utf8').digest('base64url')
    return `${input}.${sig}`
  }

  async function request(method, path, body) {
    const res = await fetch(`${prefix}${path}`, {
      method,
      headers: {
        Authorization: jwt(),
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    })
    const text = await res.text()
    if (!res.ok) throw new Error(`${method} ${path} -> ${res.status}: ${text.slice(0, 200)}`)
    try {
      return JSON.parse(text)
    } catch {
      return text
    }
  }

  return {
    baseUrl: base,
    app,
    version: () => request('GET', '/version'),
    listBroadcasts: (offset = 0, size = 50) => request('GET', `/broadcasts/list/${offset}/${size}`),
    getBroadcast: (streamId) => request('GET', `/broadcasts/${streamId}`),
    createBroadcast: (payload) => request('POST', '/broadcasts/create', payload),
    deleteBroadcast: (streamId) => request('DELETE', `/broadcasts/${streamId}`),
    /** `type` is 'play' or 'publish'. AMS wants an absolute unix-second expiry. */
    token: (streamId, type, expireDate) =>
      request('GET', `/broadcasts/${streamId}/token?expireDate=${expireDate}&type=${type}`),
  }
}

/**
 * Which streams must stay up for the run to continue.
 *
 * Snapshotted before the ramp starts: anything already `broadcasting` is a real
 * camera someone depends on. If one of them drops mid-run we stop, whether or
 * not we are the cause — establishing that we were not is not worth the risk.
 */
export async function snapshotGuardStreams(ams, excludeStreamId) {
  const list = await ams.listBroadcasts(0, 100)
  return list
    .filter((b) => b.status === 'broadcasting' && b.streamId !== excludeStreamId)
    .map((b) => b.streamId)
}

/** True when every guarded stream is still broadcasting. */
export async function guardStreamsHealthy(ams, guardIds) {
  if (!guardIds.length) return true
  const list = await ams.listBroadcasts(0, 100)
  const live = new Set(list.filter((b) => b.status === 'broadcasting').map((b) => b.streamId))
  return guardIds.every((id) => live.has(id))
}
