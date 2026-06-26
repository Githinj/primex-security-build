'use client'

import { useState } from 'react'
import {
  Home,
  Bell,
  AlertTriangle,
  FileText,
  HelpCircle,
  Shield,
} from 'lucide-react'
import type { Profile, Site, Camera, Alert, Incident, Report } from '@/lib/types'
import { ClientHome } from './sections/home'
import { ClientAlerts } from './sections/alerts'
import { ClientIncidents } from './sections/incidents'
import { ClientReports } from './sections/reports'
import { ClientHelp } from './sections/help'

type Section = 'home' | 'alerts' | 'incidents' | 'reports' | 'help'

interface PortalClientProps {
  profile: Profile
  site: Site
  cameras: Camera[]
  alerts: Alert[]
  incidents: Incident[]
  reports: Report[]
}

const navItems: { key: Section; label: string; icon: typeof Home }[] = [
  { key: 'home', label: 'My business', icon: Home },
  { key: 'alerts', label: 'Recent alerts', icon: Bell },
  { key: 'incidents', label: 'Incident log', icon: AlertTriangle },
  { key: 'reports', label: 'My reports', icon: FileText },
  { key: 'help', label: 'Get help', icon: HelpCircle },
]

export function PortalClient({
  profile,
  site,
  cameras,
  alerts,
  incidents,
  reports,
}: PortalClientProps) {
  const [section, setSection] = useState<Section>('home')

  const activeAlertCount = alerts.filter(
    (a) => a.status === 'New' || a.status === 'Reviewing'
  ).length

  return (
    <div className="flex h-full min-h-0">
      {/* Left nav */}
      <aside className="w-[240px] flex-shrink-0 bg-surface border-r border-border flex flex-col">
        {/* Logo area */}
        <div className="px-5 pt-6 pb-5 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-navy flex items-center justify-center">
            <Shield size={16} className="text-white" strokeWidth={2} />
          </div>
          <div>
            <p className="font-serif text-base font-semibold text-ink leading-tight">
              Primex
            </p>
            <p className="text-[10px] text-ink-3 tracking-wider uppercase font-sans">
              Security System
            </p>
          </div>
        </div>

        {/* Organization */}
        <div className="px-5 pb-3">
          <p className="text-[10px] text-ink-3 font-semibold tracking-widest uppercase font-sans mb-2">
            Organization
          </p>
          <p className="text-sm text-ink font-medium font-sans truncate">
            {site.name}
          </p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-2 flex flex-col gap-0.5">
          {navItems.map(({ key, label, icon: Icon }) => {
            const active = section === key
            return (
              <button
                key={key}
                onClick={() => setSection(key)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans transition-colors duration-100 cursor-pointer w-full text-left ${
                  active
                    ? 'bg-p-blue-softer text-p-blue font-medium'
                    : 'text-ink-2 hover:bg-surface-subtle'
                }`}
              >
                <Icon size={16} strokeWidth={2} />
                <span className="flex-1">{label}</span>
                {key === 'alerts' && activeAlertCount > 0 && (
                  <span className="min-w-[18px] h-[18px] rounded-full bg-p-red text-white text-[10px] font-semibold flex items-center justify-center px-1">
                    {activeAlertCount}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        {/* User info card */}
        <div className="px-4 pb-5 mt-auto">
          <div className="bg-bg rounded-lg p-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-navy flex items-center justify-center text-white text-xs font-semibold font-sans flex-shrink-0">
              {profile.full_name
                .split(' ')
                .map((n) => n[0])
                .join('')
                .slice(0, 2)}
            </div>
            <div className="min-w-0">
              <p className="text-sm text-ink font-medium font-sans truncate">
                {profile.full_name}
              </p>
              <p className="text-[11px] text-ink-3 font-sans">Business Owner</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-auto bg-bg p-8">
        {section === 'home' && (
          <ClientHome
            cameras={cameras}
            alerts={alerts}
            incidents={incidents}
            reports={reports}
          />
        )}
        {section === 'alerts' && <ClientAlerts alerts={alerts} />}
        {section === 'incidents' && <ClientIncidents incidents={incidents} />}
        {section === 'reports' && <ClientReports reports={reports} />}
        {section === 'help' && <ClientHelp />}
      </main>
    </div>
  )
}
