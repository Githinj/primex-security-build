'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
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

const PAGE_SIZE = 15

export function ClientAlerts({ alerts }: ClientAlertsProps) {
  const [page, setPage] = useState(1)
  const totalPages = Math.ceil(alerts.length / PAGE_SIZE)
  const paginatedAlerts = alerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

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
        {paginatedAlerts.map((alert) => (
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
              {alert.source && (
                <span className="inline-flex items-center gap-1.5">
                  {' '}&middot; Source: {alert.source}
                  {alert.source.includes('AI') && <Pill tone="blue" size="sm">AI</Pill>}
                </span>
              )}
            </p>
          </Card>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-3 font-sans tabular-nums">
            {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, alerts.length)} of {alerts.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} strokeWidth={2} />
            </button>
            <span className="text-xs font-sans text-ink-2 px-2 tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-md text-ink-3 hover:bg-surface-subtle disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} strokeWidth={2} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
