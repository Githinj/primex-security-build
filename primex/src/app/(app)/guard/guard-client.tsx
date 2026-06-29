'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button, Pill, Label, LiveDot } from '@/components/ui'
import { severityTone } from '@/lib/utils'
import { updateIncidentStatus } from '@/lib/data/actions/incidents'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'
import type { Incident, Site, Profile } from '@/lib/types'
import {
  MapPin,
  ArrowLeft,
  Check,
  Navigation,
  CheckCircle2,
  Upload,
  Phone,
  LogOut,
} from 'lucide-react'

type GuardStatus = 'assigned' | 'accepted' | 'enroute' | 'arrived' | 'resolved'

function mapIncidentStatusToGuard(status: string): GuardStatus {
  switch (status) {
    case 'Dispatched':
      return 'assigned'
    case 'In Progress':
      return 'accepted'
    case 'Resolved':
      return 'resolved'
    default:
      return 'assigned'
  }
}

function guardStatusToIncidentStatus(gs: GuardStatus): string {
  switch (gs) {
    case 'assigned':
      return 'Dispatched'
    case 'accepted':
    case 'enroute':
    case 'arrived':
      return 'In Progress'
    case 'resolved':
      return 'Resolved'
  }
}

function statusTone(s: GuardStatus): 'amber' | 'blue' | 'green' {
  switch (s) {
    case 'assigned':
      return 'amber'
    case 'accepted':
    case 'enroute':
    case 'arrived':
      return 'blue'
    case 'resolved':
      return 'green'
  }
}

function statusLabel(s: GuardStatus): string {
  switch (s) {
    case 'assigned':
      return 'Assigned'
    case 'accepted':
      return 'Accepted'
    case 'enroute':
      return 'En Route'
    case 'arrived':
      return 'Arrived'
    case 'resolved':
      return 'Resolved'
  }
}

const nextStep: Record<
  Exclude<GuardStatus, 'resolved'>,
  { label: string; icon: typeof Check; next: GuardStatus }
