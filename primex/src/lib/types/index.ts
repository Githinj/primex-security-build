export type CompanyStatus = 'Active' | 'Pending' | 'Suspended'
export type SiteRisk = 'Low' | 'Medium' | 'High'
export type SiteStatus = 'Active' | 'Maintenance' | 'Inactive'
export type CameraStatus = 'Online' | 'Offline' | 'Maintenance' | 'Unknown'
export type AlertSeverity = 'Critical' | 'Warning' | 'Info'
export type AlertStatus = 'New' | 'Reviewing' | 'Escalated' | 'Closed'
export type IncidentStatus = 'Open' | 'In Progress' | 'Dispatched' | 'Resolved' | 'Closed'
export type GuardStatus = 'Available' | 'On Incident' | 'Off-duty'
export type UserRole = 'super_admin' | 'company_manager' | 'dispatcher' | 'guard' | 'client'
export type DetectionEventType = 'motion_afterhours' | 'person_lingering' | 'concealment_behavior' | 'door_event' | 'vehicle_detection'
export type PlanTier = 'starter' | 'professional' | 'enterprise'
// Mirrors Stripe subscription statuses.
export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'unpaid'
  | 'paused'

export interface Company {
  id: string
  name: string
  type: string
  status: CompanyStatus
  sites?: number
  users?: number
  primary_contact?: string | null
  contact_email?: string | null
  plan?: string | null
  created_at?: string | null
}

export interface Subscription {
  id: string
  company_id: string
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  plan_tier: PlanTier | null
  status: SubscriptionStatus | null
  current_period_end: string | null
  trial_end: string | null
  cancel_at_period_end: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface Site {
  id: string
  company_id: string
  name: string
  type: string
  address: string
  risk: SiteRisk
  status: SiteStatus
  cameras?: number
}

export interface Camera {
  id: string
  site_id: string
  name: string
  location: string
  status: CameraStatus
  last_checked: string
  warning: string | null
  stream_id: string | null
  recording_enabled: boolean
  last_frame_at: string | null
}

/**
 * Ingest configuration — deliberately NOT part of `Camera` (SEC-177).
 *
 * `source_url` is an RTSP URL that carries the camera's credentials inline, and
 * `stream_url` is its publish endpoint. `Camera` rows are serialized into client
 * components on /cameras, /dispatcher, /portal and /sites/[id], so anything on
 * that interface reaches the browser of every role that can see the camera.
 * These two fields are read only through `getCameraStreamConfig()`, which is
 * super_admin-gated.
 */
export interface CameraStreamConfig {
  stream_id: string | null
  stream_url: string | null
  source_url: string | null
}

export interface AiZone {
  name: string
  type: 'door' | 'restricted' | 'entry'
  coords: { x1: number; y1: number; x2: number; y2: number }
}

export interface CameraAiConfig {
  id: string
  camera_id: string
  enabled: boolean
  zones: AiZone[]
}

export interface SiteBusinessHours {
  id: string
  site_id: string
  timezone: string
  hours: Record<string, { open: string; close: string }>
}

export interface AiWorkerConfig {
  id: number
  confidence_threshold: number
  snapshot_interval_s: number
  cooldown_s: number
  dwell_threshold_s: number
  door_open_threshold_s: number
  updated_at: string
}

export interface Recording {
  id: string
  camera_id: string
  stream_id: string
  file_url: string
  file_size: number | null
  duration_s: number | null
  started_at: string
  ended_at: string | null
  status: 'recording' | 'complete' | 'failed'
  /**
   * Explicit evidentiary hold (SEC-190, migration 020). While this is in the
   * future, retention will not delete the row. Incident-linked footage is held
   * automatically and does not need it set.
   */
  hold_until: string | null
  created_at: string
}

export interface StreamToken {
  token: string | null
  streamId: string
  webrtcUrl: string
  hlsUrl: string
  expiresAt: number
  /**
   * ICE servers for the WebRTC peer connection (SEC-184). Travels with the token
   * because TURN credentials are minted per request and expire — see
   * `lib/streaming/ice-servers.ts` for why they are not client-side config.
   * Empty/absent leaves the adaptor on its own defaults.
   */
  iceServers?: IceServer[]
}

export interface IceServer {
  urls: string[]
  username?: string
  credential?: string
}

export interface StreamEvent {
  id: string
  camera_id: string
  event_type: 'stream_started' | 'stream_stopped' | 'recording_saved'
  payload: Record<string, unknown>
  created_at: string
}

export interface Profile {
  id: string
  full_name: string
  email: string
  role: UserRole
  company_id: string | null
  status: string
  phone: string | null
  zone: string | null
  shifts: string | null
  guard_status: GuardStatus | null
  last_active: string | null
  timezone: string | null
  avatar_url: string | null
}

export interface IncidentUpdate {
  id: string
  incident_id: string
  author_id: string | null
  author_name: string
  note: string | null
  photo_url: string | null
  status: string | null
  created_at: string
}

export interface Alert {
  id: string
  title: string
  site_id: string
  camera_id: string | null
  severity: AlertSeverity
  status: AlertStatus
  created_at: string
  description: string
  source: string
  frame_url: string | null
  confidence: number | null
  event_type: DetectionEventType | null
  ai_metadata: Record<string, unknown> | null
}

export interface Incident {
  id: string
  title: string
  site_id: string
  alert_id: string
  severity: AlertSeverity
  status: IncidentStatus
  guard_id: string | null
  started_at: string
  notes: string | null
  guard_stage: string | null
}

export interface Report {
  id: string
  name: string
  company_id: string
  company_name?: string
  date: string
  type: string
  incident_count: number
  size: string | null
}

export interface ActivityItem {
  id: string
  who: string
  action: string
  target: string
  created_at: string
  icon: string
  tone: 'red' | 'amber' | 'green' | 'blue' | 'gray'
}

export interface RolePermission {
  role: string
  count: number
  perms: string
}
