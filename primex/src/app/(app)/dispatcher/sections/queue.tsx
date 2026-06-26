'use client'

import { useState } from 'react'
import {
  Bell,
  AlertTriangle,
  MapPin,
  Camera,
  Check,
  X,
  ArrowUpRight,
} from 'lucide-react'
import { Button, Pill, Label, Card, LiveDot, KV } from '@/components/ui'
import { Timeline } from '@/components/incidents/timeline'
import { AssignGuardModal } from '@/components/dispatch/assign-guard-modal'
import { cn, severityTone } from '@/lib/utils'
import type { Alert, AlertSeverity, Profile, Site, Camera as CameraType } from '@/lib/types'

type FilterSeverity = 'All' | AlertSeverity

interface DispatcherQueueProps {
  alerts: Alert[]
  guards: Profile[]
  sites: Site[]
  cameras: CameraType[]
}

const severityBorderColor: Record<AlertSeverity, string> = {
  Critical: 'border-l-p-red',
  Warning: 'border-l-p-amber',
  Info: 'border-l-p-blue',
}

const statusTone = (s: string): 'red' | 'amber' | 'green' | 'blue' | 'gray' => {
  switch (s) {
    case 'New': return 'red'
    case 'Reviewing': return 'amber'
    case 'Escalated': return 'blue'
    case 'Closed': return 'green'
    default: return 'gray'
  }
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function DispatcherQueue({ alerts, guards, sites, cameras }: DispatcherQueueProps) {
  const [filter, setFilter] = useState<FilterSeverity>('All')
  const [selectedId, setSelectedId] = useState<string | null>(alerts[0]?.id ?? null)
  const [modalOpen, setModalOpen] = useState(false)

  const filtered = filter === 'All' ? alerts : alerts.filter((a) => a.severity === filter)
  const selected = alerts.find((a) => a.id === selectedId) ?? null
  const selectedSite = selected ? sites.find((s) => s.id === selected.site_id) : undefined
  const selectedCamera = selected?.camera_id
    ? cameras.find((c) => c.id === selected.camera_id)
    : undefined

  const filters: FilterSeverity[] = ['All', 'Critical', 'Warning', 'Info']

  const timelineEvents = selected
    ? [
        { time: formatTime(selected.created_at), label: 'Alert created', by: selected.source },
        ...(selected.status !== 'New'
          ? [{ time: formatTime(selected.created_at), label: `Status changed to ${selected.status}` }]
          : []),
      ]
    : []

  return (
    <>
      <div className="grid grid-cols-[380px_1fr] gap-0 h-full -m-6">
        {/* ── Left panel: alert list ── */}
        <div className="border-r border-border bg-bg flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="p-5 pb-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-1">
                <Label>Live queue</Label>
                <h2 className="font-serif text-xl font-semibold text-ink">
                  Alerts{' '}
                  <span className="text-ink-3 font-sans text-sm font-normal">
                    ({filtered.length})
                  </span>
                </h2>
              </div>
              <Button variant="primary" size="sm" icon={Bell}>
                Create alert
              </Button>
            </div>

            {/* Filter pills */}
            <div className="flex gap-1.5 mt-1">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-semibold font-sans transition-colors duration-100 cursor-pointer',
                    filter === f
                      ? 'bg-navy text-white'
                      : 'bg-surface text-ink-3 hover:bg-surface-subtle'
                  )}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Alert list */}
          <div className="flex-1 overflow-y-auto px-3 pb-3">
            <div className="flex flex-col gap-1">
              {filtered.map((alert) => {
                const isSelected = selectedId === alert.id
                const site = sites.find((s) => s.id === alert.site_id)
                const isCriticalNew = alert.severity === 'Critical' && alert.status === 'New'

                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => setSelectedId(alert.id)}
                    className={cn(
                      'flex flex-col gap-1.5 px-3.5 py-3 rounded-lg border-l-[3px] text-left transition-colors duration-100 cursor-pointer w-full',
                      isSelected
                        ? `bg-p-blue-softer ${severityBorderColor[alert.severity]}`
                        : 'bg-surface border-l-transparent hover:bg-surface-subtle'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-[13.5px] font-semibold text-ink leading-snug line-clamp-1">
                        {alert.title}
                      </span>
                      {isCriticalNew && <LiveDot color="red" />}
                    </div>
                    {site && (
                      <span className="text-[12px] text-ink-3 truncate">
                        {site.name}
                      </span>
                    )}
                    <div className="flex items-center gap-2">
                      <Pill tone={severityTone(alert.severity)} size="sm" dot>
                        {alert.severity}
                      </Pill>
                      <Pill tone={statusTone(alert.status)} size="sm">
                        {alert.status}
                      </Pill>
                      <span className="text-[11px] text-ink-4 ml-auto tabular-nums">
                        {formatTime(alert.created_at)}
                      </span>
                    </div>
                  </button>
                )
              })}
              {filtered.length === 0 && (
                <div className="text-center text-sm text-ink-3 py-12 font-sans">
                  No alerts match this filter.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel: alert detail ── */}
        <div className="flex flex-col h-full overflow-y-auto">
          {selected ? (
            <div className="p-6 flex flex-col gap-6 max-w-2xl">
              {/* Top row: pills + dismiss */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <Pill tone={severityTone(selected.severity)} dot>
                    {selected.severity}
                  </Pill>
                  <Pill tone={statusTone(selected.status)}>
                    {selected.status}
                  </Pill>
                </div>
                <div className="flex items-center gap-3 text-xs text-ink-3 font-sans">
                  <span>Source: {selected.source}</span>
                  <span className="text-ink-4">|</span>
                  <span className="tabular-nums">{formatTime(selected.created_at)}</span>
                  <Button variant="ghost" size="sm" icon={X}>
                    Dismiss
                  </Button>
                </div>
              </div>

              {/* Title */}
              <h1 className="font-serif text-[32px] font-semibold text-ink leading-tight">
                {selected.title}
              </h1>

              {/* Location */}
              <div className="flex items-center gap-4 text-sm font-sans">
                {selectedSite && (
                  <span className="flex items-center gap-1.5 text-ink-2">
                    <MapPin size={14} strokeWidth={2} className="text-ink-3" />
                    {selectedSite.name}
                  </span>
                )}
                {selectedCamera && (
                  <span className="flex items-center gap-1.5 text-ink-3">
                    <Camera size={14} strokeWidth={2} />
                    {selectedCamera.name}
                  </span>
                )}
              </div>

              {/* Description card */}
              <Card>
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-2">
                    <Label>Description</Label>
                    <p className="text-sm text-ink font-sans leading-relaxed">
                      {selected.description}
                    </p>
                  </div>
                  {timelineEvents.length > 0 && (
                    <div className="flex flex-col gap-2 pt-2 border-t border-border">
                      <Label>Timeline</Label>
                      <Timeline events={timelineEvents} />
                    </div>
                  )}
                </div>
              </Card>

              {/* Actions card */}
              <Card>
                <div className="flex flex-col gap-3">
                  <Label>Actions</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      icon={AlertTriangle}
                      onClick={() => setModalOpen(true)}
                    >
                      Convert to incident
                    </Button>
                    <Button variant="secondary" icon={ArrowUpRight}>
                      Escalate
                    </Button>
                    <Button variant="secondary" icon={Check}>
                      Close alert
                    </Button>
                  </div>
                </div>
              </Card>

              {/* Site context */}
              {selectedSite && (
                <Card>
                  <div className="flex flex-col gap-3">
                    <Label>Site context</Label>
                    <div className="flex flex-col gap-2">
                      <KV k="Risk level" v={<Pill tone={selectedSite.risk === 'High' ? 'red' : selectedSite.risk === 'Medium' ? 'amber' : 'green'} size="sm">{selectedSite.risk}</Pill>} />
                      <KV k="Site type" v={selectedSite.type} />
                      <KV k="Cameras" v={selectedSite.cameras ?? 0} />
                    </div>
                  </div>
                </Card>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-ink-3 font-sans text-sm">
              Select an alert to view details
            </div>
          )}
        </div>
      </div>

      {/* Assign guard modal */}
      <AssignGuardModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        alert={selected}
        guards={guards}
      />
    </>
  )
}