> = {
  assigned: { label: 'Accept dispatch', icon: Check, next: 'accepted' },
  accepted: { label: 'Mark en route', icon: Navigation, next: 'enroute' },
  enroute: { label: 'Check in (arrived)', icon: MapPin, next: 'arrived' },
  arrived: { label: 'Mark resolved', icon: CheckCircle2, next: 'resolved' },
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function formatDate() {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

interface Props {
  profile: Profile
  incidents: Incident[]
  sites: Site[]
}

export function GuardClient({ profile, incidents, sites }: Props) {
  const router = useRouter()
  const [view, setView] = useState<'list' | 'detail'>('list')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [status, setStatus] = useState<GuardStatus>('assigned')
  const [isPending, startTransition] = useTransition()
  const [resolvedTime, setResolvedTime] = useState<string | null>(null)

  async function handleLogout() {
    const supabase = createBrowserSupabaseClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const siteMap = new Map(sites.map((s) => [s.id, s]))
  const firstName = profile.full_name?.split(' ')[0] ?? 'Guard'

  function openDetail(incident: Incident) {
    setSelectedIncident(incident)
    setStatus(mapIncidentStatusToGuard(incident.status))
    setResolvedTime(null)
    setView('detail')
  }

  function goBack() {
    setView('list')
    setSelectedIncident(null)
  }

  function advanceStatus() {
    if (!selectedIncident || status === 'resolved') return
    const step = nextStep[status]
    const newStatus = step.next
    const incidentStatus = guardStatusToIncidentStatus(newStatus)

    startTransition(async () => {
      await updateIncidentStatus(selectedIncident.id, incidentStatus)
      setStatus(newStatus)
      if (newStatus === 'resolved') {
        setResolvedTime(
          new Date().toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          })
        )
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-bg overflow-auto">
      <div className="mx-auto max-w-[400px] px-5 py-6 min-h-full">
        {view === 'list' ? (
          <ListView
            firstName={firstName}
            incidents={incidents}
            siteMap={siteMap}
            onOpen={openDetail}
            onLogout={handleLogout}
          />
        ) : selectedIncident ? (
          <DetailView
            incident={selectedIncident}
            site={siteMap.get(selectedIncident.site_id) ?? null}
            status={status}
            isPending={isPending}
            resolvedTime={resolvedTime}
            onBack={goBack}
            onAdvance={advanceStatus}
          />
        ) : null}
      </div>
    </div>
  )
}

/* ---------- List View ---------- */

function ListView({
  firstName,
  incidents,
  siteMap,
  onOpen,
  onLogout,
}: {
  firstName: string
  incidents: Incident[]
  siteMap: Map<string, Site>
  onOpen: (i: Incident) => void
  onLogout: () => void
}) {
  return (
    <>
      {/* Date header + logout */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] text-ink-4 uppercase tracking-[0.12em] font-sans">
          {formatDate()}
        </p>
        <Button variant="ghost" size="sm" icon={LogOut} onClick={onLogout}>
          Log out
        </Button>
      </div>

      {/* Greeting */}
      <h1 className="font-serif text-[26px] font-bold text-ink leading-tight mb-6">
        Hi {firstName}
        <span className="font-serif text-[26px] italic font-normal text-ink-3">
          {' '}
          &middot; {incidents.length} assignment{incidents.length !== 1 ? 's' : ''}
        </span>
      </h1>

      {/* Incident cards */}
      <div className="flex flex-col gap-3">
        {incidents.map((incident, idx) => {
          const site = siteMap.get(incident.site_id)
          const tone = severityTone(incident.severity)
          return (
            <button
              key={incident.id}
              onClick={() => onOpen(incident)}
              className="text-left w-full border border-border rounded-xl p-4 bg-surface transition-colors hover:bg-surface-subtle"
              style={idx > 0 ? { opacity: 0.65 } : undefined}
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-2">
                <Pill tone={tone} size="sm" dot>
                  {incident.severity}
                </Pill>
                {incident.severity === 'Critical' && <LiveDot color="red" />}
              </div>

              {/* Title */}
              <p className="font-serif text-[18px] font-bold text-ink leading-snug mb-1">
                {incident.title}
              </p>

              {/* Site */}
              {site && (
                <p className="flex items-center gap-1 text-[12px] text-ink-3 font-sans mb-3">
                  <MapPin size={12} strokeWidth={2} />
                  {site.name}
                </p>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-border pt-3">
                <span className="text-[11px] text-ink-3 font-sans">
                  Dispatched {formatTime(incident.started_at)}
                </span>
                <span className="text-[12px] text-p-blue font-medium font-sans">
                  Open &gt;
                </span>
              </div>
            </button>
          )
        })}

        {incidents.length === 0 && (
          <p className="text-sm text-ink-3 font-sans text-center py-10">
            No active assignments.
          </p>
        )}
      </div>
    </>
  )
}

/* ---------- Detail View ---------- */

function DetailView({
  incident,
  site,
  status,
  isPending,
  resolvedTime,
  onBack,
  onAdvance,
}: {
  incident: Incident
  site: Site | null
  status: GuardStatus
  isPending: boolean
  resolvedTime: string | null
  onBack: () => void
  onAdvance: () => void
}) {
  const tone = severityTone(incident.severity)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [attachedFile, setAttachedFile] = useState<string | null>(null)

  if (status === 'resolved') {
    return (
      <>
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[12.5px] text-ink-2 font-sans mb-5 cursor-pointer hover:text-ink transition-colors"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Back
        </button>

        <div className="bg-p-green-soft rounded-xl p-[22px] text-center">
          <CheckCircle2
            size={28}
            strokeWidth={2}
            className="text-p-green mx-auto mb-2"
          />
          <p className="font-serif text-[22px] font-bold text-ink mb-1">
            Incident resolved.
          </p>
          <p className="text-[12.5px] text-ink-3 font-sans">
            Dispatcher notified. Logged at {resolvedTime ?? formatTime(new Date().toISOString())}.
          </p>
        </div>
      </>
    )
  }

  const step = nextStep[status]
  const StepIcon = step.icon

  return (
    <>
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-[12.5px] text-ink-2 font-sans mb-5 cursor-pointer hover:text-ink transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back
      </button>

      {/* Severity pill */}
      <div className="mb-2">
        <Pill tone={tone} size="sm" dot>
          {incident.severity}
        </Pill>
      </div>

      {/* Title */}
      <h2 className="font-serif text-[22px] font-bold text-ink leading-tight mb-5">
        {incident.title}
      </h2>

      {/* Your status card */}
      <div className="border border-border rounded-xl p-4 bg-surface mb-3">
        <Label>Your status</Label>
        <div className="mt-2">
          <Pill tone={statusTone(status)} size="md" dot>
            {statusLabel(status)}
          </Pill>
        </div>
      </div>

      {/* Site card */}
      {site && (
        <div className="border border-border rounded-xl p-4 bg-surface mb-3">
          <div className="flex items-start gap-2 mb-3">
            <MapPin size={16} strokeWidth={2} className="text-ink-3 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-[13.5px] font-semibold text-ink font-sans">
                {site.name}
              </p>
              <p className="text-[11.5px] text-ink-3 font-sans mt-0.5">
                {site.address}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              icon={Navigation}
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(site.address)}`, '_blank')}
            >
              Directions
            </Button>
            <Button
              variant="secondary"
              size="sm"
              icon={Phone}
              onClick={() => window.open(`tel:000`, '_self')}
            >
              Call site
            </Button>
          </div>
        </div>
      )}

      {/* Dispatcher notes */}
      {incident.notes && (
        <div className="border border-border rounded-xl p-4 bg-surface mb-3">
          <Label>Dispatcher notes</Label>
          <p className="text-sm text-ink font-sans mt-2 leading-relaxed">
            {incident.notes}
          </p>
        </div>
      )}

      {/* Your notes */}
      <div className="border border-border rounded-xl p-4 bg-surface mb-5">
        <Label>Your notes</Label>
        <textarea
          placeholder="Add notes..."
          className="w-full mt-2 px-3 py-2 text-sm font-sans bg-surface text-ink border border-border rounded-lg placeholder:text-ink-4 outline-none focus:border-p-blue transition-colors duration-150 min-h-[70px] resize-y"
        />
        <div className="mt-2 flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) setAttachedFile(file.name)
            }}
          />
          <Button variant="secondary" size="sm" icon={Upload} onClick={() => fileInputRef.current?.click()}>
            Attach photo
          </Button>
          {attachedFile && (
            <span className="text-xs text-ink-3 font-sans truncate max-w-[150px]">{attachedFile}</span>
          )}
        </div>
      </div>

      {/* Primary action button */}
      <Button
        variant="primary"
        size="lg"
        full
        icon={StepIcon}
        onClick={onAdvance}
        disabled={isPending}
      >
        {isPending ? 'Updating...' : step.label}
      </Button>
    </>
  )
}
