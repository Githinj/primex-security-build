import { NextRequest, NextResponse } from 'next/server'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { authenticateWebhook } from '@/lib/streaming/webhook-auth'
import {
  AMS_HOOK,
  FLEET_WIDE_WARNING,
  parseHookBody,
  streamDropCounts,
  streamWebhookEffect,
  vodRecordingRow,
  webhookDelivery,
  type WebhookDelivery,
} from '@/lib/streaming/webhook-events'

const WEBHOOK_SECRET = process.env.ANTMEDIA_WEBHOOK_SECRET
// Optional second factor. AMS runs on a fixed address, so pinning the hook to it
// means a leaked hook URL — and it will leak, see webhook-auth.ts — is not on its
// own enough to write here. Unset leaves the secret standing alone.
const WEBHOOK_ALLOWED_IPS = process.env.ANTMEDIA_WEBHOOK_ALLOWED_IPS
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

/**
 * `serverShutdown` says the whole server is going down, so every camera it was
 * carrying is about to stop at once (SEC-181). Marking them Offline here is what
 * stops the dispatcher console from showing a wall of cameras it believes are
 * covered, in the window before anything else notices.
 *
 * Scoped to cameras that were Online: a camera already Offline needs no update,
 * and rewriting it would clobber a more specific warning with a generic one.
 */
async function handleServerShutdown(
  supabase: SupabaseClient,
  body: Record<string, unknown>,
) {
  const { data: cameras, error } = await supabase
    .from('cameras')
    .select('id')
    .not('stream_id', 'is', null)
    .eq('status', 'Online')

  if (error) {
    console.error('serverShutdown: could not read the affected cameras:', error.message)
    return NextResponse.json({ error: 'Failed to apply shutdown' }, { status: 500 })
  }

  const ids = (cameras ?? []).map((camera) => camera.id as string)
  if (ids.length === 0) return NextResponse.json({ ok: true, affected: 0 })

  console.error(`Ant Media reported serverShutdown — taking ${ids.length} camera(s) Offline`)

  await supabase
    .from('cameras')
    .update({ status: 'Offline', warning: FLEET_WIDE_WARNING })
    .in('id', ids)

  // One row per camera rather than a single fleet row: stream_events is keyed on
  // camera_id, and post-incident the question is always "what happened to *this*
  // camera", which a fleet-level row can't answer.
  await supabase
    .from('stream_events')
    .insert(ids.map((id) => ({ camera_id: id, event_type: 'server_shutdown', payload: body })))

  return NextResponse.json({ ok: true, affected: ids.length })
}

/**
 * Persist one delivery to `webhook_deliveries` (SEC-202).
 *
 * Never throws and never changes the response. This is instrumentation: if the
 * diagnostic write fails, the actual webhook must still be handled. A failure
 * here is logged and dropped precisely because the alternative — 500ing a real
 * `liveStreamStarted` because a debug table was unreachable — is worse than
 * losing the sample.
 */
async function recordDelivery(
  supabase: SupabaseClient,
  delivery: WebhookDelivery & { camera_id?: string },
) {
  try {
    const { error } = await supabase.from('webhook_deliveries').insert(delivery)
    if (error) console.warn('Could not record webhook delivery:', error.message)
  } catch (e) {
    console.warn('Could not record webhook delivery:', e)
  }
}

export async function POST(req: NextRequest) {
  const auth = authenticateWebhook({
    headerSecret: req.headers.get('X-Antmedia-Secret'),
    querySecret: req.nextUrl.searchParams.get('secret'),
    expectedSecret: WEBHOOK_SECRET,
    forwardedFor: req.headers.get('x-forwarded-for'),
    allowList: WEBHOOK_ALLOWED_IPS,
  })
  if (!auth.ok) {
    // One uniform 401 whatever failed — the reason is for us, not the sender.
    // 'not-configured' in particular is worth seeing in the log: it means every
    // delivery is being dropped because the deployment has no secret set, which
    // otherwise looks identical to AMS never calling.
    console.warn(`Rejected Ant Media webhook: ${auth.reason}`)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Read once as text and let the parser decide the encoding: AMS posts
  // form-urlencoded, not JSON (SEC-202).
  const raw = await req.text()
  const contentType = req.headers.get('content-type')
  const body = parseHookBody(contentType, raw)

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  if (!body) {
    console.warn(`Unparseable Ant Media webhook body (content-type: ${contentType ?? 'none'})`)
    await recordDelivery(supabase, webhookDelivery(contentType, raw, null, 'unparseable'))
    // 200, not 400. AMS retries any non-2xx (2.8.3+), and re-sending a body we
    // could not parse the first time will not parse on the tenth — it would just
    // retry-storm. The delivery is now recorded, which is the actionable half.
    return NextResponse.json({ ok: true, recorded: 'unparseable' })
  }

  const action = body.action as string
  // `id` is the stream id on a listener hook, and it is the field the
  // form-encoded contract actually carries. `streamName` is the human-readable
  // broadcast name, NOT a key — never resolve a camera on it.
  const streamId = (body.streamId as string) ?? (body.id as string)

  if (!action) {
    await recordDelivery(supabase, webhookDelivery(contentType, raw, body, 'unparseable'))
    return NextResponse.json({ error: 'Missing action' }, { status: 400 })
  }

  // Fleet-wide, and it arrives with no stream id — so it has to be handled before
  // the camera lookup or it dies at the "missing streamId" 400 below (SEC-181).
  // Every camera on this server just went dark simultaneously.
  if (action === AMS_HOOK.serverShutdown) {
    // Recorded here rather than after the camera lookup, which this path never
    // reaches — otherwise the one event that takes the whole fleet Offline would
    // be the only action absent from the delivery log.
    await recordDelivery(supabase, webhookDelivery(contentType, raw, body, 'parsed'))
    return handleServerShutdown(supabase, body)
  }

  if (!streamId) {
    // Recorded, not just rejected: a delivery that carries an action but no id
    // we recognise is the single most useful sample for settling which key AMS
    // actually sends (SEC-202) — `body_keys` on the row names them.
    await recordDelivery(supabase, webhookDelivery(contentType, raw, body, 'unknown_stream'))
    return NextResponse.json({ error: 'Missing streamId' }, { status: 400 })
  }

  const { data: camera } = await supabase
    .from('cameras')
    .select('id')
    .eq('stream_id', streamId)
    .single()

  if (!camera) {
    console.warn(`Webhook for unknown stream_id: ${streamId}`)
    await recordDelivery(supabase, webhookDelivery(contentType, raw, body, 'unknown_stream'))
    return NextResponse.json({ ok: true, skipped: true })
  }

  const cameraId = camera.id

  await recordDelivery(
    supabase,
    { ...webhookDelivery(contentType, raw, body, 'parsed'), camera_id: cameraId },
  )

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

  const cameraUpdate: Record<string, string | null> = {}
  if (effect.status) cameraUpdate.status = effect.status
  // Tri-state on purpose: undefined leaves the existing warning, null clears it
  // (the stream recovered), a string replaces it (SEC-181).
  if (effect.warning !== undefined) cameraUpdate.warning = effect.warning
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
