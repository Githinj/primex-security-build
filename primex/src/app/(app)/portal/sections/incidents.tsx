'use client'

import { useState } from 'react'
import { Eye } from 'lucide-react'
import { PageTitle, Card, Pill, DataTable, Button } from '@/components/ui'
import { severityTone, incidentTone } from '@/lib/utils'
import type { Incident } from '@/lib/types'

interface ClientIncidentsProps {
  incidents: Incident[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

const PAGE_SIZE = 15

export function ClientIncidents({ incidents }: ClientIncidentsProps) {
  const [page, setPage] = useState(1)
  const columns = ['Incident', 'Severity', 'Status', 'Guard', 'Started', '']
  const paginatedIncidents = incidents.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const rows = paginatedIncidents.map((inc) => [
    <div key={`title-${inc.id}`}>
      <p className="text-sm text-ink font-medium font-sans">{inc.title}</p>
      {inc.notes && (
        <p className="text-[12px] text-ink-3 font-sans mt-0.5 line-clamp-1">
          {inc.notes}
        </p>
      )}
    </div>,
    <Pill key={`sev-${inc.id}`} tone={severityTone(inc.severity)} size="sm" dot>
      {inc.severity}
    </Pill>,
    <Pill key={`st-${inc.id}`} tone={incidentTone(inc.status)} size="sm">
      {inc.status}
    </Pill>,
    <span key={`guard-${inc.id}`} className="text-sm text-ink-2 font-sans">
      {inc.guard_id ? 'Assigned' : '\u2014'}
    </span>,
    <span key={`time-${inc.id}`} className="text-sm text-ink-3 font-sans whitespace-nowrap">
      {formatDate(inc.started_at)}
    </span>,
    <Button key={`btn-${inc.id}`} variant="secondary" size="sm" icon={Eye}>
      View
    </Button>,
  ])

  return (
    <div className="flex flex-col gap-6 max-w-[1100px]">
      <PageTitle
        title="Incident log"
        sub={`${incidents.length} incident${incidents.length !== 1 ? 's' : ''} on record`}
      />

      <Card padding="p-0">
        {incidents.length === 0 ? (
          <p className="text-sm text-ink-3 font-sans py-8 text-center">
            No incidents to display.
          </p>
        ) : (
          <DataTable
            columns={columns}
            rows={rows}
            pagination={{ page, pageSize: PAGE_SIZE, total: incidents.length, onPageChange: setPage }}
          />
        )}
      </Card>
    </div>
  )
}
