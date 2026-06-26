'use client'

import { Phone, MessageSquare, Eye } from 'lucide-react'
import { Button, Pill, Card, PageTitle } from '@/components/ui'
import type { Profile, Incident } from '@/lib/types'

interface GuardsOnDutyProps {
  guards: Profile[]
  incidents: Incident[]
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

const guardStatusTone = (s: string | null): 'green' | 'amber' | 'gray' => {
  switch (s) {
    case 'Available': return 'green'
    case 'On Incident': return 'amber'
    default: return 'gray'
  }
}

export function GuardsOnDuty({ guards, incidents }: GuardsOnDutyProps) {
  const onDuty = guards.filter((g) => g.guard_status !== 'Off-duty')

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Guards on duty"
        sub={`${onDuty.length} guard${onDuty.length !== 1 ? 's' : ''} currently on duty`}
      />

      {onDuty.length === 0 ? (
        <div className="text-center text-sm text-ink-3 py-16 font-sans">
          No guards currently on duty.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {onDuty.map((guard) => {
            const activeIncident = guard.guard_status === 'On Incident'
              ? incidents.find(
                  (i) =>
                    i.guard_id === guard.id &&
                    i.status !== 'Resolved' &&
                    i.status !== 'Closed'
                )
              : undefined

            return (
              <Card key={guard.id}>
                <div className="flex flex-col gap-4">
                  {/* Guard header */}
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div className="w-12 h-12 rounded-full bg-navy flex items-center justify-center flex-shrink-0">
                      <span className="text-white text-sm font-semibold font-sans">
                        {getInitials(guard.full_name)}
                      </span>
                    </div>

                    {/* Info */}
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <span className="font-serif text-[15px] font-semibold text-ink">
                        {guard.full_name}
                      </span>
                      <div className="flex items-center gap-3 text-xs text-ink-3 font-sans">
                        {guard.zone && <span>{guard.zone}</span>}
                        {guard.phone && <span>{guard.phone}</span>}
                      </div>
                    </div>

                    {/* Status */}
                    <Pill tone={guardStatusTone(guard.guard_status)} dot size="sm">
                      {guard.guard_status ?? 'Unknown'}
                    </Pill>
                  </div>

                  {/* Active incident card */}
                  {activeIncident && (
                    <div className="bg-p-amber-soft border border-p-amber/20 rounded-lg px-3.5 py-3 flex flex-col gap-1">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-p-amber font-sans">
                        Current incident
                      </span>
                      <span className="text-sm font-semibold text-ink font-sans">
                        {activeIncident.title}
                      </span>
                      <span className="text-xs text-ink-3 font-sans tabular-nums">
                        Since{' '}
                        {new Date(activeIncident.started_at).toLocaleString('en-AU', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                          hour12: false,
                        })}
                      </span>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" icon={Phone}>
                      Call
                    </Button>
                    <Button variant="secondary" size="sm" icon={MessageSquare}>
                      Message
                    </Button>
                    <Button variant="secondary" size="sm" icon={Eye}>
                      View profile
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
