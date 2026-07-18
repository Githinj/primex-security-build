'use server'

import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import type { StreamToken } from '@/lib/types'

const ANTMEDIA_URL = process.env.ANTMEDIA_URL!
const ANTMEDIA_APP = process.env.ANTMEDIA_APP || 'LiveApp'
const ANTMEDIA_API_KEY = process.env.ANTMEDIA_API_KEY // optional for Community Edition
const ANTMEDIA_WS_URL = process.env.ANTMEDIA_WS_URL!
const TOKEN_DURATION_MS = 60 * 60 * 1000 // 1 hour

function antmediaHeaders(contentType?: string): Record<string, string> {
  const headers: Record<string, string> = {}
  if (contentType) headers['Content-Type'] = contentType
  if (ANTMEDIA_API_KEY) headers['Authorization'] = `Bearer ${ANTMEDIA_API_KEY}`
  return headers
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
  const expireDate = Date.now() + TOKEN_DURATION_MS

  // Community Edition doesn't support the token API — return tokenless URLs
  if (!ANTMEDIA_API_KEY) {
    return {
      token: null,
      streamId,
      webrtcUrl: ANTMEDIA_WS_URL,
      hlsUrl: `${ANTMEDIA_URL}/${ANTMEDIA_APP}/streams/${streamId}.m3u8`,
      expiresAt: expireDate,
    }
  }

  const res = await fetch(
    `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts/${streamId}/token?expireDate=${expireDate}&type=play`,
    {
      method: 'GET',
      headers: antmediaHeaders(),
    }
  )

  if (!res.ok) {
    console.error(`Ant Media token request failed: ${res.status}`)
    return null
  }

  const { tokenId } = await res.json()

  return {
    token: tokenId,
    streamId,
    webrtcUrl: ANTMEDIA_WS_URL,
    hlsUrl: `${ANTMEDIA_URL}/${ANTMEDIA_APP}/streams/${streamId}.m3u8?token=${tokenId}`,
    expiresAt: expireDate,
  }
}

export async function createBroadcast(cameraId: string, cameraName: string, streamId: string): Promise<{ success: boolean; ingestUrl?: string }> {
  await requireRole('super_admin')

  const ingestUrl = `rtmp://${new URL(ANTMEDIA_URL).hostname}/${ANTMEDIA_APP}/${streamId}`

  // Ant Media's create resource is /broadcasts/create — POSTing to /broadcasts
  // itself is 405 (that path only lists). Keep the /create suffix.
  const res = await fetch(
    `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts/create`,
    {
      method: 'POST',
      headers: antmediaHeaders('application/json'),
      body: JSON.stringify({
        streamId,
        name: cameraName,
        type: 'liveStream',
      }),
    }
  )

  if (res.status === 409) {
    return { success: true, ingestUrl }
  }

  if (!res.ok) {
    console.error(`Failed to create broadcast: ${res.status}`)
    return { success: false }
  }

  const supabase = await createServerSupabaseClient()
  await supabase
    .from('cameras')
    .update({
      stream_id: streamId,
      stream_url: ingestUrl,
    })
    .eq('id', cameraId)

  return { success: true, ingestUrl }
}

// RTSP pull ingest: Ant Media connects OUT to an RTSP camera (type "streamSource")
// and republishes it under `streamId` as WebRTC/HLS — the pull counterpart to
// createBroadcast()'s RTMP push flow. Playback (getStreamToken) and the webhook are
// keyed on stream_id, so both work unchanged once the source is republishing.
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
    await fetch(`${base}/${trimmedId}`, {
      method: 'PUT',
      headers: antmediaHeaders('application/json'),
      body: JSON.stringify(sourcePayload),
    })
  } else if (!createRes.ok) {
    console.error(`Failed to create stream source: ${createRes.status}`)
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
    console.warn(`Stream source start returned ${startRes.status} (may already be running)`)
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
    console.warn(`Stream source stop returned ${res.status} (may already be stopped)`)
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
