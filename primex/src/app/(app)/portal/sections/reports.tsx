'use client'

import { useState, useTransition } from 'react'
import { FileText, Download } from 'lucide-react'
import { PageTitle, Card, DataTable, Button } from '@/components/ui'
import { generateReportPdf } from '@/lib/data/actions/generate-report-pdf'
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

const PAGE_SIZE = 15

export function ClientReports({ reports }: ClientReportsProps) {
  const [isPending, startTransition] = useTransition()
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [page, setPage] = useState(1)

  function handleDownload(report: Report) {
    setDownloadingId(report.id)
    startTransition(async () => {
      try {
        const dataUri = await generateReportPdf({ reportId: report.id })
        const link = document.createElement('a')
        link.href = dataUri
        link.download = `${report.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
        link.click()
      } catch (err) {
        console.error('PDF generation failed:', err)
      } finally {
        setDownloadingId(null)
      }
    })
  }

  const columns = ['Report', 'Period', 'Incidents', 'Generated', '']

  const paginatedReports = reports.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const rows = paginatedReports.map((r) => [
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
    <Button
      key={`dl-${r.id}`}
      variant="secondary"
      size="sm"
      icon={Download}
      onClick={() => handleDownload(r)}
      disabled={downloadingId === r.id}
    >
      {downloadingId === r.id ? '…' : 'PDF'}
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
          <DataTable
            columns={columns}
            rows={rows}
            pagination={{ page, pageSize: PAGE_SIZE, total: reports.length, onPageChange: setPage }}
          />
        )}
      </Card>
    </div>
  )
}
