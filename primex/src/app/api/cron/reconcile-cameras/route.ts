import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createClient } from '@supabase/supabase-js'
import {
  correctionWarning,
  reconcileCameraStatuses,
  type AmsBroadcast,
  type CameraRow,
} from '@/lib/streaming/reconcile'
// Same signer the server actions and the Python worker use — see rest-jwt.ts.
import { restJwtExpiry, signRestJwt } from '@/lib/streaming/rest-jwt'

/**
 * Correct camera status against Ant Media (SEC-180).
 *
 * `cameras.status` had exactly one writer — the webhook — and webhooks are
 * at-most-once in practice, so a single lost delivery stranded a camera at the
 * wrong status indefinitely. This closes the loop by asking AMS what is actually
 * broadcasting and fixing anything that disagrees.
 *
 * Node runtime, not edge: it needs the service-role client to write across
 * tenants, the same RLS-bypassing position the webhook occupies.
 */
export const runtime = 'nodejs'

const CRON_SECRET = process.env.CRON_SECRET
const ANTMEDIA_URL = process.env.ANTMEDIA_URL
const ANTMEDIA_APP = process.env.ANTMEDIA_APP || 'LiveApp'
const ANTMEDIA_API_KEY = process.env.ANTMEDIA_API_KEY

function authorized(req: NextRequest): boolean {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Unset means this is
  // callable by anyone, so it fails closed rather than exposing a write endpoint.
  if (!CRON_SECRET) return false

  const presented = req.headers.get('authorization') ?? ''
  const expected = `Bearer ${CRON_SECRET}`
  const a = crypto.createHash('sha256').update(presented).digest()
  const b = crypto.createHash('sha256').update(expected).digest()
  return crypto.timingSafeEqual(a, b)
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!ANTMEDIA_URL) {
    return NextResponse.json({ error: 'ANTMEDIA_URL is not set' }, { status: 500 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: cameras, error } = await supabase
    .from('cameras')
    .select('id, stream_id, status')
    .not('stream_id', 'is', null)

  if (error) {
    console.error('Reconcile: could not read cameras:', error.message)
    return NextResponse.json({ error: 'Failed to read cameras' }, { status: 500 })
  }
  if (!cameras?.length) return NextResponse.json({ ok: true, checked: 0, corrected: 0 })

  // One list call rather than one request per camera: this runs on a schedule
  // over the whole fleet, and per-camera would be N round trips to a box that
  // may be rate-limiting or IP-restricted.
  let broadcasts: AmsBroadcast[]
  try {
    const headers: Record<string, string> = {}
    if (ANTMEDIA_API_KEY) {
      headers.Authorization = signRestJwt(ANTMEDIA_API_KEY, restJwtExpiry(Date.now()))
    }

    const res = await fetch(
      `${ANTMEDIA_URL}/${ANTMEDIA_APP}/rest/v2/broadcasts/list/0/2000`,
      { headers, cache: 'no-store' },
    )
    if (!res.ok) {
      console.error(`Reconcile: Ant Media list returned ${res.status}`)
      return NextResponse.json({ error: 'Ant Media unreachable' }, { status: 502 })
    }
    const body = await res.json()
    broadcasts = Array.isArray(body) ? body : []
  } catch (err) {
    // Deliberately no writes on this path. If AMS is unreachable we know nothing
    // about the fleet, and marking everything Offline on a network blip would
    // manufacture the outage this job exists to detect.
    console.error('Reconcile: Ant Media list threw:', err)
    return NextResponse.json({ error: 'Ant Media unreachable' }, { status: 502 })
  }

  const corrections = reconcileCameraStatuses(cameras as CameraRow[], broadcasts)

  for (const correction of corrections) {
    console.warn(
      `Reconcile: camera ${correction.cameraId} ${correction.from} → ${correction.to} (${correction.reason})`,
    )

    await supabase
      .from('cameras')
      .update({ status: correction.to, warning: correctionWarning(correction) })
      .eq('id', correction.cameraId)

    // Recorded as its own event type: a correction means a webhook was lost, and
    // that is worth being able to count separately from a normal stop/start.
    await supabase.from('stream_events').insert({
      camera_id: correction.cameraId,
      event_type: 'status_reconciled',
      payload: {
        from: correction.from,
        to: correction.to,
        reason: correction.reason,
        streamId: correction.streamId,
      },
    })
  }

  return NextResponse.json({
    ok: true,
    checked: cameras.length,
    corrected: corrections.length,
  })
}
