'use client'

import {
  Bell,
  AlertTriangle,
  UserCheck,
  Shield,
  Camera,
  MapPin,
  Settings,
  Eye,
} from 'lucide-react'
import { PageTitle, Card } from '@/components/ui'
import type { ActivityItem } from '@/lib/types'

interface DispatcherActivityProps {
  activity: ActivityItem[]
}

const iconMap: Record<string, React.ElementType> = {
  bell: Bell,
  alert: AlertTriangle,
  'user-check': UserCheck,
  shield: Shield,
  camera: Camera,
  'map-pin': MapPin,
  settings: Settings,
  eye: Eye,
}

const toneBg: Record<string, string> = {
  red: 'bg-p-red-soft text-p-red',
  amber: 'bg-p-amber-soft text-p-amber',
  green: 'bg-p-green-soft text-p-green',
  blue: 'bg-p-blue-soft text-p-blue',
  gray: 'bg-p-gray-soft text-p-gray',
}

function formatTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function DispatcherActivity({ activity }: DispatcherActivityProps) {
  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Activity log"
        sub="Recent dispatcher and system activity"
      />

      <Card padding="p-0">
        <div className="divide-y divide-border">
          {activity.length === 0 ? (
            <div className="text-center text-sm text-ink-3 py-12 font-sans">
              No recent activity.
            </div>
          ) : (
            activity.map((item) => {
              const Icon = iconMap[item.icon] ?? Bell
              const toneClass = toneBg[item.tone] ?? toneBg.gray

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  {/* Icon */}
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${toneClass}`}
                  >
                    <Icon size={15} strokeWidth={2} />
                  </span>

                  {/* Content */}
                  <div className="flex flex-col gap-0.5 flex-1 min-w-0 font-sans">
                    <span className="text-sm text-ink">
                      <span className="font-semibold">{item.who}</span>
                      <span className="text-ink-3"> · </span>
                      <span>{item.action}</span>
                      <span className="text-ink-3"> · </span>
                      <span className="font-medium">{item.target}</span>
                    </span>
                  </div>

                  {/* Timestamp */}
                  <span className="text-xs text-ink-4 tabular-nums flex-shrink-0 font-sans">
                    {formatTimestamp(item.created_at)}
                  </span>
                </div>
              )
            })
          )}
        </div>
      </Card>
    </div>
  )
}
