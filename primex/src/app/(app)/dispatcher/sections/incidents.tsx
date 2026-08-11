'use client'

import { useState } from 'react'
import { PageTitle, Pagination } from '@/components/ui'
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

      {open.length > 0 && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={open.length} onPageChange={setPage} itemLabel="incidents" />
      )}
    </div>
  )
}
