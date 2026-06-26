# Camera Streaming Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add live camera streaming with WebRTC/HLS playback, Ant Media webhook integration, and a recording timeline scrubber to the Primex security platform.

**Architecture:** IP cameras push RTSP/RTMP to Ant Media Server. Next.js server actions generate JWT play tokens. A webhook API route receives stream lifecycle events. Client components use `@antmedia/webrtc_adaptor` for WebRTC playback with HLS.js fallback. Recordings stored in DO Spaces, browsed via a visual timeline.

**Tech Stack:** Next.js 16 (App Router), Supabase, `@antmedia/webrtc_adaptor`, `hls.js`, Tailwind CSS v4

**Spec:** `docs/superpowers/specs/2026-06-26-camera-streaming-design.md`

---

## Chunk 1: Database Schema & Types

### Task 1: Create streaming migration file

**Files:**
- Create: `supabase/migrations/003_streaming.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 003_streaming.sql
-- Camera streaming schema changes
-- Spec: docs/superpowers/specs/2026-06-26-camera-streaming-design.md

-- New columns on cameras (stream_id already exists from 002_ai_detection.sql)
ALTER TABLE cameras
  ADD COLUMN stream_url        TEXT,
  ADD COLUMN recording_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN last_frame_at     TIMESTAMPTZ;

-- Recordings table
CREATE TABLE recordings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id   UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  stream_id   TEXT NOT NULL,
  file_url    TEXT NOT NULL,
  file_size   BIGINT,
  duration_s  INT,
  started_at  TIMESTAMPTZ NOT NULL,
  ended_at    TIMESTAMPTZ,
  status      TEXT NOT NULL DEFAULT 'recording',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_recordings_camera ON recordings(camera_id);
CREATE INDEX idx_recordings_started_at ON recordings(started_at);
CREATE INDEX idx_recordings_camera_time ON recordings(camera_id, started_at);

-- Stream events audit log
CREATE TABLE stream_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id   UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stream_events_camera ON stream_events(camera_id);

-- ─── RLS ──────────────────────────────────────────────────

ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY recordings_access ON recordings FOR ALL USING (
  CASE get_user_role()
    WHEN 'super_admin' THEN true
    WHEN 'dispatcher' THEN true
    WHEN 'company_manager' THEN camera_id IN (
      SELECT c.id FROM cameras c JOIN sites s ON c.site_id = s.id
      WHERE s.company_id = get_user_company()
    )
    WHEN 'client' THEN camera_id IN (
      SELECT c.id FROM cameras c JOIN sites s ON c.site_id = s.id
      WHERE s.company_id = get_user_company()
    )
    WHEN 'guard' THEN camera_id IN (
      SELECT c.id FROM cameras c JOIN sites s ON c.site_id = s.id
      WHERE s.company_id = get_user_company()
    )
    ELSE false
  END
);

CREATE POLICY stream_events_access ON stream_events FOR ALL USING (
  CASE get_user_role()
    WHEN 'super_admin' THEN true
    WHEN 'dispatcher' THEN true
    WHEN 'company_manager' THEN camera_id IN (
      SELECT c.id FROM cameras c JOIN sites s ON c.site_id = s.id
      WHERE s.company_id = get_user_company()
    )
    WHEN 'client' THEN camera_id IN (
      SELECT c.id FROM cameras c JOIN sites s ON c.site_id = s.id
      WHERE s.company_id = get_user_company()
    )
    WHEN 'guard' THEN camera_id IN (
      SELECT c.id FROM cameras c JOIN sites s ON c.site_id = s.id
      WHERE s.company_id = get_user_company()
    )
    ELSE false
  END
);

GRANT ALL ON recordings TO authenticated;
GRANT ALL ON stream_events TO authenticated;
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/003_streaming.sql
git commit -m "feat: add streaming schema — recordings, stream_events, camera columns (SEC-STR-01)"
```

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `src/lib/types/index.ts`

- [ ] **Step 1: Add streaming fields to the existing Camera interface**

In `src/lib/types/index.ts`, add these fields to the `Camera` interface (after `warning: string | null` on line 39):

```typescript
  stream_id: string | null
  stream_url: string | null
  recording_enabled: boolean
  last_frame_at: string | null
```

- [ ] **Step 2: Add Recording, StreamToken, and StreamEvent interfaces**

After the `AiWorkerConfig` interface (after line 70), add:

