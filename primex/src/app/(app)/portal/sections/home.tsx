'use client'

import { useState, useTransition } from 'react'
import {
  Shield,
  Camera,
  Bell,
  AlertTriangle,
  Phone,
  Download,
  CheckCircle2,
} from 'lucide-react'
import { PageTitle, Card, StatCard, Button, KV, getToneClasses, SectionHeader } from '@/components/ui'
import { severityTone } from '@/lib/utils'
import { DISPATCH_PHONE_DISPLAY, DISPATCH_PHONE_TEL } from '@/lib/support'
import { generateReportPdf } from '@/lib/data/actions/generate-report-pdf'
import { ReportIssueModal } from '../report-issue-modal'
import type { Camera as CameraType, Alert, Incident, Report } from '@/lib/types'

interface ClientHomeProps {
  siteId: string
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

export function ClientHome({ siteId, cameras, alerts, incidents, reports }: ClientHomeProps) {
  const [reportOpen, setReportOpen] = useState(false)
  const [downloading, startDownload] = useTransition()
  const [downloadError, setDownloadError] = useState(false)

  const latestReport = reports[0] ?? null

  function handleCallDispatch() {
    window.location.href = `tel:${DISPATCH_PHONE_TEL}`
  }

  function handleDownloadReport() {
    if (!latestReport) return
    setDownloadError(false)
    startDownload(async () => {
      try {
        const dataUri = await generateReportPdf({ reportId: latestReport.id })
        const link = document.createElement('a')
        link.href = dataUri
        link.download = `${latestReport.name.replace(/\s+/g, '-').toLowerCase()}.pdf`
        link.click()
      } catch (err) {
        console.error('PDF generation failed:', err)
        setDownloadError(true)
      }
    })
  }

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
          <div className="mb-4">
            <SectionHeader title="What happened recently" />
          </div>
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
                    getToneClasses(event.tone).bg
                  } ${getToneClasses(event.tone).fg}`}
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
            <div className="mb-3">
              <SectionHeader title="Need help?" />
            </div>
            <p className="text-sm text-ink-3 font-sans mb-4">
              Our dispatch team is available around the clock at{' '}
              <span className="text-ink font-medium whitespace-nowrap">
                {DISPATCH_PHONE_DISPLAY}
              </span>
              .
            </p>
            <div className="flex flex-col gap-2">
              <Button variant="primary" icon={Phone} full onClick={handleCallDispatch}>
                Call dispatch
              </Button>
              <Button
                variant="secondary"
                icon={AlertTriangle}
                full
                onClick={() => setReportOpen(true)}
              >
                Report an issue
              </Button>
            </div>
          </Card>

          {/* This month card */}
          <Card>
            <div className="mb-3">
              <SectionHeader title="This month" />
            </div>
            <div className="flex flex-col gap-2.5">
              <KV k="Alerts" v={monthlyAlerts} />
              <KV k="Incidents" v={monthlyIncidents} />
              <KV k="Reports" v={reports.length} />
            </div>
            <div className="mt-4 pt-3 border-t border-border">
              {latestReport ? (
                <Button
                  variant="link"
                  icon={Download}
                  size="sm"
                  onClick={handleDownloadReport}
                  disabled={downloading}
                >
                  {downloading ? 'Preparing…' : 'Download monthly report'}
                </Button>
              ) : (
                <p className="text-xs text-ink-3 font-sans">
                  No report available to download yet.
                </p>
              )}
              {downloadError && (
                <p className="text-xs text-p-red font-sans mt-1.5">
                  Couldn&apos;t generate the report. Please try again.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      <ReportIssueModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        siteId={siteId}
      />
    </div>
  )
}
