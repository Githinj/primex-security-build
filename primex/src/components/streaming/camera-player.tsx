'use client'

import { useEffect, useRef, useState } from 'react'
import { WifiOff, Maximize, Minimize, RefreshCw } from 'lucide-react'
import Hls from 'hls.js'
import { Pill } from '@/components/ui'
import { useStreamToken } from '@/lib/hooks/use-stream-token'
import type { CameraStatus } from '@/lib/types'

type PlayerState = 'idle' | 'loading_token' | 'connecting_webrtc' | 'fallback_hls' | 'live' | 'error'

interface CameraPlayerProps {
  cameraId: string
  cameraName: string
  status: CameraStatus
  compact?: boolean
}

export function CameraPlayer({ cameraId, cameraName, status, compact = false }: CameraPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const webrtcRef = useRef<any>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [playerState, setPlayerState] = useState<PlayerState>('idle')
  const [protocol, setProtocol] = useState<'WebRTC' | 'HLS' | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isOnline = status === 'Online'
  const { token, isLoading, error: tokenError, refresh } = useStreamToken(
    isOnline ? cameraId : null
  )

  useEffect(() => {
    if (isLoading) setPlayerState('loading_token')
    else if (tokenError) setPlayerState('error')
  }, [isLoading, tokenError])

  useEffect(() => {
    const video = videoRef.current
    if (!token || !video) return

    setPlayerState('connecting_webrtc')

    let cancelled = false
    let established = false // true once real frames render (WebRTC or HLS)
    let timeoutId: ReturnType<typeof setTimeout>
    const active: { protocol: 'WebRTC' | 'HLS' | null } = { protocol: null }

    const cleanupWebrtc = () => {
      if (webrtcRef.current) {
        try { webrtcRef.current.stop(token.streamId) } catch {}
        webrtcRef.current = null
      }
    }
    const cleanupHls = () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }

    // Source-agnostic "live" detection. The adaptor auto-attaches the remote
    // MediaStream to this element (srcObject), and hls.js pipes MSE into it, so a
    // real `playing` event is the one reliable signal that frames are rendering —
    // regardless of which adaptor callback strings a given version emits.
    const onPlaying = () => {
      if (cancelled) return
      established = true
      clearTimeout(timeoutId)
      setPlayerState('live')
      if (active.protocol) setProtocol(active.protocol)
    }
    video.addEventListener('playing', onPlaying)

    const fallbackToHls = () => {
      if (cancelled) return
      cleanupWebrtc()
      if (!token.hlsUrl) { setPlayerState('error'); return }

      setPlayerState('fallback_hls')
      active.protocol = 'HLS'

      if (Hls.isSupported()) {
        // lowLatencyMode removed: Ant Media standard HLS isn't LL-HLS, and enabling
        // it against a non-LL origin causes stalls + extra manifest fetches.
        const hls = new Hls({ enableWorker: true })
        let mediaRecoveries = 0
        hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}) })
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data.fatal) return // hls.js self-heals non-fatal errors
          // Recovery ladder before giving up (hls.js best practice).
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            console.warn('HLS network error — reloading')
            hls.startLoad()
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR && mediaRecoveries < 2) {
            mediaRecoveries++
            console.warn(`HLS media error — recovering (${mediaRecoveries})`)
            hls.recoverMediaError()
          } else {
            console.error('HLS fatal error, unrecoverable:', data)
            cleanupHls()
            setPlayerState('error')
          }
        })
        hls.loadSource(token.hlsUrl)
        hls.attachMedia(video)
        hlsRef.current = hls
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS (Safari); `onPlaying` flips us to live.
        video.src = token.hlsUrl
        video.play().catch(() => {})
      } else {
        setPlayerState('error')
      }
    }

    const initWebRTC = async () => {
      try {
        const { WebRTCAdaptor } = await import('@antmedia/webrtc_adaptor')
        if (cancelled) return
        active.protocol = 'WebRTC'

        const adaptor = new WebRTCAdaptor({
          websocket_url: token.webrtcUrl,
          mediaConstraints: { video: false, audio: false },
          sdp_constraints: { OfferToReceiveAudio: false, OfferToReceiveVideo: true },
          remoteVideoElement: video,
          callback: (info: string) => {
            if (cancelled) return
            if (info === 'initialized') {
              adaptor.play(token.streamId, token.token ?? undefined)
            } else if (
              info === 'play_started' ||
              info === 'newStreamAvailable' ||
              info === 'newTrackAvailable'
            ) {
              // Stream/track arrived — nudge playback; `onPlaying` confirms live.
              clearTimeout(timeoutId)
              video.play?.().catch(() => {})
            } else if (info === 'play_finished' || info === 'closed') {
              if (established) {
                // Live session dropped. Let the adaptor's built-in reconnection
                // (reconnectIfRequiredFlag) retry rather than downgrading to HLS;
                // show the reconnecting state until `onPlaying` fires again.
                setPlayerState('connecting_webrtc')
              } else {
                fallbackToHls()
              }
            }
          },
          callbackError: (error: string) => {
            if (cancelled) return
            if (established) {
              // Transient error on a live WebRTC session — the adaptor reconnects;
              // don't tear it down and downgrade to HLS.
              console.warn('WebRTC transient error (live), awaiting reconnect:', error)
            } else {
              console.warn('WebRTC error, falling back to HLS:', error)
              fallbackToHls()
            }
          },
        })

        webrtcRef.current = adaptor

        timeoutId = setTimeout(() => {
          if (cancelled || established) return
          console.warn('WebRTC timeout, falling back to HLS')
          fallbackToHls()
        }, 10000)
      } catch (err) {
        if (cancelled) return
        console.warn('WebRTC init failed, falling back to HLS:', err)
        fallbackToHls()
      }
    }

    initWebRTC()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
      video.removeEventListener('playing', onPlaying)
      cleanupWebrtc()
      cleanupHls()
    }
    // Keyed on the actual connection inputs, not the token object identity, so a
    // token refresh with unchanged URLs/token (e.g. Community Edition, token=null)
    // doesn't needlessly tear down and rebuild a healthy stream.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token?.streamId, token?.webrtcUrl, token?.hlsUrl, token?.token])

  const toggleFullscreen = () => {
    if (!containerRef.current) return
    if (document.fullscreenElement) {
      document.exitFullscreen()
      setIsFullscreen(false)
    } else {
      containerRef.current.requestFullscreen()
      setIsFullscreen(true)
    }
  }

  if (!isOnline) {
    return (
      <div
        className={`relative w-full rounded-xl overflow-hidden bg-navy flex flex-col items-center justify-center gap-3 ${
          compact ? 'h-[240px]' : ''
        }`}
        style={compact ? undefined : { aspectRatio: '16/9' }}
      >
        <WifiOff size={compact ? 24 : 36} strokeWidth={1.5} className="text-white/30" />
        <span className="text-white/40 text-xs font-sans tracking-wide uppercase font-semibold">
          {status}
        </span>
        <span className="text-white/25 text-[10px] font-sans">{cameraName}</span>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full rounded-xl overflow-hidden bg-navy ${compact ? 'h-[240px]' : ''}`}
      style={compact ? undefined : { aspectRatio: '16/9' }}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {(playerState === 'loading_token' || playerState === 'connecting_webrtc') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <span className="text-white/40 text-xs font-sans">
            {playerState === 'loading_token' ? 'Getting stream…' : 'Connecting…'}
          </span>
        </div>
      )}

      {playerState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-navy">
          <WifiOff size={28} strokeWidth={1.5} className="text-white/30" />
          <span className="text-white/40 text-xs font-sans">Stream unavailable</span>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex items-center gap-1.5 text-xs text-white/50 hover:text-white/80 transition-colors cursor-pointer font-sans"
          >
            <RefreshCw size={12} />
            Retry
          </button>
        </div>
      )}

      {playerState === 'live' && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-p-red/90 text-white text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
          LIVE
        </div>
      )}

      {playerState === 'live' && protocol && (
        <div className="absolute top-2.5 right-2.5">
          <Pill tone="blue" size="sm">{protocol}</Pill>
        </div>
      )}

      {(playerState === 'live' || playerState === 'connecting_webrtc' || playerState === 'fallback_hls') && (
        <div className="absolute bottom-2.5 left-2.5">
          <span className="text-white/60 text-[10px] font-sans">{cameraName}</span>
        </div>
      )}

      {!compact && playerState === 'live' && (
        <button
          type="button"
          onClick={toggleFullscreen}
          className="absolute bottom-2.5 right-2.5 text-white/40 hover:text-white/80 transition-colors cursor-pointer"
        >
          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
        </button>
      )}
    </div>
  )
}
