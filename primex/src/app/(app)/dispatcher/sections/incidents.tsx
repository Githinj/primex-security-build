'use client'

import { PageTitle } from '@/components/ui'
import { IncidentCard } from '@/components/incidents/incident-card'
import type { Incident, Site, Profile } from '@/lib/types'

interface OpenIncidentsProps {
  incidents: Incident[]
  sites: Site[]
  guards: Profile[]
}

export function OpenIncidents({ incidents, sites, guards }: OpenIncidentsProps) {
  const open = incidents.filter(
    (i) => i.status !== 'Resolved' && i.status !== 'Closed'
  )

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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {open.map((incident) => {
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
    </div>
  )
}
