import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VALID_EVENT_TYPES = [
  'motion_afterhours',
  'person_lingering',
  'concealment_behavior',
  'door_event',
  'vehicle_detection',
] as const

type EventType = typeof VALID_EVENT_TYPES[number]

const EVENT_MAP: Record<EventType, { title: string; severity: string }> = {
  motion_afterhours: { title: 'After-hours motion detected', severity: 'Critical' },
  person_lingering: { title: 'Person lingering detected', severity: 'Warning' },
  concealment_behavior: { title: 'Suspicious concealment detected', severity: 'Critical' },
  door_event: { title: 'Door left open', severity: 'Warning' },
  vehicle_detection: { title: 'Vehicle in restricted zone', severity: 'Info' },
}

interface AiEventPayload {
  camera_id: string
  site_id: string
  event_type: string
  confidence: number
  frame_url?: string | null
  detections?: unknown[]
  metadata?: Record<string, unknown>
}

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  const authHeader = req.headers.get('Authorization')
  const workerSecret = Deno.env.get('AI_WORKER_SECRET')
  if (!authHeader || authHeader !== `Bearer ${workerSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  let body: AiEventPayload
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  const { camera_id, site_id, event_type, confidence, frame_url, detections, metadata } = body
  if (!camera_id || !site_id || !event_type || confidence === undefined) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: camera_id, site_id, event_type, confidence' }),
      { status: 400 }
    )
  }

  if (!VALID_EVENT_TYPES.includes(event_type as EventType)) {
    return new Response(
      JSON.stringify({ error: `Unknown event_type: ${event_type}` }),
      { status: 400 }
    )
  }

  const eventConfig = EVENT_MAP[event_type as EventType]

  const description = metadata
    ? `AI detected ${event_type.replace(/_/g, ' ')}. Confidence: ${(confidence * 100).toFixed(0)}%.`
    : `AI detection event: ${event_type}`

  // NOTE: This duplicates the alert+incident insert pattern from
  // src/lib/data/actions/alerts.ts (createAlert). If the alerts or incidents
  // schema changes, both this Edge Function and createAlert must be updated.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const { data: alertData, error: alertError } = await supabase
    .from('alerts')
    .insert({
      title: eventConfig.title,
      site_id,
      camera_id,
      severity: eventConfig.severity,
      status: 'New',
      source: 'AI Detection',
      description,
      frame_url: frame_url ?? null,
      confidence,
      event_type,
      ai_metadata: { detections: detections ?? [], metadata: metadata ?? {} },
    })
    .select('id')
    .single()

  if (alertError) {
    return new Response(
      JSON.stringify({ error: 'Failed to create alert', detail: alertError.message }),
      { status: 500 }
    )
  }

  const { data: incidentData, error: incidentError } = await supabase
    .from('incidents')
    .insert({
      title: eventConfig.title,
      site_id,
      alert_id: alertData.id,
      severity: eventConfig.severity,
      status: 'Open',
      guard_id: null,
      started_at: new Date().toISOString(),
      notes: description,
    })
    .select('id')
    .single()

  if (incidentError) {
    console.error('Failed to create linked incident:', incidentError.message)
  }

  return new Response(
    JSON.stringify({
      alert_id: alertData.id,
      incident_id: incidentData?.id ?? null,
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  )
})
