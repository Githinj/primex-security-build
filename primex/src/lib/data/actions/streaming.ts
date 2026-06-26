'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import type { StreamToken } from '@/lib/types'

const ANTMEDIA_URL = process.env.ANTMEDIA_URL!
const ANTMEDIA_API_KEY = process.env.ANTMEDIA_API_KEY!
const ANTMEDIA_WS_URL = process.env.ANTMEDIA_WS_URL!
const TOKEN_DURATION_MS = 60 * 60 * 1000 // 1 hour

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

  const res = await fetch(
    `${ANTMEDIA_URL}/WebRTCAppEE/rest/v2/broadcasts/${streamId}/token?expireDate=${expireDate}&type=play`,
    {
      method: 'GET', // Ant Media token API uses GET, not POST
      headers: { Authorization: `Bearer ${ANTMEDIA_API_KEY}` },
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
    hlsUrl: `${ANTMEDIA_URL}/WebRTCAppEE/streams/${streamId}.m3u8?token=${tokenId}`,
    expiresAt: expireDate,
  }
}

export async function createBroadcast(cameraId: string, cameraName: string, streamId: string): Promise<{ success: boolean; ingestUrl?: string }> {
  await requireRole('super_admin')

  const res = await fetch(
    `${ANTMEDIA_URL}/WebRTCAppEE/rest/v2/broadcasts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANTMEDIA_API_KEY}`,
      },
      body: JSON.stringify({
        streamId,
        name: cameraName,
        type: 'liveStream',
      }),
    }
  )

  if (res.status === 409) {
    return { success: true, ingestUrl: `rtmp://${new URL(ANTMEDIA_URL).hostname}/WebRTCAppEE/${streamId}` }
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
      stream_url: `rtmp://${new URL(ANTMEDIA_URL).hostname}/WebRTCAppEE/${streamId}`,
    })
    .eq('id', cameraId)

  return {
    success: true,
    ingestUrl: `rtmp://${new URL(ANTMEDIA_URL).hostname}/WebRTCAppEE/${streamId}`,
  }
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
