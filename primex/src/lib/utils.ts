import type { AlertSeverity, CameraStatus, IncidentStatus } from './types'

export function severityTone(s: AlertSeverity): 'red' | 'amber' | 'blue' {
  switch (s) {
    case 'Critical':
      return 'red'
    case 'Warning':
      return 'amber'
    case 'Info':
      return 'blue'
  }
}

export function incidentTone(s: IncidentStatus): 'green' | 'amber' | 'gray' {
  switch (s) {
    case 'Resolved':
    case 'Closed':
      return 'green'
    case 'In Progress':
    case 'Dispatched':
      return 'amber'
    default:
      return 'gray'
  }
}

export function cameraTone(s: CameraStatus): 'green' | 'red' | 'amber' | 'gray' {
  switch (s) {
    case 'Online':
      return 'green'
    case 'Offline':
      return 'red'
    case 'Maintenance':
      return 'amber'
    default:
      return 'gray'
  }
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

/**
 * Coarse "2m ago" stamp for feeds where the exact second does not matter.
 *
 * A future timestamp reads as "Just now" rather than a negative age: rows are
 * stamped by Postgres and rendered against the browser's clock, so a few
 * seconds of skew is normal and "-1m ago" would look like a bug. An
 * unparseable date returns an em dash instead of "NaNm ago".
 */
export function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return '—'

  const mins = Math.floor((Date.now() - then) / 60_000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}
