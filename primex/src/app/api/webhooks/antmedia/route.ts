import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  AMS_HOOK,
  streamDropCounts,
  streamWebhookEffect,
  vodRecordingRow,
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
    const recording = vodRecordingRow(streamId, body, {
      spacesEndpoint: DO_SPACES_ENDPOINT,
      receivedAt: new Date().toISOString(),
    })

    // Idempotency: Ant Media redelivers vodReady, and a retry storm delivers it
    // concurrently. The unique index on file_url (migration 019) arbitrates —
    // ON CONFLICT DO NOTHING, and the returned rows tell us whether this
    // delivery was the one that won (SEC-179). A select-then-insert could not:
    // both racers passed the check and both inserted.
    const { data: inserted, error } = await supabase
      .from('recordings')
      .upsert({ camera_id: cameraId, ...recording }, {
        onConflict: 'file_url',
        ignoreDuplicates: true,
      })
      .select('id')

    if (error) {
      // Retrying is the right move here: the recording exists on AMS and this is
      // the only delivery that would ever have created its row.
      console.error(`Failed to store recording for stream ${streamId}:`, error.message)
      return NextResponse.json({ error: 'Failed to store recording' }, { status: 500 })
    }

    // Returns before the effect is applied, so a redelivery adds neither a
    // recording row nor a second recording_saved event.
    if (!inserted?.length) {
      return NextResponse.json({ ok: true, duplicate: true })
    }
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
