'use server'

import crypto from 'crypto'
import dns from 'node:dns/promises'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import { listenerHookUrl } from '@/lib/streaming/webhook-auth'
import { checkSourceAddress, isIpLiteral, parseSourceUrl } from '@/lib/streaming/source-url'
import { buildIceServers } from '@/lib/streaming/ice-servers'
import { REST_JWT_TTL_S, restJwtExpiry, signRestJwt } from '@/lib/streaming/rest-jwt'
import { SITE_URL } from '@/lib/site-url'
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
// Publish tokens gate ingest, and a camera publishes indefinitely, so these are
// long-lived by nature. Re-running createBroadcast() mints a fresh one, which is
// the rotation path.
const PUBLISH_TOKEN_TTL_S = (Number(process.env.ANTMEDIA_PUBLISH_TOKEN_TTL_DAYS) || 365) * 86400

// The token format lives in lib/streaming/rest-jwt.ts, pinned byte-for-byte
// against the Python worker's signer by a shared golden fixture (SEC-188).
function signAntmediaRestJwt(secret: string): string {
  return signRestJwt(secret, restJwtExpiry(Date.now(), REST_JWT_TTL_S))
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

/**
 * The hook URL every broadcast we provision gets told to call.
 *
 * Computed per call rather than at module load so a missing secret is visible in
 * the log at the moment a camera is provisioned, which is when someone can act
 * on it — not at cold start, where it scrolls past.
 */
function broadcastHookUrl(streamId: string): string | null {
  const url = listenerHookUrl({
    siteUrl: SITE_URL,
    secret: process.env.ANTMEDIA_WEBHOOK_SECRET,
    override: process.env.ANTMEDIA_WEBHOOK_URL,
  })
  if (!url) {
    console.warn(
      `Provisioning "${streamId}" with no listenerHookURL — ANTMEDIA_WEBHOOK_SECRET is unset, so ` +
        'the camera will never report status, drops, or recordings (SEC-202).',
    )
  }
  return url
}

/**
 * Refuse to point Ant Media at an address that can't be a camera (SEC-193).
 *
 * Returns an error string when the target is blocked, null when it is fine. The
 * hostname is resolved first and *every* answer is checked: one A record on the
 * public internet next to another on 169.254 must not pass because the first one
 * did.
 *
 * A resolution failure is not treated as a block — the app and the AMS droplet
 * are on different networks, and a name that only resolves inside the tunnel is
 * the normal case for a site camera, not an attack.
 */
async function blockedSourceTarget(hostname: string): Promise<string | null> {
  const allowedCidrs = process.env.ANTMEDIA_SOURCE_ALLOWED_CIDRS

  // An IP literal needs no lookup — judge it directly rather than handing an
  // already-unambiguous address to a resolver.
  if (isIpLiteral(hostname)) {
    const verdict = checkSourceAddress(hostname, allowedCidrs)
    if (verdict.allowed) return null
    console.error(`Refused stream source "${hostname}": ${verdict.reason}`)
    return verdict.reason
  }

  let addresses: { address: string }[]
  try {
    addresses = await dns.lookup(hostname, { all: true })
  } catch {
    console.warn(
      `Could not resolve stream source host "${hostname}" — allowing, since a name that only resolves on the AMS side is normal for a tunnelled site camera.`,
    )
    return null
  }

  for (const { address } of addresses) {
    const verdict = checkSourceAddress(address, allowedCidrs)
    if (!verdict.allowed) {
      console.error(`Refused stream source "${hostname}": ${verdict.reason}`)
      return `That host resolves to ${address}, which Ant Media is not allowed to connect to.`
    }
  }

  return null
}

/**
 * Tell Ant Media whether to record this stream (SEC-189).
 *
 * `cameras.recording_enabled` has existed since migration 003 and was read by
 * nothing — no action, no UI, no SQL — so whether a camera recorded was decided
 * entirely by the AMS app default. On the live server that default is off:
 * every broadcast reports `mp4Enabled: 0` and no camera has ever recorded.
 *
 * Uses the explicit recording resource rather than putting `mp4Enabled` in the
 * Broadcast payload. The integer is tri-state — one value means "defer to the
 * app setting" — and which value that is could not be confirmed against the docs,
 * so setting it risked writing "use the default" while believing it meant "off".
 * `PUT .../recording/{true|false}` says exactly what it does at both ends.
 *
 * Never fatal: a camera that provisioned but failed to apply its recording flag
 * is still a working camera, and the flag is re-applied on the next change.
 */
async function setBroadcastRecording(streamId: string, enabled: boolean): Promise<boolean> {
  try {
    const res = await fetch(
      `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts/${streamId}/recording/${enabled}?recordType=mp4`,
      { method: 'PUT', headers: antmediaHeaders(), cache: 'no-store' },
    )
    if (!res.ok) {
      console.error(
        `Could not set recording=${enabled} on stream "${streamId}": ${await antmediaError(res)}`,
      )
      return false
    }
    return true
  } catch (err) {
    console.error(`Recording toggle threw for stream "${streamId}":`, err)
    return false
  }
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

  // Minted per request and short-lived, so it rides along with the play token
  // rather than being NEXT_PUBLIC_ config the browser keeps (SEC-184).
  const iceServers = buildIceServers({
    stunUrls: process.env.ANTMEDIA_STUN_URLS,
    turnUrls: process.env.ANTMEDIA_TURN_URLS,
    turnSecret: process.env.ANTMEDIA_TURN_SECRET,
    turnUsername: process.env.ANTMEDIA_TURN_USERNAME,
    turnCredential: process.env.ANTMEDIA_TURN_CREDENTIAL,
    // Outlive the play token slightly: an ICE restart just after a token refresh
    // must not fail on an expired relay credential.
    turnTtlSeconds: TOKEN_DURATION_MS / 1000 + 600,
    label: streamId,
    nowMs: Date.now(),
  })

  // Community Edition doesn't support the token API — return tokenless URLs
  if (!ANTMEDIA_API_KEY) {
    return {
      token: null,
      streamId,
      webrtcUrl: ANTMEDIA_WS_URL,
      hlsUrl: `${ANTMEDIA_URL}/${ANTMEDIA_APP}/streams/${streamId}.m3u8`,
      expiresAt,
      iceServers,
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
    iceServers,
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

  const base = `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts`
  const hookUrl = broadcastHookUrl(trimmedId)
  const broadcastPayload = {
    streamId: trimmedId,
    name: cameraName,
    type: 'liveStream',
    // Without this the broadcast reports nothing back — no status, no drops, no
    // recordings (SEC-202). Omitted entirely rather than sent as null when there
    // is no secret, so an existing hook is never cleared by a re-provision.
    ...(hookUrl ? { listenerHookURL: hookUrl } : {}),
  }

  // Ant Media's create resource is /broadcasts/create — POSTing to /broadcasts
  // itself is 405 (that path only lists). Keep the /create suffix.
  const res = await fetch(`${base}/create`, {
    method: 'POST',
    headers: antmediaHeaders('application/json'),
    body: JSON.stringify(broadcastPayload),
  })

  // 409 = the broadcast already exists, which is a reusable state — but it still
  // needs a fresh token and still has to be persisted. It used to return early,
  // leaving stream_id/stream_url unset on the camera row.
  if (!res.ok && res.status !== 409) {
    console.error(
      `Failed to create broadcast for streamId "${trimmedId}": ${await antmediaError(res)}`,
    )
    return { success: false, error: 'Ant Media rejected the broadcast.' }
  }

  // Create is a no-op on 409, so the payload never reaches an existing broadcast
  // — which is precisely the state the live server is in: broadcasts that predate
  // the hook URL keep reporting nothing until something writes it. Re-running
  // provisioning is the repair path, so apply it here. Non-fatal: the ingest URL
  // below is still valid, the camera is just still silent.
  if (res.status === 409 && hookUrl) {
    const updateRes = await fetch(`${base}/${trimmedId}`, {
      method: 'PUT',
      headers: antmediaHeaders('application/json'),
      body: JSON.stringify(broadcastPayload),
    })
    if (!updateRes.ok) {
      console.error(
        `Could not attach listenerHookURL to existing broadcast "${trimmedId}": ${await antmediaError(updateRes)}`,
      )
    }
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
  const { data: camera } = await supabase
    .from('cameras')
    .select('recording_enabled')
    .eq('id', cameraId)
    .single()
  // Apply the column rather than leaving it to the AMS app default (SEC-189).
  // Default true matches the column default, so a camera provisioned before the
  // read fails still records.
  await setBroadcastRecording(trimmedId, camera?.recording_enabled ?? true)

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
  const parsed = parseSourceUrl(trimmedUrl)
  if (!parsed.ok) return { success: false, error: parsed.error }

  const blocked = await blockedSourceTarget(parsed.hostname)
  if (blocked) return { success: false, error: blocked }

  const trimmedId = streamId.trim()
  if (!trimmedId) {
    return { success: false, error: 'A stream ID is required to connect a source.' }
  }

  const base = `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts`
  const hookUrl = broadcastHookUrl(trimmedId)
  const sourcePayload = {
    streamId: trimmedId,
    name: cameraName,
    type: 'streamSource',
    streamUrl: trimmedUrl,
    // See createBroadcast(): no hook URL means a silent camera (SEC-202). The
    // 409 branch below PUTs this same payload, so re-running the action is what
    // repairs a source provisioned before the hook existed.
    ...(hookUrl ? { listenerHookURL: hookUrl } : {}),
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
  const { data: camera } = await supabase
    .from('cameras')
    .select('recording_enabled')
    .eq('id', cameraId)
    .single()
  await setBroadcastRecording(trimmedId, camera?.recording_enabled ?? true)

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

/**
 * Stop and delete a camera's Ant Media broadcast (SEC-186).
 *
 * Deleting the camera row used to be the whole of `deleteCamera()`, which left
 * the broadcast running: for an RTSP pull, AMS keeps connecting out to the
 * customer's camera forever, keeps recording into DO Spaces, and keeps costing
 * money — with no row pointing at it, so nothing in the app can even show it
 * exists. The orphan is invisible precisely because the thing that knew about it
 * is what got deleted.
 *
 * Stop first, then delete: deleting a running broadcast can leave the fetcher
 * thread alive on some versions, which is the orphan again by another route.
 *
 * Reports rather than throws. A camera the operator asked to remove must still
 * be removed from the app even when AMS is unreachable — the alternative is a row
 * they cannot delete. The return value lets the caller say so out loud.
 */
export async function releaseBroadcast(
  streamId: string,
): Promise<{ released: boolean; detail?: string }> {
  const id = streamId.trim()
  if (!id) return { released: true }

  const base = `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts/${id}`

  try {
    // Already-stopped is the common case and not an error worth surfacing.
    const stopRes = await fetch(`${base}/stop`, { method: 'POST', headers: antmediaHeaders() })
    if (!stopRes.ok) {
      console.warn(`Stop before delete for "${id}" returned ${await antmediaError(stopRes)}`)
    }

    const deleteRes = await fetch(base, { method: 'DELETE', headers: antmediaHeaders() })
    // 404 means it is already gone, which is the state we wanted.
    if (!deleteRes.ok && deleteRes.status !== 404) {
      const detail = await antmediaError(deleteRes)
      console.error(`Failed to delete Ant Media broadcast "${id}": ${detail}`)
      return { released: false, detail }
    }

    return { released: true }
  } catch (err) {
    console.error(`Deleting Ant Media broadcast "${id}" threw:`, err)
    return { released: false, detail: err instanceof Error ? err.message : 'unknown error' }
  }
}

/**
 * Turn recording on or off for one camera (SEC-189).
 *
 * The column and the server have to move together, and the DB write goes first:
 * if Ant Media is unreachable, the intent is still recorded and re-provisioning
 * re-applies it. The other order would leave a camera recording with the UI
 * insisting it isn't.
 *
 * Open to company_manager as well as super_admin — unlike `stream_id` (SEC-176),
 * this carries no cross-tenant risk: RLS scopes which camera row you may write,
 * and the value is a boolean about your own camera.
 */
export async function setCameraRecording(
  cameraId: string,
  enabled: boolean,
): Promise<{ success: boolean; appliedToServer: boolean; error?: string }> {
  await requireRole('super_admin', 'company_manager')

  const supabase = await createServerSupabaseClient()
  const { data: camera, error } = await supabase
    .from('cameras')
    .update({ recording_enabled: enabled })
    .eq('id', cameraId)
    .select('stream_id')
    .single()

  if (error) {
    console.error('Failed to set recording_enabled on camera:', error)
    return { success: false, appliedToServer: false, error: 'Could not save the change.' }
  }

  // No stream yet: the flag is stored and createBroadcast()/createStreamSource()
  // apply it at provisioning time.
  if (!camera?.stream_id) {
    revalidatePath(`/cameras/${cameraId}`)
    return { success: true, appliedToServer: false }
  }

  const appliedToServer = await setBroadcastRecording(camera.stream_id, enabled)

  revalidatePath('/cameras')
  revalidatePath(`/cameras/${cameraId}`)
  return { success: true, appliedToServer }
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
