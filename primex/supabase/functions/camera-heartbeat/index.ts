import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

/**
 * Frame-liveness heartbeat from the AI worker (SEC-204).
 *
 * `cameras.last_frame_at` was written only from Ant Media's `liveStreamStarted`
 * and `liveStreamStatus` hooks, both of which mean "AMS said something" rather
 * than "we saw video". The worker holds the ground truth — it pulls a snapshot
 * every couple of seconds — and had nowhere to put it.
 *
 * This exists as an edge function rather than table access for the worker
 * because that boundary is deliberate: the worker's only write path is an
 * authenticated endpoint, so its blast radius stays one row on one column.
 *
 * **It does not touch `cameras.status`.** That column already has two writers
 * (the AMS webhook and the reconcile cron) with a shared notion of "up". A
 * third writer working from a different signal would let them fight, and the
 * loser would be whichever ran last. Liveness is reported here as evidence;
 * deciding what it means for status stays with the reconciler.
 */

interface HeartbeatPayload {
  camera_id: string
  observed_at?: string
  degraded?: boolean
  consecutive_failures?: number
  /** True only when this beat marks entering or leaving degradation. */
  transition?: boolean
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  const workerSecret = Deno.env.get('AI_WORKER_SECRET')

  // Fail closed, matching ai-event-ingest: an unset secret would interpolate to
  // the literal "Bearer undefined", which anyone could send. This function
  // writes with the service role key, so a missing secret is a broken
  // deployment, not a permissive one.
  if (!workerSecret) {
    console.error('AI_WORKER_SECRET is not set — rejecting all requests')
    return new Response(
      JSON.stringify({ error: 'Server misconfigured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  if (!authHeader || authHeader !== `Bearer ${workerSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let body: HeartbeatPayload
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { camera_id, observed_at, degraded, consecutive_failures, transition } = body
  if (!camera_id) {
    return new Response(
      JSON.stringify({ error: 'Missing required field: camera_id' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Trust the worker's clock only as far as sanity allows: a timestamp in the
  // future would make a dead camera look permanently fresh to any staleness
  // check built on this column later.
  const now = new Date()
  const parsed = observed_at ? new Date(observed_at) : now
  const observed = Number.isNaN(parsed.getTime()) || parsed > now ? now : parsed

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const { error: updateError } = await supabase
    .from('cameras')
    .update({ last_frame_at: observed.toISOString() })
    .eq('id', camera_id)

  if (updateError) {
    console.error('Failed to update last_frame_at:', updateError.message)
    return new Response(
      JSON.stringify({ error: 'Update failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    )
  }

  // Transitions only. Every beat carries a `degraded` value, so keying off
  // that alone would write a timeline row on each heartbeat — one per camera
  // per interval, forever. Only the worker knows which beat was the change.
  if (transition) {
    const { error: eventError } = await supabase.from('stream_events').insert({
      camera_id,
      event_type: degraded ? 'frame_source_degraded' : 'frame_source_recovered',
      payload: {
        source: 'ai_worker',
        consecutive_failures: consecutive_failures ?? 0,
        observed_at: observed.toISOString(),
      },
    })
    // Non-fatal: the heartbeat itself already landed, and losing the timeline
    // row is not worth making the worker retry a stale observation.
    if (eventError) {
      console.error('Failed to log stream event:', eventError.message)
    }
  }

  return new Response(
    JSON.stringify({ ok: true, last_frame_at: observed.toISOString() }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