```typescript

export interface Recording {
  id: string
  camera_id: string
  stream_id: string
  file_url: string
  file_size: number | null
  duration_s: number | null
  started_at: string
  ended_at: string | null
  status: 'recording' | 'complete' | 'failed'
  created_at: string
}

export interface StreamToken {
  token: string
  streamId: string
  webrtcUrl: string
  hlsUrl: string
  expiresAt: number
}

export interface StreamEvent {
  id: string
  camera_id: string
  event_type: 'stream_started' | 'stream_stopped' | 'recording_saved'
  payload: Record<string, unknown>
  created_at: string
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd primex && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors (or only pre-existing ones).

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/index.ts
git commit -m "feat: add streaming TypeScript types — Recording, StreamToken, StreamEvent (SEC-STR-02)"
```

---

### Task 3: Add data query modules for recordings

**Files:**
- Create: `src/lib/data/recordings.ts`

- [ ] **Step 1: Create `src/lib/data/recordings.ts`**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { Recording } from '@/lib/types'

export async function getRecordings(
  cameraId: string,
  from: string,
  to: string
): Promise<Recording[]> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('camera_id', cameraId)
    .gte('started_at', from)
    .lte('started_at', to)
    .eq('status', 'complete')
    .order('started_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function getRecordingById(id: string): Promise<Recording | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('recordings')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/recordings.ts
git commit -m "feat: add recordings data query module (SEC-STR-03)"
```

---

### Task 4: Install streaming dependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install @antmedia/webrtc_adaptor and hls.js**

```bash
cd primex && npm install @antmedia/webrtc_adaptor hls.js
```

- [ ] **Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @antmedia/webrtc_adaptor and hls.js (SEC-STR-04)"
```

---

## Chunk 2: Server Actions & Webhook

### Task 5: Create stream token server action

**Files:**
- Create: `src/lib/data/actions/streaming.ts`

- [ ] **Step 1: Create `src/lib/data/actions/streaming.ts`**

```typescript
'use server'

import { createServerSupabaseClient } from '@/lib/supabase/server'
import { requireRole } from '@/lib/auth/require-role'
import type { StreamToken } from '@/lib/types'

const ANTMEDIA_URL = process.env.ANTMEDIA_URL!
const ANTMEDIA_API_KEY = process.env.ANTMEDIA_API_KEY!
const ANTMEDIA_WS_URL = process.env.ANTMEDIA_WS_URL!
const TOKEN_DURATION_MS = 60 * 60 * 1000 // 1 hour

export async function getStreamToken(cameraId: string): Promise<StreamToken | null> {
  await requireRole('super_admin', 'dispatcher', 'company_manager', 'client', 'guard')

  const supabase = await createServerSupabaseClient()
  const { data: camera, error } = await supabase
    .from('cameras')
    .select('stream_id')
    .eq('id', cameraId)
    .single()

  if (error || !camera?.stream_id) return null

  const streamId = camera.stream_id
  const expireDate = Date.now() + TOKEN_DURATION_MS

  const res = await fetch(
    `${ANTMEDIA_URL}/WebRTCAppEE/rest/v2/broadcasts/${streamId}/token?expireDate=${expireDate}&type=play`,
    {
      method: 'GET', // Ant Media token API uses GET, not POST
      headers: { Authorization: `Bearer ${ANTMEDIA_API_KEY}` },
    }
  )

  if (!res.ok) {
    console.error(`Ant Media token request failed: ${res.status}`)
    return null
  }

  const { tokenId } = await res.json()

  return {
    token: tokenId,
    streamId,
    webrtcUrl: ANTMEDIA_WS_URL,
    hlsUrl: `${ANTMEDIA_URL}/WebRTCAppEE/streams/${streamId}.m3u8?token=${tokenId}`,
    expiresAt: expireDate,
  }
}

export async function createBroadcast(cameraId: string, cameraName: string, streamId: string): Promise<{ success: boolean; ingestUrl?: string }> {
  await requireRole('super_admin')

  const res = await fetch(
    `${ANTMEDIA_URL}/WebRTCAppEE/rest/v2/broadcasts`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${ANTMEDIA_API_KEY}`,
      },
      body: JSON.stringify({
        streamId,
        name: cameraName,
        type: 'liveStream',
      }),
    }
  )

  // 409 = broadcast already exists, reuse it
  if (res.status === 409) {
    return { success: true, ingestUrl: `rtmp://${new URL(ANTMEDIA_URL).hostname}/WebRTCAppEE/${streamId}` }
  }

  if (!res.ok) {
    console.error(`Failed to create broadcast: ${res.status}`)
    return { success: false }
  }

  const data = await res.json()

  // Update camera with stream_id and stream_url
  const supabase = await createServerSupabaseClient()
  await supabase
    .from('cameras')
    .update({
      stream_id: streamId,
      stream_url: `rtmp://${new URL(ANTMEDIA_URL).hostname}/WebRTCAppEE/${streamId}`,
    })
    .eq('id', cameraId)

  return {
    success: true,
    ingestUrl: `rtmp://${new URL(ANTMEDIA_URL).hostname}/WebRTCAppEE/${streamId}`,
  }
}

