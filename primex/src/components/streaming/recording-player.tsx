'use client'

import { useEffect, useRef } from 'react'
import { Pill } from '@/components/ui'
import type { Recording } from '@/lib/types'

interface RecordingPlayerProps {
  recording: Recording
  seekToTimestamp?: Date
  cameraName: string
}

export function RecordingPlayer({ recording, seekToTimestamp, cameraName }: RecordingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    if (!videoRef.current || !seekToTimestamp) return
    const offset = (seekToTimestamp.getTime() - new Date(recording.started_at).getTime()) / 1000
    videoRef.current.currentTime = Math.max(0, offset)
    videoRef.current.play().catch(() => {})
  }, [seekToTimestamp, recording.started_at])

  const startTime = new Date(recording.started_at).toLocaleTimeString('en-AU', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })

  const duration = recording.duration_s
    ? `${Math.floor(recording.duration_s / 60)}m ${recording.duration_s % 60}s`
    : ''

  return (
    <div className="relative w-full rounded-xl overflow-hidden bg-navy" style={{ aspectRatio: '16/9' }}>
      <video
        ref={videoRef}
        src={recording.file_url}
        controls
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
        <Pill tone="gray" size="sm">REC {startTime}</Pill>
        {duration && <Pill tone="gray" size="sm">{duration}</Pill>}
      </div>

      <div className="absolute bottom-2.5 left-2.5">
        <span className="text-white/60 text-[10px] font-sans">{cameraName}</span>
      </div>
    </div>
  )
}
