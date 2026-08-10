'use server'

import crypto from 'crypto'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import type { CameraStreamConfig, StreamToken } from '@/lib/types'

const ANTMEDIA_URL = process.env.ANTMEDIA_URL!
const ANTMEDIA_APP = process.env.ANTMEDIA_APP || 'LiveApp'
// The EE JWT *signing secret* (AMS `jwtSecretKey`), not a token. Unset on Community Edition.
const ANTMEDIA_API_KEY = process.env.ANTMEDIA_API_KEY
const ANTMEDIA_WS_URL = process.env.ANTMEDIA_WS_URL!
// Endpoint a camera publishes *into*. Deliberately separate from ANTMEDIA_URL (the
// REST base): ingest runs on its own port and, in production, its own scheme —
// point this at an `rtmps://host:443/AppName` endpoint. The derived fallback below
// is plaintext RTMP, which puts the publish token and the video on the wire in
// the clear; it exists so local Docker keeps working.
const ANTMEDIA_RTMP_URL = process.env.ANTMEDIA_RTMP_URL
const TOKEN_DURATION_MS = 60 * 60 * 1000 // 1 hour
const REST_JWT_TTL_S = 60 // short-lived: a fresh token is signed per request
// Publish tokens gate ingest, and a camera publishes indefinitely, so these are
// long-lived by nature. Re-running createBroadcast() mints a fresh one, which is
// the rotation path.
const PUBLISH_TOKEN_TTL_S = (Number(process.env.ANTMEDIA_PUBLISH_TOKEN_TTL_DAYS) || 365) * 86400

// Mints the per-request JWT that Ant Media Enterprise's REST filter expects.
// ANTMEDIA_API_KEY is the shared HS256 secret — sending it verbatim as the
// Authorization value gets a 403 "Invalid App JWT Token"; it has to sign a
// token. AMS only checks the signature and `exp`, so no other claims are set.
function signAntmediaRestJwt(secret: string): string {
  const b64url = (value: string) => Buffer.from(value, 'utf8').toString('base64url')
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(
    JSON.stringify({ exp: Math.floor(Date.now() / 1000) + REST_JWT_TTL_S }),
  )
  const signingInput = `${header}.${payload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput, 'utf8')
    .digest('base64url')
  return `${signingInput}.${signature}`
}

// Ant Media answers a rejected write with {"success":false,"message":"…"} — the
// message is the only thing that says *why*. Logging the bare status turns every
// provisioning failure into an opaque "400", so pull the body out for the log.
async function antmediaError(res: Response): Promise<string> {
  let detail = ''
  try {
    const body = (await res.text()).trim()
    if (body) {
      try {
        const parsed = JSON.parse(body)
        detail = parsed.message || parsed.error || body
      } catch {
        detail = body // not JSON (e.g. a Tomcat HTML error page)
      }
    }
  } catch {
    // unreadable body — the status alone will have to do
  }
  return detail ? `${res.status} — ${detail.slice(0, 300)}` : `${res.status}`
}

function antmediaHeaders(contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {}
  if (contentType) headers['Content-Type'] = contentType
  // Ant Media EE reads the raw compact JWT from Authorization — no "Bearer " prefix.
  if (ANTMEDIA_API_KEY) headers['Authorization'] = signAntmediaRestJwt(ANTMEDIA_API_KEY)
  return headers
}

// Ingest endpoint the installer points the camera at, without the token.
function ingestBaseUrl(): string {
  if (ANTMEDIA_RTMP_URL) return ANTMEDIA_RTMP_URL.replace(/\/+$/, '')
  return `rtmp://${new URL(ANTMEDIA_URL).hostname}/${ANTMEDIA_APP}`
}

/**
 * Mint an Ant Media token for a stream. `type` matters: AMS enforces token
 * control per-type, so a play token does nothing to protect ingest and vice
 * versa (SEC-178).
 *
 * `expireDate` is a unix timestamp in *seconds*. Passing milliseconds — as this
 * file previously did for play tokens — yields a date around the year 58,000,
 * i.e. a token that never expires.
 *
 * Returns null on Community Edition (no token API) or on any failure; callers
 * decide whether that is survivable.
 */
