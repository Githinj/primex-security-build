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