export async function getRecordingsAction(
  cameraId: string,
  from: string,
  to: string
) {
  await requireRole('super_admin', 'dispatcher', 'company_manager', 'client', 'guard')

  const { getRecordings } = await import('@/lib/data/recordings')
  return getRecordings(cameraId, from, to)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/actions/streaming.ts
git commit -m "feat: add stream token and broadcast server actions (SEC-STR-05)"
```

---

### Task 6: Create Ant Media webhook API route

**Files:**
- Create: `src/app/api/webhooks/antmedia/route.ts`

- [ ] **Step 1: Create the webhook route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const WEBHOOK_SECRET = process.env.ANTMEDIA_WEBHOOK_SECRET!
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
// Construct DO Spaces URL from bucket + endpoint
// Env vars: DO_SPACES_RECORDINGS_BUCKET=primex-recordings, DO_SPACES_ENDPOINT=sgp1.digitaloceanspaces.com
const DO_SPACES_ENDPOINT = process.env.DO_SPACES_RECORDINGS_BUCKET
  ? `https://${process.env.DO_SPACES_RECORDINGS_BUCKET}.${process.env.DO_SPACES_ENDPOINT ?? 'sgp1.digitaloceanspaces.com'}`
  : ''

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const secret = req.headers.get('X-Antmedia-Secret')
  if (!secret || secret !== WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const action = body.action as string
  const streamId = body.streamId as string ?? body.id as string

  if (!action || !streamId) {
    return NextResponse.json({ error: 'Missing action or streamId' }, { status: 400 })
  }

  // Use service role to bypass RLS
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

  // Look up camera by stream_id
  const { data: camera } = await supabase
    .from('cameras')
    .select('id')
    .eq('stream_id', streamId)
    .single()

  if (!camera) {
    // Unknown stream — log and ignore
    console.warn(`Webhook for unknown stream_id: ${streamId}`)
    return NextResponse.json({ ok: true, skipped: true })
  }

  const cameraId = camera.id

  switch (action) {
    case 'liveStreamStarted': {
      await supabase
        .from('cameras')
        .update({ status: 'Online', last_frame_at: new Date().toISOString() })
        .eq('id', cameraId)

      await supabase.from('stream_events').insert({
        camera_id: cameraId,
        event_type: 'stream_started',
        payload: body,
      })
      break
    }

    case 'liveStreamEnded': {
      await supabase
        .from('cameras')
        .update({ status: 'Offline' })
        .eq('id', cameraId)

      await supabase.from('stream_events').insert({
        camera_id: cameraId,
        event_type: 'stream_stopped',
        payload: body,
      })
      break
    }

    case 'vodReady': {
      const vodName = body.vodName as string ?? ''
      const vodId = body.vodId as string ?? ''
      const duration = body.duration as number ?? 0
      const fileSize = body.fileSize as number ?? 0
      const startTime = body.startTime as string ?? new Date().toISOString()
      const endTime = body.endTime as string ?? new Date().toISOString()

      const fileUrl = vodName
        ? `${DO_SPACES_ENDPOINT}/recordings/${vodName}`
        : `${DO_SPACES_ENDPOINT}/recordings/${streamId}_${Date.now()}.mp4`

      await supabase.from('recordings').insert({
        camera_id: cameraId,
        stream_id: streamId,
        file_url: fileUrl,
        file_size: fileSize || null,
        duration_s: duration ? Math.round(duration / 1000) : null,
        started_at: startTime,
        ended_at: endTime,
        status: 'complete',
      })

      await supabase.from('stream_events').insert({
        camera_id: cameraId,
        event_type: 'recording_saved',
        payload: body,
      })
      break
    }

    default:
      // Unknown event — log and ignore
      console.warn(`Unknown Ant Media webhook action: ${action}`)
  }

  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/api/webhooks/antmedia/route.ts
git commit -m "feat: add Ant Media webhook handler — stream lifecycle + recordings (SEC-STR-06)"
```

---

## Chunk 3: Client Components

### Task 7: Create useStreamToken hook

**Files:**
- Create: `src/lib/hooks/use-stream-token.ts`

- [ ] **Step 1: Create `src/lib/hooks/use-stream-token.ts`**

```typescript
'use client'

import { useState, useEffect, useCallback } from 'react'
import { getStreamToken } from '@/lib/data/actions/streaming'
import type { StreamToken } from '@/lib/types'

interface UseStreamTokenReturn {
  token: StreamToken | null
  isLoading: boolean
  error: string | null
  refresh: () => void
}

export function useStreamToken(cameraId: string | null): UseStreamTokenReturn {
  const [token, setToken] = useState<StreamToken | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchToken = useCallback(async () => {
    if (!cameraId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await getStreamToken(cameraId)
      if (!result) {
        setError('No stream available')
      } else {
        setToken(result)
      }
    } catch (err) {
      setError('Failed to get stream token')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [cameraId])

  // Initial fetch
  useEffect(() => {
    fetchToken()
  }, [fetchToken])

  // Auto-refresh 5 minutes before expiry
  useEffect(() => {
    if (!token) return
    const refreshIn = token.expiresAt - Date.now() - 5 * 60 * 1000
    if (refreshIn <= 0) {
      fetchToken()
      return
    }
    const timer = setTimeout(fetchToken, refreshIn)
    return () => clearTimeout(timer)
  }, [token, fetchToken])

  return { token, isLoading, error, refresh: fetchToken }
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/hooks/use-stream-token.ts
git commit -m "feat: add useStreamToken hook with auto-refresh (SEC-STR-07)"
```

---

### Task 8: Create CameraPlayer component

**Files:**
- Create: `src/components/streaming/camera-player.tsx`

- [ ] **Step 1: Create `src/components/streaming/camera-player.tsx`**

```tsx
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

  // Update player state based on token loading
  useEffect(() => {
    if (isLoading) setPlayerState('loading_token')
    else if (tokenError) setPlayerState('error')
  }, [isLoading, tokenError])

  // Initialize WebRTC when token arrives
  useEffect(() => {
    if (!token || !videoRef.current) return

    setPlayerState('connecting_webrtc')
    let timeoutId: ReturnType<typeof setTimeout>
    let adaptor: any = null

    const initWebRTC = async () => {
      try {
        const { WebRTCAdaptor } = await import('@antmedia/webrtc_adaptor')

        adaptor = new WebRTCAdaptor({
          websocket_url: token.webrtcUrl,
          mediaConstraints: { video: false, audio: false },
          sdp_constraints: { OfferToReceiveAudio: false, OfferToReceiveVideo: true },
          remoteVideoElement: videoRef.current,
          callback: (info: string) => {
            if (info === 'initialized') {
              adaptor.play(token.streamId, token.token)
            }
            if (info === 'play_started') {
              setPlayerState('live')
              setProtocol('WebRTC')
              clearTimeout(timeoutId)
            }
          },
          callbackError: (error: string) => {
            console.warn('WebRTC error, falling back to HLS:', error)
            fallbackToHls()
          },
        })

        webrtcRef.current = adaptor

        // Timeout: if WebRTC doesn't connect in 10s, fall back
        timeoutId = setTimeout(() => {
          console.warn('WebRTC timeout, falling back to HLS')
          fallbackToHls()
        }, 10000)
      } catch (err) {
        console.warn('WebRTC init failed, falling back to HLS:', err)
        fallbackToHls()
      }
    }

    const fallbackToHls = () => {
      // Clean up WebRTC
      if (webrtcRef.current) {
        try { webrtcRef.current.stop(token.streamId) } catch {}
        webrtcRef.current = null
      }

      if (!videoRef.current || !token.hlsUrl) {
        setPlayerState('error')
        return
      }

      setPlayerState('fallback_hls')

      if (Hls.isSupported()) {
        const hls = new Hls({ enableWorker: true, lowLatencyMode: true })
        hls.loadSource(token.hlsUrl)
        hls.attachMedia(videoRef.current)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          videoRef.current?.play().catch(() => {})
          setPlayerState('live')
          setProtocol('HLS')
        })
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (data.fatal) {
            console.error('HLS fatal error:', data)
            setPlayerState('error')
          }
        })
        hlsRef.current = hls
      } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
        // Safari native HLS
        videoRef.current.src = token.hlsUrl
        videoRef.current.addEventListener('loadedmetadata', () => {
          videoRef.current?.play().catch(() => {})
          setPlayerState('live')
          setProtocol('HLS')
        })
      } else {
        setPlayerState('error')
      }
    }

    initWebRTC()

    return () => {
      clearTimeout(timeoutId)
      if (webrtcRef.current) {
        try { webrtcRef.current.stop(token.streamId) } catch {}
        webrtcRef.current = null
      }
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [token])

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

  // Offline / Maintenance / Unknown — render placeholder
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
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Loading skeleton */}
      {(playerState === 'loading_token' || playerState === 'connecting_webrtc') && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-navy">
          <div className="w-6 h-6 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
          <span className="text-white/40 text-xs font-sans">
            {playerState === 'loading_token' ? 'Getting stream…' : 'Connecting…'}
          </span>
        </div>
      )}

      {/* Error state */}
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

      {/* LIVE badge — top-left */}
      {playerState === 'live' && (
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-p-red/90 text-white text-[10px] font-bold tracking-widest uppercase px-2 py-0.5 rounded-md">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse flex-shrink-0" />
          LIVE
        </div>
      )}

      {/* Protocol pill — top-right */}
      {playerState === 'live' && protocol && (
        <div className="absolute top-2.5 right-2.5">
          <Pill tone="blue" size="sm">{protocol}</Pill>
        </div>
      )}

      {/* Camera name — bottom-left (only when live or connecting) */}
      {(playerState === 'live' || playerState === 'connecting_webrtc' || playerState === 'fallback_hls') && (
        <div className="absolute bottom-2.5 left-2.5">
          <span className="text-white/60 text-[10px] font-sans">{cameraName}</span>
        </div>
      )}

      {/* Fullscreen toggle — bottom-right (hidden in compact) */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/streaming/camera-player.tsx
git commit -m "feat: add CameraPlayer — WebRTC primary, HLS fallback (SEC-STR-08)"
```

---

### Task 9: Create RecordingTimeline component

**Files:**
- Create: `src/components/streaming/recording-timeline.tsx`

- [ ] **Step 1: Create `src/components/streaming/recording-timeline.tsx`**

```tsx
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

  // Re-fetch recordings when time window changes
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

  // Filter recordings to current window
  const visible = recordings.filter((r) => {
    const start = new Date(r.started_at).getTime()
    const end = r.ended_at ? new Date(r.ended_at).getTime() : now
    return end >= windowStart && start <= now
  })

  // Generate time labels
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

      // Find the recording that covers this timestamp
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
      {/* Controls row */}
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

      {/* Timeline bar */}
      <div
        ref={barRef}
        onClick={handleBarClick}
        className="relative h-8 bg-surface border border-border rounded-lg overflow-hidden cursor-pointer"
      >
        {/* Recording segments */}
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

        {/* Now marker */}
        <div
          className="absolute top-0 bottom-0 w-px bg-p-red"
          style={{ left: '100%' }}
        />
      </div>

      {/* Time labels */}
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
```

- [ ] **Step 2: Commit**

```bash
git add src/components/streaming/recording-timeline.tsx
git commit -m "feat: add RecordingTimeline — visual scrubber with time window presets (SEC-STR-09)"
```

---

### Task 10: Create RecordingPlayer component

**Files:**
- Create: `src/components/streaming/recording-player.tsx`

- [ ] **Step 1: Create `src/components/streaming/recording-player.tsx`**

This is a simple native video element for playing MP4 recordings from DO Spaces.

```tsx
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

      {/* Recording badge — top-left */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
        <Pill tone="gray" size="sm">REC {startTime}</Pill>
        {duration && <Pill tone="gray" size="sm">{duration}</Pill>}
      </div>

      {/* Camera name — bottom-left */}
      <div className="absolute bottom-2.5 left-2.5">
        <span className="text-white/60 text-[10px] font-sans">{cameraName}</span>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/streaming/recording-player.tsx
git commit -m "feat: add RecordingPlayer — native video for MP4 playback with seek (SEC-STR-10)"
```

---

## Chunk 4: Frontend Integration

### Task 11: Update camera detail page with streaming

**Files:**
- Modify: `src/app/(app)/cameras/[id]/page.tsx`
- Modify: `src/app/(app)/cameras/[id]/camera-detail-client.tsx`

- [ ] **Step 1: Update the page server component to fetch recordings**

In `src/app/(app)/cameras/[id]/page.tsx`, add the recordings import and fetch:

```typescript
import { getRecordings } from "@/lib/data/recordings";
```

After `const aiConfig = await getCameraAiConfig(camera.id);`, add:

```typescript
  // Fetch last 6 hours of recordings
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const recordings = await getRecordings(camera.id, sixHoursAgo, new Date().toISOString());
```

Update the return to pass recordings:

```tsx
  return <CameraDetailClient camera={camera} site={site} aiConfig={aiConfig} recordings={recordings} />;
```

- [ ] **Step 2: Rewrite camera-detail-client.tsx with streaming support**

Read the current file, then rewrite it. Key changes:
- Replace the static `CameraTile` preview with `CameraPlayer`
- Add `RecordingTimeline` and `RecordingPlayer`
- Remove the disabled "View live (Phase 2)" button
- Add `Recording` to type imports
- Add `recordings` to props

The component manages a `mode` state: `'live'` or `'playback'`. In live mode, it shows `CameraPlayer`. In playback mode, it shows `RecordingPlayer`. The timeline switches between them.

Replace the entire camera-detail-client.tsx content:

```tsx
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Card, KV, Button, Label, Pill } from "@/components/ui";
import { CameraPlayer } from "@/components/streaming/camera-player";
import { RecordingTimeline } from "@/components/streaming/recording-timeline";
import { RecordingPlayer } from "@/components/streaming/recording-player";
import { cameraTone } from "@/lib/utils";
import { deleteCamera } from "@/lib/data/actions/cameras";
import { toggleCameraAi } from "@/lib/data/actions/camera-ai-config";
import type { Camera, Site, CameraAiConfig, Recording } from "@/lib/types";

interface CameraDetailClientProps {
  camera: Camera;
  site: Site;
  aiConfig: CameraAiConfig | null;
  recordings: Recording[];
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("en-AU", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function CameraDetailClient({ camera, site, aiConfig, recordings }: CameraDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<'live' | 'playback'>('live');
  const [activeRecording, setActiveRecording] = useState<Recording | null>(null);
  const [seekTimestamp, setSeekTimestamp] = useState<Date | null>(null);

  const tone = cameraTone(camera.status);

  const handleSeek = (timestamp: Date, recording: Recording) => {
    setMode('playback');
    setActiveRecording(recording);
    setSeekTimestamp(timestamp);
  };

  const handleLive = () => {
    setMode('live');
    setActiveRecording(null);
    setSeekTimestamp(null);
  };

  return (
    <div className="px-4 sm:px-9 py-6 sm:py-8 flex flex-col gap-6 max-w-4xl">
      {/* Back nav */}
      <button
        type="button"
        onClick={() => router.push("/cameras")}
        className="inline-flex items-center gap-1.5 text-sm text-ink-3 hover:text-ink transition-colors duration-100 font-sans cursor-pointer w-fit"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Back to Cameras
      </button>

      {/* Live player or recording player */}
      <div className="w-full max-w-2xl">
        {mode === 'live' ? (
          <CameraPlayer
            cameraId={camera.id}
            cameraName={camera.name}
            status={camera.status}
          />
        ) : activeRecording ? (
          <RecordingPlayer
            recording={activeRecording}
            seekToTimestamp={seekTimestamp ?? undefined}
            cameraName={camera.name}
          />
        ) : null}
      </div>

      {/* Recording timeline */}
      <div className="w-full max-w-2xl">
        <RecordingTimeline
          cameraId={camera.id}
          initialRecordings={recordings}
          onSeek={handleSeek}
          onLive={handleLive}
          isLive={mode === 'live'}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_260px] gap-4 md:gap-5 items-start">
        {/* Left: Camera info */}
        <Card className="flex flex-col gap-5">
          <Label>Camera info</Label>
          <div className="flex flex-col gap-3">
            <KV k="Name" v={camera.name} />
            <KV k="Location" v={camera.location} />
            <KV k="Site" v={site.name} />
            <KV
              k="Status"
              v={
                <Pill tone={tone} dot size="sm">
                  {camera.status}
                </Pill>
              }
            />
            <KV k="Last checked" v={formatTime(camera.last_checked)} />
            {camera.stream_id && <KV k="Stream ID" v={camera.stream_id} />}
            <KV
              k="Warning"
              v={
                camera.warning ? (
                  <span className="text-p-amber font-medium">{camera.warning}</span>
                ) : (
                  <span className="text-ink-4">None</span>
                )
              }
            />
          </div>
        </Card>

        {/* AI Detection config */}
        <Card className="flex flex-col gap-5">
          <Label>AI Detection</Label>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-ink font-sans">Status</span>
              <button
                type="button"
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 cursor-pointer ${
                  aiConfig?.enabled ? 'bg-p-blue' : 'bg-p-gray/30'
                }`}
                onClick={() => startTransition(async () => {
                  try {
                    await toggleCameraAi(camera.id, !(aiConfig?.enabled ?? false));
                    router.refresh();
                  } catch (err) {
                    console.error(err);
                  }
                })}
                disabled={isPending}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    aiConfig?.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            <KV k="Zones configured" v={String(aiConfig?.zones?.length ?? 0)} />
            {aiConfig?.zones && aiConfig.zones.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {aiConfig.zones.map((z) => (
                  <Pill key={z.name} tone="blue" size="sm">
                    {z.name} ({z.type})
                  </Pill>
                ))}
              </div>
            )}
            {!aiConfig && (
              <p className="text-xs text-ink-4 font-sans">
                No AI config. Detection will be enabled when the camera is assigned a stream.
              </p>
            )}
          </div>
        </Card>

        {/* Actions */}
        <Card className="flex flex-col gap-3">
          <Label>Actions</Label>
          <div className="flex flex-col gap-2 mt-1">
            <Button
              variant="danger"
              icon={Trash2}
              full
              disabled={isPending}
              onClick={() => startTransition(async () => {
                try {
                  await deleteCamera(camera.id);
                  router.push('/cameras');
                } catch (err) {
                  console.error(err);
                }
              })}
            >
              {isPending ? 'Removing…' : 'Remove camera'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `cd primex && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/(app)/cameras/[id]/page.tsx" "src/app/(app)/cameras/[id]/camera-detail-client.tsx"
git commit -m "feat: integrate CameraPlayer + RecordingTimeline into camera detail page (SEC-STR-11)"
```

---

### Task 12: Add compact stream panel to dispatcher console

**Depends on:** Task 2 (Camera type must have `stream_id` field)

**Files:**
- Modify: `src/app/(app)/dispatcher/sections/queue.tsx`

- [ ] **Step 1: Add CameraPlayer import and render in dispatcher queue**

Read `src/app/(app)/dispatcher/sections/queue.tsx` first.

Add import at the top (after existing imports):

```typescript
import { CameraPlayer } from '@/components/streaming/camera-player'
```

In the right panel detail view, find the section after the location display (around line 220, after the `{selectedCamera && (` block). Add the compact CameraPlayer between the location section and the description card:

After the location `</div>` (around line 221) and before `{/* Description card */}`, add:

```tsx
              {/* Live stream — compact player */}
              {selectedCamera && selectedCamera.status === 'Online' && selectedCamera.stream_id && (
                <CameraPlayer
                  cameraId={selectedCamera.id}
                  cameraName={selectedCamera.name}
                  status={selectedCamera.status}
                  compact
                />
              )}
```

Note: The `selectedCamera` variable already exists in the component (line 66-68). It needs `stream_id` to be available on the Camera type (added in Task 2).

- [ ] **Step 2: Commit**

```bash
git add "src/app/(app)/dispatcher/sections/queue.tsx"
git commit -m "feat: add compact CameraPlayer to dispatcher queue detail panel (SEC-STR-12)"
```

---

### Task 13: Final verification

- [ ] **Step 1: Verify TypeScript compiles**

Run: `cd primex && npx tsc --noEmit 2>&1 | head -20`
Expected: No errors.

- [ ] **Step 2: Verify Next.js builds**

Run: `cd primex && npx next build 2>&1 | tail -20`
Expected: Build succeeds.

- [ ] **Step 3: Fix any issues and commit**

```bash
git add -A
git commit -m "fix: resolve any build issues from streaming integration (SEC-STR-13)"
```
