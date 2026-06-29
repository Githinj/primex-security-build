'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { PageTitle } from '@/components/ui'
import { IncidentCard } from '@/components/incidents/incident-card'
import type { Incident, Site, Profile } from '@/lib/types'

interface OpenIncidentsProps {
  incidents: Incident[]
  sites: Site[]
  guards: Profile[]
}

const PAGE_SIZE = 12

export function OpenIncidents({ incidents, sites, guards }: OpenIncidentsProps) {
  const [page, setPage] = useState(1)
  const open = incidents.filter(
    (i) => i.status !== 'Resolved' && i.status !== 'Closed'
  )
  const totalPages = Math.ceil(open.length / PAGE_SIZE)
  const paginatedOpen = open.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Open incidents"
        sub={`${open.length} incident${open.length !== 1 ? 's' : ''} requiring attention`}
      />

      {open.length === 0 ? (
        <div className="text-center text-sm text-ink-3 py-16 font-sans">
          No open incidents at this time.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedOpen.map((incident) => {
            const site = sites.find((s) => s.id === incident.site_id)
            const guard = incident.guard_id
              ? guards.find((g) => g.id === incident.guard_id)
              : undefined

            return (
              <IncidentCard
                key={incident.id}
                incident={incident}
                site={site}
                guard={guard}
                variant="default"
              />
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-ink-3 font-sans tabular-nums">
            {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, open.length)} of {open.length}
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
