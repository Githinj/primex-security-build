'use client'

import { useEffect, useRef, useState } from 'react'
import { Pill } from '@/components/ui'
import { getRecordingPlaybackUrl } from '@/lib/data/actions/recordings'
import type { Recording } from '@/lib/types'

interface RecordingPlayerProps {
  recording: Recording
  seekToTimestamp?: Date
  cameraName: string
}

export function RecordingPlayer({ recording, seekToTimestamp, cameraName }: RecordingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  // Resolve a short-lived presigned URL (private bucket). Falls back to the
  // stored URL if signing is off or the fetch fails. Tracked by recording id so
  // a stale resolution never applies to a newly-selected recording.
  const [resolved, setResolved] = useState<{ id: string; url: string } | null>(null)

  useEffect(() => {
    let active = true
    getRecordingPlaybackUrl(recording.id)
      .then((res) => { if (active) setResolved({ id: recording.id, url: res.url ?? recording.file_url }) })
      .catch(() => { if (active) setResolved({ id: recording.id, url: recording.file_url }) })
    return () => { active = false }
  }, [recording.id, recording.file_url])

  const src = resolved?.id === recording.id ? resolved.url : undefined

  useEffect(() => {
    const video = videoRef.current
    if (!video || !seekToTimestamp) return

    const offset = Math.max(
      0,
      (seekToTimestamp.getTime() - new Date(recording.started_at).getTime()) / 1000,
    )

    const seek = () => {
      video.currentTime = offset
      video.play().catch(() => {})
    }

    // Assigning currentTime before the browser knows the duration is silently
    // discarded, and playback starts at 0 (SEC-191). That was the common case,
    // not the edge one: this effect runs right after `src` is first set, so the
    // metadata has almost never loaded yet — every click-to-seek from the
    // timeline landed at the start of the file.
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      seek()
      return
    }

    video.addEventListener('loadedmetadata', seek, { once: true })
    return () => video.removeEventListener('loadedmetadata', seek)
  }, [seekToTimestamp, recording.started_at, src])

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
        src={src ?? undefined}
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
