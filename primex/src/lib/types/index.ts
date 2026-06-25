export type CompanyStatus = 'Active' | 'Pending' | 'Suspended'
export type SiteRisk = 'Low' | 'Medium' | 'High'
export type SiteStatus = 'Active' | 'Maintenance' | 'Inactive'
export type CameraStatus = 'Online' | 'Offline' | 'Maintenance' | 'Unknown'
export type AlertSeverity = 'Critical' | 'Warning' | 'Info'
export type AlertStatus = 'New' | 'Reviewing' | 'Escalated' | 'Closed'
export type IncidentStatus = 'Open' | 'In Progress' | 'Dispatched' | 'Resolved' | 'Closed'
export type GuardStatus = 'Available' | 'On Incident' | 'Off-duty'
export type UserRole = 'super_admin' | 'company_manager' | 'dispatcher' | 'guard' | 'client'

export interface Company {
  id: string
  name: string
  type: string
  status: CompanyStatus
  sites?: number
  users?: number
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
