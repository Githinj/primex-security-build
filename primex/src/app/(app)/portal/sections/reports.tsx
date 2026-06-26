'use client'

import { FileText, Download } from 'lucide-react'
import { PageTitle, Card, DataTable, Button } from '@/components/ui'
import type { Report } from '@/lib/types'

interface ClientReportsProps {
  reports: Report[]
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function ClientReports({ reports }: ClientReportsProps) {
  const columns = ['Report', 'Period', 'Incidents', 'Generated', '']

  const rows = reports.map((r) => [
    <div key={`name-${r.id}`} className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-lg bg-p-blue-softer flex items-center justify-center flex-shrink-0">
        <FileText size={14} className="text-p-blue" strokeWidth={2} />
      </div>
      <span className="text-sm text-ink font-medium font-sans">{r.name}</span>
    </div>,
    <span key={`type-${r.id}`} className="text-sm text-ink-2 font-sans">
      {r.type}
    </span>,
    <span key={`inc-${r.id}`} className="text-sm text-ink-2 font-sans">
      {r.incident_count}
    </span>,
    <span key={`date-${r.id}`} className="text-sm text-ink-3 font-sans whitespace-nowrap">
      {formatDate(r.date)}
    </span>,
    <Button key={`dl-${r.id}`} variant="secondary" size="sm" icon={Download}>
      PDF
    </Button>,
  ])

  return (
    <div className="flex flex-col gap-6 max-w-[1000px]">
      <PageTitle
        title="My reports"
        sub={`${reports.length} report${reports.length !== 1 ? 's' : ''} available`}
      />

      <Card padding="p-0">
        {reports.length === 0 ? (
          <p className="text-sm text-ink-3 font-sans py-8 text-center">
            No reports available yet.
          </p>
        ) : (
          <DataTable columns={columns} rows={rows} />
        )}
      </Card>
    </div>
  )
}
