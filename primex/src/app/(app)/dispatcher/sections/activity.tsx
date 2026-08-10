'use client'

import { useState } from 'react'
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
import { PageTitle, Card, getToneClasses, Pagination } from '@/components/ui'
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

function formatTimestamp(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-AU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

const PAGE_SIZE = 20

export function DispatcherActivity({ activity }: DispatcherActivityProps) {
  const [page, setPage] = useState(1)
  const paginatedActivity = activity.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  return (
    <div className="flex flex-col gap-6">
      <PageTitle
        title="Activity log"
        sub="Recent dispatcher and system activity"
      />

      <Card padding="p-0">
        <div className="divide-y divide-border">
          {paginatedActivity.length === 0 ? (
            <div className="text-center text-sm text-ink-3 py-12 font-sans">
              No recent activity.
            </div>
          ) : (
            paginatedActivity.map((item) => {
              const Icon = iconMap[item.icon] ?? Bell
              const { fg, bg } = getToneClasses(item.tone)

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 px-5 py-3.5"
                >
                  {/* Icon */}
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}
                  >
                    <Icon size={15} strokeWidth={2} className={fg} />
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

        {activity.length > 0 && (
          <div className="px-5 py-3 border-t border-border">
            <Pagination page={page} pageSize={PAGE_SIZE} total={activity.length} onPageChange={setPage} itemLabel="events" />
          </div>
        )}
      </Card>
    </div>
  )
}