async function mintAntmediaToken(
  streamId: string,
  type: 'play' | 'publish',
  ttlSeconds: number,
): Promise<string | null> {
  if (!ANTMEDIA_API_KEY) return null

  const expireDate = Math.floor(Date.now() / 1000) + ttlSeconds
  try {
    const res = await fetch(
      `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts/${streamId}/token?expireDate=${expireDate}&type=${type}`,
      { method: 'GET', headers: antmediaHeaders(), cache: 'no-store' },
    )
    if (!res.ok) {
      console.error(
        `Ant Media ${type} token request failed for streamId "${streamId}": ${await antmediaError(res)}`,
      )
      return null
    }
    const { tokenId } = await res.json()
    return typeof tokenId === 'string' && tokenId ? tokenId : null
  } catch (err) {
    console.error(`Ant Media ${type} token request threw for streamId "${streamId}":`, err)
    return null
  }
}

/**
 * Ingest configuration for one camera. Split out of the normal camera reads
 * because `source_url` embeds the camera's RTSP credentials and `stream_url` is
 * its publish endpoint — `getCameras()` rows are serialized into client
 * components for every role that can see the camera, so these two fields must
 * never travel on that path (SEC-177).
 */
export async function getCameraStreamConfig(
  cameraId: string,
): Promise<CameraStreamConfig | null> {
  await requireRole('super_admin')

  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('cameras')
    .select('stream_id, stream_url, source_url')
    .eq('id', cameraId)
    .single()

  if (error || !data) return null
  return data as CameraStreamConfig
}

export async function getStreamToken(cameraId: string): Promise<StreamToken | null> {
  await requireRole('super_admin', 'dispatcher', 'company_manager', 'client', 'guard')

  const supabase = await createServerSupabaseClient()
  const { data: camera, error } = await supabase
    .from('cameras')
    .select('stream_id')
    .eq('id', cameraId)
    .single()

  if (error || !camera?.stream_id) return null

  const streamId = camera.stream_id
  // Client-side refresh scheduling works in epoch ms; AMS wants seconds. The
  // conversion lives in mintAntmediaToken().
  const expiresAt = Date.now() + TOKEN_DURATION_MS

  // Community Edition doesn't support the token API — return tokenless URLs
  if (!ANTMEDIA_API_KEY) {
    return {
      token: null,
      streamId,
      webrtcUrl: ANTMEDIA_WS_URL,
      hlsUrl: `${ANTMEDIA_URL}/${ANTMEDIA_APP}/streams/${streamId}.m3u8`,
      expiresAt,
    }
  }

  const tokenId = await mintAntmediaToken(streamId, 'play', TOKEN_DURATION_MS / 1000)
  if (!tokenId) return null

  return {
    token: tokenId,
    streamId,
    webrtcUrl: ANTMEDIA_WS_URL,
    hlsUrl: `${ANTMEDIA_URL}/${ANTMEDIA_APP}/streams/${streamId}.m3u8?token=${encodeURIComponent(tokenId)}`,
    expiresAt,
  }
}

/**
 * Grab a still from the live stream, as a data URL, for the zone editor to draw
 * over. Returns null rather than throwing on every failure path — a backdrop is
 * a convenience, and the editor falls back to a plain grid.
 *
 * Expect null in several legitimate situations: the snapshot REST resource is
 * Enterprise-only, production AMS may restrict REST to allowlisted IPs (so a
 * Vercel function can be refused where a droplet isn't), and the camera may
 * simply not be publishing.
 */
export async function getCameraSnapshot(cameraId: string): Promise<string | null> {
  await requireRole('super_admin', 'company_manager')

  const supabase = await createServerSupabaseClient()
  const { data: camera, error } = await supabase
    .from('cameras')
    .select('stream_id')
    .eq('id', cameraId)
    .single()

  if (error || !camera?.stream_id) return null
  if (!ANTMEDIA_API_KEY) return null // Community Edition has no snapshot resource

  try {
    const res = await fetch(
      `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts/${camera.stream_id}/snapshot`,
      { method: 'GET', headers: antmediaHeaders(), cache: 'no-store' },
    )
    if (!res.ok) {
      console.error(
        `Ant Media snapshot failed for streamId "${camera.stream_id}": ${await antmediaError(res)}`,
      )
      return null
    }

    const buffer = Buffer.from(await res.arrayBuffer())
    if (buffer.byteLength === 0) return null

    const contentType = res.headers.get('content-type') || 'image/jpeg'
    return `data:${contentType};base64,${buffer.toString('base64')}`
  } catch (err) {
    console.error(`Ant Media snapshot request threw for camera "${cameraId}":`, err)
    return null
  }
}

