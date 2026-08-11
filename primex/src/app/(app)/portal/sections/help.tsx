'use client'

import { useState } from 'react'
import { Phone, AlertTriangle, Mail, Plus } from 'lucide-react'
import { PageTitle, Card, Button, SectionHeader } from '@/components/ui'
import { DISPATCH_PHONE_DISPLAY, DISPATCH_PHONE_TEL, SUPPORT_EMAIL } from '@/lib/support'
import { ReportIssueModal } from '../report-issue-modal'

export function ClientHelp({ siteId }: { siteId: string }) {
  const [reportOpen, setReportOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      <PageTitle
        title="Get help"
        sub="We're here whenever you need us."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Call dispatch */}
        <Card>
          <div className="flex flex-col gap-4">
            <div className="w-11 h-11 rounded-full bg-p-blue-soft flex items-center justify-center">
              <Phone size={20} className="text-p-blue" strokeWidth={2} />
            </div>
            <div>
              <SectionHeader title="Call dispatch" />
              <p className="text-sm text-ink-3 font-sans mt-1">
                Speak directly with our 24/7 dispatch team for urgent matters.
              </p>
            </div>
            <p className="font-serif text-2xl font-semibold text-ink">
              {DISPATCH_PHONE_DISPLAY}
            </p>
            <Button
              variant="primary"
              icon={Phone}
              onClick={() => { window.location.href = `tel:${DISPATCH_PHONE_TEL}` }}
            >
              Call now
            </Button>
          </div>
        </Card>

        {/* Report an incident */}
        <Card>
          <div className="flex flex-col gap-4">
            <div className="w-11 h-11 rounded-full bg-p-amber-soft flex items-center justify-center">
              <AlertTriangle size={20} className="text-p-amber" strokeWidth={2} />
            </div>
            <div>
              <SectionHeader title="Report an incident" />
              <p className="text-sm text-ink-3 font-sans mt-1">
                Let us know about something suspicious or an issue at your location.
              </p>
            </div>
            <Button variant="secondary" icon={Plus} onClick={() => setReportOpen(true)}>
              New incident report
            </Button>
          </div>
        </Card>

        {/* Email support */}
        <Card>
          <div className="flex flex-col gap-4">
            <div className="w-11 h-11 rounded-full bg-p-gray-soft flex items-center justify-center">
              <Mail size={20} className="text-p-gray" strokeWidth={2} />
            </div>
            <div>
              <SectionHeader title="Email support" />
              <p className="text-sm text-ink-3 font-sans mt-1">
                Send us a message and we&apos;ll get back to you within 24 hours.
              </p>
            </div>
            <Button
              variant="secondary"
              icon={Mail}
              onClick={() => { window.location.href = `mailto:${SUPPORT_EMAIL}` }}
            >
              {SUPPORT_EMAIL}
            </Button>
          </div>
        </Card>
      </div>

      <ReportIssueModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        siteId={siteId}
      />
    </div>
  )
}
