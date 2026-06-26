'use client'

import { PageTitle, Card, Pill, Button } from '@/components/ui'
import { severityTone } from '@/lib/utils'
import type { Alert } from '@/lib/types'

interface ClientAlertsProps {
  alerts: Alert[]
}

function formatTimestamp(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function alertStatusTone(status: string): 'red' | 'amber' | 'green' | 'blue' | 'gray' {
  switch (status) {
    case 'New':
      return 'blue'
    case 'Reviewing':
      return 'amber'
    case 'Escalated':
      return 'red'
    case 'Closed':
      return 'green'
    default:
      return 'gray'
  }
}

export function ClientAlerts({ alerts }: ClientAlertsProps) {
  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      <PageTitle
        title="Recent alerts at your business"
        sub={`${alerts.length} alert${alerts.length !== 1 ? 's' : ''} found`}
      />

      {alerts.length === 0 && (
        <Card>
          <p className="text-sm text-ink-3 font-sans py-6 text-center">
            No alerts to display.
          </p>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {alerts.map((alert) => (
          <Card key={alert.id}>
            <div className="flex items-start justify-between gap-4 mb-2">
              <div className="flex items-center gap-2">
                <Pill tone={severityTone(alert.severity)} size="sm" dot>
                  {alert.severity}
                </Pill>
                <Pill tone={alertStatusTone(alert.status)} size="sm">
                  {alert.status}
                </Pill>
              </div>
              <Button variant="secondary" size="sm">
                View details
              </Button>
            </div>
            <h3 className="font-serif text-[20px] font-semibold text-ink leading-snug mb-1">
              {alert.title}
            </h3>
            <p className="text-[13.5px] text-ink-3 font-sans leading-relaxed mb-3">
              {alert.description}
            </p>
            <p className="text-[11px] text-ink-3 font-sans">
              {formatTimestamp(alert.created_at)}
              {alert.source && <span> &middot; Source: {alert.source}</span>}
            </p>
          </Card>
        ))}
      </div>
    </div>
  )
}