/**
 * RTMP push ingest: provision the broadcast and return the URL the camera
 * publishes into.
 *
 * The returned URL carries a **publish** token (SEC-178). Ant Media enforces
 * token control per-type, so the play tokens getStreamToken() mints do nothing
 * for ingest — without this, anyone who learned a stream ID could publish
 * arbitrary video into a monitored camera, poisoning the live view, the
 * recordings, and the AI worker's input. On Enterprise this fails closed: no
 * token, no URL.
 *
 * The token is returned but never stored. `cameras.stream_url` keeps only the
 * tokenless endpoint, so a database read never yields publish rights; re-running
 * this action mints a fresh token and is the rotation path.
 */
export async function createBroadcast(
  cameraId: string,
  cameraName: string,
  streamId: string,
): Promise<{ success: boolean; ingestUrl?: string; secured?: boolean; error?: string }> {
  await requireRole('super_admin')

  const trimmedId = streamId.trim()
  if (!trimmedId) {
    return { success: false, error: 'A stream ID is required to create a broadcast.' }
  }

  // Ant Media's create resource is /broadcasts/create — POSTing to /broadcasts
  // itself is 405 (that path only lists). Keep the /create suffix.
  const res = await fetch(
    `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts/create`,
    {
      method: 'POST',
      headers: antmediaHeaders('application/json'),
      body: JSON.stringify({
        streamId: trimmedId,
        name: cameraName,
        type: 'liveStream',
      }),
    }
  )

  // 409 = the broadcast already exists, which is a reusable state — but it still
  // needs a fresh token and still has to be persisted. It used to return early,
  // leaving stream_id/stream_url unset on the camera row.
  if (!res.ok && res.status !== 409) {
    console.error(
      `Failed to create broadcast for streamId "${trimmedId}": ${await antmediaError(res)}`,
    )
    return { success: false, error: 'Ant Media rejected the broadcast.' }
  }

  const streamEndpoint = `${ingestBaseUrl()}/${trimmedId}`

  const publishToken = await mintAntmediaToken(trimmedId, 'publish', PUBLISH_TOKEN_TTL_S)
  if (ANTMEDIA_API_KEY && !publishToken) {
    // Enterprise with token control configured: handing back a bare URL here
    // would be handing out unauthenticated ingest. Fail instead.
    return {
      success: false,
      error: 'Could not mint a publish token — refusing to issue an unsecured ingest URL.',
    }
  }

  const ingestUrl = publishToken
    ? `${streamEndpoint}?token=${encodeURIComponent(publishToken)}`
    : streamEndpoint

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('cameras')
    .update({
      stream_id: trimmedId,
      stream_url: streamEndpoint, // tokenless — see the note above
    })
    .eq('id', cameraId)
  if (error) {
    console.error('Failed to persist broadcast on camera:', error)
    return { success: false, error: 'Created in Ant Media but failed to save on the camera.' }
  }

  revalidatePath('/cameras')
  revalidatePath(`/cameras/${cameraId}`)
  return { success: true, ingestUrl, secured: Boolean(publishToken) }
}

