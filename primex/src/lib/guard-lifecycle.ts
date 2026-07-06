// Pure guard incident-lifecycle mapping, shared by the guard UI and unit tests.
// The incident_status enum can't represent Accepted/En Route/Arrived (all "In
// Progress"), so the finer stage is carried in incidents.guard_stage.

export type GuardStatus = 'assigned' | 'accepted' | 'enroute' | 'arrived' | 'resolved'

export function guardStatusToIncidentStatus(gs: GuardStatus): string {
  switch (gs) {
    case 'assigned':
      return 'Dispatched'
    case 'accepted':
    case 'enroute':
    case 'arrived':
      return 'In Progress'
    case 'resolved':
      return 'Resolved'
  }
}

/** Persisted guard_stage label for a guard status (null when the incident status alone is enough). */
export function guardStageValue(gs: GuardStatus): string | null {
  switch (gs) {
    case 'accepted':
      return 'Accepted'
    case 'enroute':
      return 'En Route'
    case 'arrived':
      return 'Arrived'
    default:
      return null
  }
}

/** Derive the guard status from a stored incident, preferring guard_stage when "In Progress". */
export function mapIncidentToGuard(incident: { status: string; guard_stage: string | null }): GuardStatus {
  switch (incident.status) {
    case 'Dispatched':
      return 'assigned'
    case 'Resolved':
    case 'Closed':
      return 'resolved'
    case 'In Progress':
      if (incident.guard_stage === 'En Route') return 'enroute'
      if (incident.guard_stage === 'Arrived') return 'arrived'
      return 'accepted'
    default:
      return 'assigned'
  }
}
