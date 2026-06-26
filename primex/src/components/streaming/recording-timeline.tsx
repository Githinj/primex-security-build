'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Radio } from 'lucide-react'
import type { Recording } from '@/lib/types'

type TimeWindow = '1h' | '6h' | '12h' | '24h'

const WINDOW_MS: Record<TimeWindow, number> = {
  '1h': 60 * 60 * 1000,
  '6h': 6 * 60 * 60 * 1000,
  '12h': 12 * 60 * 60 * 1000,
  '24h': 24 * 60 * 60 * 1000,
}

interface RecordingTimelineProps {
  cameraId: string
  initialRecordings: Recording[]
  onSeek: (timestamp: Date, recording: Recording) => void
  onLive: () => void
  isLive: boolean
}

function formatTimeLabel(date: Date): string {
  return date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit', hour12: false })
}

export function RecordingTimeline({ cameraId, initialRecordings, onSeek, onLive, isLive }: RecordingTimelineProps) {
  const [window, setWindow] = useState<TimeWindow>('6h')
  const [recordings, setRecordings] = useState<Recording[]>(initialRecordings)
  const barRef = useRef<HTMLDivElement>(null)

  const now = Date.now()
  const windowMs = WINDOW_MS[window]
  const windowStart = now - windowMs

  useEffect(() => {
    const fetchRecordings = async () => {
      try {
        const { getRecordingsAction } = await import('@/lib/data/actions/streaming')
        const from = new Date(Date.now() - WINDOW_MS[window]).toISOString()
        const to = new Date().toISOString()
        const data = await getRecordingsAction(cameraId, from, to)
        setRecordings(data)
      } catch (err) {
        console.error('Failed to fetch recordings:', err)
      }
    }
    fetchRecordings()
  }, [window, cameraId])

  const visible = recordings.filter((r) => {
    const start = new Date(r.started_at).getTime()
    const end = r.ended_at ? new Date(r.ended_at).getTime() : now
    return end >= windowStart && start <= now
  })

  const labelCount = 6
  const labels: { time: string; pct: number }[] = []
  for (let i = 0; i <= labelCount; i++) {
    const t = windowStart + (windowMs * i) / labelCount
    labels.push({ time: formatTimeLabel(new Date(t)), pct: (i / labelCount) * 100 })
  }

  const handleBarClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!barRef.current) return
      const rect = barRef.current.getBoundingClientRect()
      const pct = (e.clientX - rect.left) / rect.width
      const clickedTime = windowStart + pct * windowMs
      const clickedDate = new Date(clickedTime)

      const covering = visible.find((r) => {
        const start = new Date(r.started_at).getTime()
        const end = r.ended_at ? new Date(r.ended_at).getTime() : now
        return clickedTime >= start && clickedTime <= end
      })

      if (covering) {
        onSeek(clickedDate, covering)
      }
    },
    [visible, windowStart, windowMs, onSeek, now]
  )

  return (
    <div className="flex flex-col gap-2 font-sans">
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {(['1h', '6h', '12h', '24h'] as TimeWindow[]).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindow(w)}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition-colors cursor-pointer ${
                window === w
                  ? 'bg-navy text-white'
                  : 'bg-surface text-ink-3 hover:bg-surface-subtle'
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onLive}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider transition-colors cursor-pointer ${
            isLive
              ? 'bg-p-red text-white'
              : 'bg-surface text-ink-3 hover:bg-surface-subtle'
          }`}
        >
          <Radio size={10} />
          LIVE
        </button>
      </div>

      <div
        ref={barRef}
        onClick={handleBarClick}
        className="relative h-8 bg-surface border border-border rounded-lg overflow-hidden cursor-pointer"
      >
        {visible.map((r) => {
          const start = Math.max(new Date(r.started_at).getTime(), windowStart)
          const end = Math.min(r.ended_at ? new Date(r.ended_at).getTime() : now, now)
          const leftPct = ((start - windowStart) / windowMs) * 100
          const widthPct = ((end - start) / windowMs) * 100

          return (
            <div
              key={r.id}
              className="absolute top-0 bottom-0 bg-p-blue/30 border-l border-r border-p-blue/50"
              style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
            />
          )
        })}

        <div
          className="absolute top-0 bottom-0 w-px bg-p-red"
          style={{ left: '100%' }}
        />
      </div>

      <div className="relative h-4">
        {labels.map((l, i) => (
          <span
            key={i}
            className="absolute text-[10px] text-ink-4 tabular-nums -translate-x-1/2"
            style={{ left: `${l.pct}%` }}
          >
            {l.time}
          </span>
        ))}
      </div>
    </div>
  )
}