// RTSP pull ingest: Ant Media connects OUT to an RTSP camera (type "streamSource")
// and republishes it under `streamId` as WebRTC/HLS — the pull counterpart to
// createBroadcast()'s RTMP push flow. Playback (getStreamToken) and the webhook are
// keyed on stream_id, so both work unchanged once the source is republishing.
//
// The RTSP transport (TCP vs UDP) is deliberately absent from the payload below:
// AMS reads it from the *application* setting `rtspPullTransportType` in
// StreamFetcher and hands it to ffmpeg as `rtsp_transport`, so there is no
// per-broadcast field to set. Adding one here would be silently ignored. It has to
// be `tcp` on the server for the site gateways' MSS clamp to do anything — see
// docs/go-live-checklist.md (SEC-201).
export async function createStreamSource(
  cameraId: string,
  cameraName: string,
  streamId: string,
  sourceUrl: string,
): Promise<{ success: boolean; error?: string }> {
  await requireRole('super_admin')

  const trimmedUrl = sourceUrl.trim()
  if (!/^rtsps?:\/\//i.test(trimmedUrl)) {
    return { success: false, error: 'Source URL must be an rtsp:// or rtsps:// address.' }
  }
  const trimmedId = streamId.trim()
  if (!trimmedId) {
    return { success: false, error: 'A stream ID is required to connect a source.' }
  }

  const base = `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts`
  const sourcePayload = {
    streamId: trimmedId,
    name: cameraName,
    type: 'streamSource',
    streamUrl: trimmedUrl,
  }

  // Create goes to /broadcasts/create (POST /broadcasts is 405); the PUT-update
  // and /start below correctly hit the /broadcasts/{id} collection paths.
  const createRes = await fetch(`${base}/create`, {
    method: 'POST',
    headers: antmediaHeaders('application/json'),
    body: JSON.stringify(sourcePayload),
  })

  // 409 = a broadcast with this streamId already exists. Update it with the latest
  // source URL (e.g. rotated credentials) rather than failing, then (re)start below.
  if (createRes.status === 409) {
    const updateRes = await fetch(`${base}/${trimmedId}`, {
      method: 'PUT',
      headers: antmediaHeaders('application/json'),
      body: JSON.stringify(sourcePayload),
    })
    // A failed update means the broadcast keeps its OLD source URL while we go on
    // to report success — so a credential rotation would silently not take effect.
    if (!updateRes.ok) {
      console.error(
        `Failed to update existing stream source "${trimmedId}": ${await antmediaError(updateRes)}`,
      )
      return { success: false, error: 'Ant Media rejected the updated stream source.' }
    }
  } else if (!createRes.ok) {
    console.error(
      `Failed to create stream source for streamId "${trimmedId}": ${await antmediaError(createRes)}`,
    )
    return { success: false, error: 'Ant Media rejected the stream source.' }
  }

  // Stream sources are not fetched until started (unless the server has auto-start
  // enabled), so kick it explicitly. A non-OK here usually means it is already
  // pulling, which is fine — the webhook flips the camera Online when frames arrive.
  const startRes = await fetch(`${base}/${trimmedId}/start`, {
    method: 'POST',
    headers: antmediaHeaders(),
  })
  if (!startRes.ok) {
    console.warn(
      `Stream source start for "${trimmedId}" returned ${await antmediaError(startRes)} (may already be running)`,
    )
  }

  // Persist stream_id (play id) + source_url (for restart/rotation). RLS scopes the
  // row; super_admin may update any camera.
  const supabase = await createServerSupabaseClient()
  const { error } = await supabase
    .from('cameras')
    .update({ stream_id: trimmedId, source_url: trimmedUrl })
    .eq('id', cameraId)
  if (error) {
    console.error('Failed to persist stream source on camera:', error)
    return { success: false, error: 'Connected in Ant Media but failed to save on the camera.' }
  }

  revalidatePath('/cameras')
  revalidatePath(`/cameras/${cameraId}`)
  return { success: true }
}

// Stops Ant Media from pulling the RTSP source but keeps source_url so it can be
// reconnected later. The webhook also flips status on liveStreamEnded; we set it
// optimistically so the UI reflects the change immediately.
export async function stopStreamSource(
  cameraId: string,
  streamId: string,
): Promise<{ success: boolean }> {
  await requireRole('super_admin')

  const res = await fetch(
    `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts/${streamId.trim()}/stop`,
    { method: 'POST', headers: antmediaHeaders() },
  )
  if (!res.ok) {
    console.warn(
      `Stream source stop for "${streamId.trim()}" returned ${await antmediaError(res)} (may already be stopped)`,
    )
  }

  const supabase = await createServerSupabaseClient()
  await supabase.from('cameras').update({ status: 'Offline' }).eq('id', cameraId)

  revalidatePath('/cameras')
  revalidatePath(`/cameras/${cameraId}`)
  return { success: true }
}

export async function getRecordingsAction(
  cameraId: string,
  from: string,
  to: string
) {
  await requireRole('super_admin', 'dispatcher', 'company_manager', 'client', 'guard')

  const { getRecordings } = await import('@/lib/data/recordings')
  return getRecordings(cameraId, from, to)
}
