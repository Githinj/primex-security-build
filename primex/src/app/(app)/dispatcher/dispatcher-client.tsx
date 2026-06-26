'use client'

import { useState } from 'react'
import {
  Bell,
  AlertTriangle,
  Radio,
  Users,
  ClipboardList,
} from 'lucide-react'
import { LiveDot } from '@/components/ui'
import { cn } from '@/lib/utils'
import { DispatcherQueue } from './sections/queue'
import { OpenIncidents } from './sections/incidents'
import { DispatchBoard } from './sections/dispatch'
import { GuardsOnDuty } from './sections/guards'
import { DispatcherActivity } from './sections/activity'
import type { Alert, Incident, Profile, Site, Camera, ActivityItem } from '@/lib/types'

type Section = 'queue' | 'incidents' | 'dispatch' | 'guards' | 'activity'

interface NavItem {
  key: Section
  label: string
  icon: React.ElementType
  count?: number
  live?: boolean
}

interface DispatcherClientProps {
  alerts: Alert[]
  incidents: Incident[]
  guards: Profile[]
  sites: Site[]
  cameras: Camera[]
  activity: ActivityItem[]
}

export function DispatcherClient({
  alerts,
  incidents,
  guards,
  sites,
  cameras,
  activity,
}: DispatcherClientProps) {
  const [section, setSection] = useState<Section>('queue')

  const newAlertCount = alerts.filter((a) => a.status === 'New').length
  const openIncidentCount = incidents.filter(
    (i) => i.status !== 'Resolved' && i.status !== 'Closed'
  ).length

  const navItems: NavItem[] = [
    { key: 'queue', label: 'Alert queue', icon: Bell, count: newAlertCount, live: newAlertCount > 0 },
    { key: 'incidents', label: 'Incidents', icon: AlertTriangle, count: openIncidentCount },
    { key: 'dispatch', label: 'Dispatch board', icon: Radio },
    { key: 'guards', label: 'Guards on duty', icon: Users, count: guards.filter((g) => g.guard_status !== 'Off-duty').length },
    { key: 'activity', label: 'Activity log', icon: ClipboardList },
  ]

  return (
    <div className="flex h-full">
      {/* Dispatcher nav panel */}
      <nav className="w-60 flex-shrink-0 bg-surface border-r border-border p-4 flex flex-col gap-1">
        <span className="text-[10px] font-semibold uppercase text-ink-4 font-sans tracking-widest px-3 pb-2">
          Dispatcher Console
        </span>
        {navItems.map((item) => {
          const isActive = section === item.key
          const Icon = item.icon
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setSection(item.key)}
              className={cn(
                'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-sans transition-colors duration-150 cursor-pointer w-full text-left',
                isActive
                  ? 'bg-p-blue-soft text-p-blue font-semibold'
                  : 'text-ink-2 hover:bg-surface-subtle hover:text-ink font-medium'
              )}
            >
              <Icon
                size={15}
                strokeWidth={2}
                className={isActive ? 'text-p-blue' : 'text-ink-3'}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.live && <LiveDot color="red" />}
              {item.count !== undefined && (
                <span
                  className={cn(
                    'text-[11px] font-semibold px-1.5 py-0.5 rounded-full leading-none',
                    isActive
                      ? 'bg-p-blue text-white'
                      : 'bg-surface-subtle text-ink-3'
                  )}
                >
                  {item.count}
                </span>
              )}
            </button>
          )
        })}
      </nav>

      {/* Main content area */}
      <div className="flex-1 min-w-0 overflow-auto p-6">
        {section === 'queue' && (
          <DispatcherQueue
            alerts={alerts}
            guards={guards}
            sites={sites}
            cameras={cameras}
          />
        )}
        {section === 'incidents' && (
          <OpenIncidents
            incidents={incidents}
            sites={sites}
            guards={guards}
          />
        )}
        {section === 'dispatch' && (
          <DispatchBoard
            incidents={incidents}
            sites={sites}
            guards={guards}
          />
        )}
        {section === 'guards' && (
          <GuardsOnDuty
            guards={guards}
            incidents={incidents}
          />
        )}
        {section === 'activity' && (
          <DispatcherActivity activity={activity} />
        )}
      </div>
    </div>
  )
}
