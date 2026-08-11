'use client'

import { useState } from 'react'
import { Play, Camera as CameraIcon } from 'lucide-react'
import { CameraPlayer } from './camera-player'
import type { CameraStatus } from '@/lib/types'

interface DeferredCameraPlayerProps {
  cameraId: string
  cameraName: string
  status: CameraStatus
  compact?: boolean
  /**
   * Open the stream immediately instead of showing the poster. Reserved for the
   * cases where a second of friction is the wrong trade.
   */
  autoStart?: boolean
  /** Shown on the poster, e.g. the site name. */
  subtitle?: string | null
}

/**
 * A camera player that does not connect until asked (SEC-192).
 *
 * `CameraPlayer` opens a WebRTC peer connection to the origin Ant Media droplet
 * the moment it mounts — it fetches a stream token on render. There is no edge
 * tier, so every mounted player is a connection on the one box.
 *
 * The dispatcher alert detail mounts one for whichever alert is selected, so
 * simply reading down the queue opens and holds a connection per alert looked
 * at, at the moment ingest load is also highest. Measured capacity is at least
 * 30 concurrent viewers per stream (see `loadtest/`), which is not a lot of
 * dispatchers idling.
 *
 * Critical alerts still autostart: making someone click before they can see what
 * is happening is the wrong trade when the alert is the one that matters. Every
 * other severity waits for the click.
 *
 * Remount this per alert (`key={alert.id}`) so switching alerts returns to the
 * poster rather than carrying the previous decision over.
 */
export function DeferredCameraPlayer({
  cameraId,
  cameraName,
  status,
  compact = false,
  autoStart = false,
  subtitle,
}: DeferredCameraPlayerProps) {
  const [watching, setWatching] = useState(autoStart)

  if (watching) {
    return (
      <CameraPlayer
        cameraId={cameraId}
        cameraName={cameraName}
        status={status}
        compact={compact}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setWatching(true)}
      className={`group relative w-full rounded-xl overflow-hidden bg-navy flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors hover:bg-navy-darker ${
        compact ? 'h-[240px]' : ''
      }`}
      style={compact ? undefined : { aspectRatio: '16/9' }}
      aria-label={`Watch live stream from ${cameraName}`}
    >
      <span className="flex items-center justify-center w-12 h-12 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors">
        <Play size={20} strokeWidth={2} className="text-white ml-0.5" />
      </span>
      <span className="text-white text-sm font-sans font-semibold">Watch live</span>
      <span className="flex items-center gap-1.5 text-white/40 text-[11px] font-sans">
        <CameraIcon size={12} strokeWidth={2} />
        {cameraName}
        {subtitle && <span className="text-white/25">· {subtitle}</span>}
      </span>
    </button>
  )
}
