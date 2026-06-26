'use client'

import {
  Shield,
  Camera,
  Bell,
  AlertTriangle,
  Phone,
  Download,
  CheckCircle2,
} from 'lucide-react'
import { PageTitle, Card, StatCard, Button, KV } from '@/components/ui'
import { severityTone } from '@/lib/utils'
import type { Camera as CameraType, Alert, Incident, Report } from '@/lib/types'

interface ClientHomeProps {
  cameras: CameraType[]
  alerts: Alert[]
  incidents: Incident[]
  reports: Report[]
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'Just now'
  if (diffMin < 60) return `${diffMin}m ago`
  const diffH = Math.floor(diffMin / 60)
  if (diffH < 24) return `${diffH}h ago`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d ago`
}

export function ClientHome({ cameras, alerts, incidents, reports }: ClientHomeProps) {
  const camerasOnline = cameras.filter((c) => c.status === 'Online').length
  const totalCameras = cameras.length

  const today = new Date().toISOString().slice(0, 10)
  const alertsToday = alerts.filter(
    (a) => a.created_at.slice(0, 10) === today
  ).length

  const activeIncidents = incidents.filter(
    (i) => i.status === 'Open' || i.status === 'In Progress' || i.status === 'Dispatched'
  )

  const isSecure = activeIncidents.length === 0

  // Build recent events from alerts and incidents
  const recentEvents: {
    id: string
    title: string
    description: string
    time: string
    tone: 'red' | 'amber' | 'green' | 'blue' | 'gray'
  }[] = []

  alerts.slice(0, 5).forEach((a) => {
    recentEvents.push({
      id: `alert-${a.id}`,
      title: a.title,
      description: a.description,
      time: a.created_at,
      tone: severityTone(a.severity),
    })
  })

  incidents.slice(0, 5).forEach((i) => {
    const tone =
      i.status === 'Resolved' || i.status === 'Closed'
        ? 'green'
        : i.status === 'In Progress' || i.status === 'Dispatched'
          ? 'amber'
          : 'gray'
    recentEvents.push({
      id: `incident-${i.id}`,
      title: i.title,
      description: i.notes ?? 'No details available.',
      time: i.started_at,
      tone,
    })
  })

  // Sort by time desc, take top 6
  recentEvents.sort(
    (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
  )
  const displayEvents = recentEvents.slice(0, 6)

  // Monthly stats
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthlyAlerts = alerts.filter(
    (a) => a.created_at.slice(0, 7) === thisMonth
  ).length
  const monthlyIncidents = incidents.filter(
    (i) => i.started_at.slice(0, 7) === thisMonth
  ).length

  const toneCircleColors: Record<string, string> = {
    red: 'bg-p-red-soft text-p-red',
    amber: 'bg-p-amber-soft text-p-amber',
    green: 'bg-p-green-soft text-p-green',
    blue: 'bg-p-blue-soft text-p-blue',
    gray: 'bg-p-gray-soft text-p-gray',
  }

  return (
    <div className="flex flex-col gap-8 max-w-[1200px]">
      <PageTitle
        title="Your business at a glance"
        sub="A simple view of what's happening at your store."
      />

      {/* Status banner */}
      <Card className="flex items-center gap-6">
        <div
          className={`w-[72px] h-[72px] rounded-full flex items-center justify-center flex-shrink-0 ${
            isSecure ? 'bg-p-green-soft' : 'bg-p-amber-soft'
          }`}
        >
          <Shield
            size={32}
            className={isSecure ? 'text-p-green' : 'text-p-amber'}
            strokeWidth={2}
          />
        </div>
        <div className="flex flex-col gap-1">
          <h2 className="font-serif text-2xl font-semibold text-ink">
            {isSecure ? 'Your store is secure.' : 'Your store needs attention.'}
          </h2>
          <p className="text-sm text-ink-3 font-sans">
            {camerasOnline} of {totalCameras} cameras online
            {activeIncidents.length > 0 &&
              ` \u00B7 ${activeIncidents.length} active incident${
                activeIncidents.length !== 1 ? 's' : ''
              }`}
            {activeIncidents.length === 0 && ' \u00B7 No active incidents'}
          </p>
        </div>
      </Card>

      {/* 3 stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          label="Cameras"
          value={`${camerasOnline} / ${totalCameras}`}
          icon={Camera}
          supporting={
            <span className="text-xs text-ink-3 font-sans">
              {camerasOnline === totalCameras
                ? 'All cameras are working normally'
                : `${totalCameras - camerasOnline} camera${
                    totalCameras - camerasOnline !== 1 ? 's' : ''
                  } offline`}
            </span>
          }
        />
        <StatCard
          label="Alerts today"
          value={alertsToday}
          icon={Bell}
          supporting={
            <span className="text-xs text-ink-3 font-sans">
              Notifications from your security system
            </span>
          }
        />
        <StatCard
          label="Active incidents"
          value={activeIncidents.length}
          icon={AlertTriangle}
          accent={activeIncidents.length > 0 ? 'text-p-amber' : undefined}
          supporting={
            <span className="text-xs text-ink-3 font-sans">
              {activeIncidents.length === 0
                ? 'Everything looks good'
                : 'Being handled by our team'}
            </span>
          }
        />
      </div>

      {/* 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6">
        {/* Left: Recent events */}
        <Card>
          <h3 className="font-serif text-lg font-semibold text-ink mb-4">
            What happened recently
          </h3>
          <div className="flex flex-col gap-4">
            {displayEvents.length === 0 && (
              <p className="text-sm text-ink-3 font-sans py-4">
                No recent events to show.
              </p>
            )}
            {displayEvents.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                    toneCircleColors[event.tone] ?? toneCircleColors.gray
                  }`}
                >
                  {event.tone === 'green' ? (
                    <CheckCircle2 size={16} strokeWidth={2} />
                  ) : event.tone === 'red' ? (
                    <AlertTriangle size={16} strokeWidth={2} />
                  ) : (
                    <Bell size={16} strokeWidth={2} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-ink font-medium font-sans">
                    {event.title}
                  </p>
                  <p className="text-[13px] text-ink-3 font-sans mt-0.5 line-clamp-2">
                    {event.description}
                  </p>
                </div>
                <span className="text-[11px] text-ink-3 font-sans flex-shrink-0 pt-0.5">
                  {formatTime(event.time)}
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          {/* Need help card */}
          <Card>
            <h3 className="font-serif text-lg font-semibold text-ink mb-3">
              Need help?
            </h3>
            <p className="text-sm text-ink-3 font-sans mb-4">
              Our dispatch team is available around the clock.
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="primary" icon={Phone} full>
                Call dispatch
              </Button>
              <Button variant="secondary" icon={AlertTriangle} full>
                Report an issue
              </Button>
            </div>
          </Card>

          {/* This month card */}
          <Card>
            <h3 className="font-serif text-lg font-semibold text-ink mb-3">
              This month
            </h3>
            <div className="flex flex-col gap-2.5">
              <KV k="Alerts" v={monthlyAlerts} />
              <KV k="Incidents" v={monthlyIncidents} />
              <KV k="Reports" v={reports.length} />
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              <Button variant="link" icon={Download} size="sm">
                Download monthly report
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
