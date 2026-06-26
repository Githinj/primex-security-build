'use client'

import {
  Phone,
  AlertTriangle,
  BookOpen,
  Mail,
  Plus,
  ExternalLink,
} from 'lucide-react'
import { PageTitle, Card, Button } from '@/components/ui'

export function ClientHelp() {
  return (
    <div className="flex flex-col gap-6 max-w-[900px]">
      <PageTitle
        title="Get help"
        sub="We're here whenever you need us."
      />

      <div className="grid grid-cols-2 gap-4">
        {/* Call dispatch */}
        <Card>
          <div className="flex flex-col gap-4">
            <div className="w-11 h-11 rounded-full bg-p-blue-soft flex items-center justify-center">
              <Phone size={20} className="text-p-blue" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-serif text-[22px] font-semibold text-ink leading-snug">
                Call dispatch
              </h3>
              <p className="text-sm text-ink-3 font-sans mt-1">
                Speak directly with our 24/7 dispatch team for urgent matters.
              </p>
            </div>
            <p className="font-serif text-2xl font-semibold text-ink">
              1-800-PRIMEX-1
            </p>
            <Button variant="primary" icon={Phone}>
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
              <h3 className="font-serif text-[22px] font-semibold text-ink leading-snug">
                Report an incident
              </h3>
              <p className="text-sm text-ink-3 font-sans mt-1">
                Let us know about something suspicious or an issue at your location.
              </p>
            </div>
            <Button variant="secondary" icon={Plus}>
              New incident report
            </Button>
          </div>
        </Card>

        {/* Help center */}
        <Card>
          <div className="flex flex-col gap-4">
            <div className="w-11 h-11 rounded-full bg-p-green-soft flex items-center justify-center">
              <BookOpen size={20} className="text-p-green" strokeWidth={2} />
            </div>
            <div>
              <h3 className="font-serif text-[22px] font-semibold text-ink leading-snug">
                Help center
              </h3>
              <p className="text-sm text-ink-3 font-sans mt-1">
                Browse guides, FAQs, and tutorials about your security system.
              </p>
            </div>
            <Button variant="secondary" icon={ExternalLink}>
              Open help center
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
              <h3 className="font-serif text-[22px] font-semibold text-ink leading-snug">
                Email support
              </h3>
              <p className="text-sm text-ink-3 font-sans mt-1">
                Send us a message and we'll get back to you within 24 hours.
              </p>
            </div>
            <Button variant="secondary" icon={Mail}>
              support@primex.com
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}
