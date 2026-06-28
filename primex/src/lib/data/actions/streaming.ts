'use server'

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

  const res = await fetch(
    `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts`,
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

export async function getRecordingsAction(
  cameraId: string,
  from: string,
  to: string
) {
  await requireRole('super_admin', 'dispatcher', 'company_manager', 'client', 'guard')

  const { getRecordings } = await import('@/lib/data/recordings')
  return getRecordings(cameraId, from, to)
}
