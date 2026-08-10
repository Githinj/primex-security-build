import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  AMS_HOOK,
  streamDropCounts,
  streamWebhookEffect,
} from '@/lib/streaming/webhook-events'

const WEBHOOK_SECRET = process.env.ANTMEDIA_WEBHOOK_SECRET!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
// DO_SPACES_ENDPOINT may be set as a full URL (worker/boto3 style, e.g.
// https://sgp1.digitaloceanspaces.com) or a bare host — normalize to a bare host
// so this webhook builds a valid virtual-hosted URL either way.
const DO_SPACES_HOST = (process.env.DO_SPACES_ENDPOINT ?? 'sgp1.digitaloceanspaces.com')
  .replace(/^https?:\/\//, '')
  .replace(/\/+$/, '')
const DO_SPACES_ENDPOINT = process.env.DO_SPACES_RECORDINGS_BUCKET
  ? `https://${process.env.DO_SPACES_RECORDINGS_BUCKET}.${DO_SPACES_HOST}`
  : ''

export async function POST(req: NextRequest) {
  const secret = req.headers.get('X-Antmedia-Secret') ?? req.nextUrl.searchParams.get('secret')
  if (!secret || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action as string
  const streamId = body.streamId as string ?? body.id as string

  if (!action || !streamId) {
    return NextResponse.json({ error: 'Missing action or streamId' }, { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  const { data: camera } = await supabase
    .from('cameras')
    .select('id')
    .eq('stream_id', streamId)
    .single()

  if (!camera) {
    console.warn(`Webhook for unknown stream_id: ${streamId}`)
    return NextResponse.json({ ok: true, skipped: true })
  }

  const cameraId = camera.id

  // What this action means for camera state and the event log lives in
  // lib/streaming/webhook-events.ts so the mapping is unit-testable; this route
  // only performs the writes it asks for.
  const effect = streamWebhookEffect(action, body)

  if (!effect.recognised) {
    // Recorded as `stream_unhandled` below, not just logged. An AMS action we
    // have no mapping for used to vanish into the server log, which is how a
    // flapping stream stayed invisible to everyone but AMS (SEC-201).
    console.warn(`Unhandled Ant Media webhook action "${action}" for stream ${streamId}`)
  }

  if (effect.eventType === 'stream_error') {
    console.error(`Ant Media reported "${action}" on stream ${streamId} (camera ${cameraId})`)
  }

  if (effect.eventType === 'stream_degraded') {
    const { ingestion, encoding } = streamDropCounts(body)
    console.warn(
      `Stream ${streamId} degrading — AMS dropped ${ingestion} ingest packet(s), ${encoding} encode frame(s)`,
    )
  }

  // vodReady carries a second write (the recordings row) plus its own
  // idempotency guard, so it runs before the shared effect is applied.
  if (action === AMS_HOOK.vodReady) {
    const vodName = body.vodName as string ?? ''
    const duration = body.duration as number ?? 0
    const fileSize = body.fileSize as number ?? 0
    const startTime = body.startTime as string ?? new Date().toISOString()
    const endTime = body.endTime as string ?? new Date().toISOString()

    // Use startTime (not Date.now()) in the fallback name so a redelivered
    // webhook resolves to the same file_url and stays idempotent.
    const fileUrl = vodName
      ? `${DO_SPACES_ENDPOINT}/recordings/${vodName}`
      : `${DO_SPACES_ENDPOINT}/recordings/${streamId}_${startTime}.mp4`

    // Idempotency: Ant Media can redeliver vodReady. Without this guard a
    // duplicate delivery inserts a second row and double-lists the recording.
    const { data: existingRecording } = await supabase
      .from('recordings')
      .select('id')
      .eq('file_url', fileUrl)
      .maybeSingle()

    // Returns before the effect is applied, so a redelivery adds neither a
    // recording row nor a second recording_saved event.
    if (existingRecording) {
      return NextResponse.json({ ok: true, duplicate: true })
    }

    await supabase.from('recordings').insert({
      camera_id: cameraId,
      stream_id: streamId,
      file_url: fileUrl,
      file_size: fileSize || null,
      duration_s: duration ? Math.round(duration / 1000) : null,
      started_at: startTime,
      ended_at: endTime,
      status: 'complete',
    })
  }

  const cameraUpdate: Record<string, string> = {}
  if (effect.status) cameraUpdate.status = effect.status
  if (effect.touchLastFrame) cameraUpdate.last_frame_at = new Date().toISOString()
  if (Object.keys(cameraUpdate).length > 0) {
    await supabase.from('cameras').update(cameraUpdate).eq('id', cameraId)
  }

  if (effect.eventType) {
    await supabase.from('stream_events').insert({
      camera_id: cameraId,
      event_type: effect.eventType,
      payload: body,
    })
  }

  return NextResponse.json({ ok: true })
}
