'use client'

import { PageTitle } from '@/components/ui'
import { IncidentCard } from '@/components/incidents/incident-card'
import type { Incident, IncidentStatus, Site, Profile } from '@/lib/types'

interface DispatchBoardProps {
  incidents: Incident[]
  sites: Site[]
  guards: Profile[]
}

interface Column {
  key: string
  label: string
  statuses: IncidentStatus[]
  dotColor: string
}

const columns: Column[] = [
  { key: 'open', label: 'Open', statuses: ['Open'], dotColor: 'bg-p-red' },
  { key: 'dispatched', label: 'Dispatched', statuses: ['Dispatched'], dotColor: 'bg-p-amber' },
  { key: 'in-progress', label: 'In Progress', statuses: ['In Progress'], dotColor: 'bg-p-blue' },
  { key: 'resolved', label: 'Resolved / Closed', statuses: ['Resolved', 'Closed'], dotColor: 'bg-p-green' },
]

export function DispatchBoard({ incidents, sites, guards }: DispatchBoardProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Dispatch board"
        phaseTag="Drag & drop · Phase 2"
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {columns.map((col) => {
          const items = incidents.filter((i) => col.statuses.includes(i.status))

          return (
            <div key={col.key} className="flex flex-col gap-3">
              {/* Column header */}
              <div className="flex items-center gap-2 px-1">
                <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} flex-shrink-0`} />
                <span className="text-sm font-semibold text-ink font-sans">
                  {col.label}
                </span>
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-surface-subtle text-ink-3 leading-none">
                  {items.length}
                </span>
              </div>

              {/* Column body */}
              <div className="flex flex-col gap-2 min-h-[120px]">
                {items.length === 0 ? (
                  <div className="flex items-center justify-center h-[120px] rounded-xl border-2 border-dashed border-border text-sm text-ink-4 font-sans">
                    No incidents
                  </div>
                ) : (
                  items.map((incident) => {
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
                        variant="compact"
                      />
                    )
                  })
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
