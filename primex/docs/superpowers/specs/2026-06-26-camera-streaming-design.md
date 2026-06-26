# Camera Streaming — Design Spec

> Primex Security Platform — Phase 2 Streaming
> Date: 2026-06-26

---

## 1. Overview

Live camera streaming and recording playback integrated into the Primex platform. IP cameras push RTSP/RTMP streams to a self-hosted Ant Media Server on DigitalOcean. The Next.js app generates per-session JWT tokens for secure playback, receives webhooks for stream lifecycle events, and provides a WebRTC-based player component with automatic HLS fallback. Always-on recordings are stored in DO Spaces with a visual timeline scrubber for playback.

## 2. Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Next.js App                                  │
│                                                                     │
│  Server Actions / API Routes                                        │
│  ├── getStreamToken(cameraId) → calls Ant Media REST → returns JWT  │
│  ├── /api/webhooks/antmedia → receives stream lifecycle events      │
│  └── getRecordings(cameraId) → queries recordings table             │
│                                                                     │
│  Client Components                                                  │
│  ├── CameraPlayer (WebRTC primary, HLS fallback)                   │
│  ├── RecordingTimeline (scrubber + playback)                        │
│  └── DispatcherStreamPanel (inline player in queue detail)          │
└──────────────────┬──────────────────────┬───────────────────────────┘
            token requests            webhooks from
            + REST API calls          Ant Media
               ┌─────┴─────┐    ┌──────────┴──────────┐
               │ Ant Media  │    │  Ant Media Webhooks  │
               │  Server    │────│  (stream start/stop/ │
               │ (DO Droplet)│   │   recording saved)   │
               └──────┬──────┘   └─────────────────────┘
                      │
              RTSP/RTMP ingest
                      │
               ┌──────┴──────┐
               │  IP Cameras  │
               └──────────────┘

               ┌──────────────┐
               │  DO Spaces   │
               │ (recordings) │
               └──────────────┘
```

### Data flow

1. Camera pushes RTSP/RTMP to Ant Media Server
2. Ant Media fires webhooks to `/api/webhooks/antmedia` on stream start/stop/recording events
3. Webhook handler updates camera status (Online/Offline) and inserts recording metadata into Supabase
4. User opens camera detail or dispatcher selects alert → client requests stream token via server action
5. Server action calls Ant Media REST API to generate a short-lived JWT play token
6. Client initializes WebRTC playback via `@antmedia/webrtc_adaptor`, falls back to HLS on failure
7. For recordings: client loads recording list from Supabase, plays segments from DO Spaces URLs via HLS.js

## 3. Database Schema Changes

### New columns on `cameras`

```sql
ALTER TABLE cameras
  ADD COLUMN stream_url        TEXT,
  ADD COLUMN recording_enabled BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN last_frame_at     TIMESTAMPTZ;
```

Note: `stream_id` already exists from the AI detection migration (002_ai_detection.sql).

### New table: `recordings`

```sql
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
```

Recording status values: `recording` (in progress), `complete` (VOD ready), `failed`.

### New table: `stream_events`

```sql
CREATE TABLE stream_events (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id   UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE,
  event_type  TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_stream_events_camera ON stream_events(camera_id);
```

Event types: `stream_started`, `stream_stopped`, `recording_saved`.

Note: `stream_events` is a diagnostic audit log and will grow indefinitely. A cleanup cron (e.g., delete events older than 90 days) is accepted technical debt for a future iteration.

### RLS

Both tables follow the existing CASE-based pattern:

```sql
ALTER TABLE recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE stream_events ENABLE ROW LEVEL SECURITY;

-- recordings: same as cameras (subqueries camera -> site -> company)
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

-- stream_events: same pattern
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

### TypeScript types

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
  expiresAt: number          // epoch ms — token expiry timestamp
}

export interface StreamEvent {
  id: string
  camera_id: string
  event_type: 'stream_started' | 'stream_stopped' | 'recording_saved'
  payload: Record<string, unknown>
  created_at: string
}

// Added to existing Camera interface
interface Camera {
  // ...existing fields
  stream_id: string | null       // already in DB from AI migration, needs adding to TS type
  stream_url: string | null
  recording_enabled: boolean
  last_frame_at: string | null
}
```

## 4. Stream Token Service

A Next.js server action that generates short-lived JWT play tokens from Ant Media's REST API.

**Server action: `getStreamToken(cameraId)`**

```
1. requireRole('super_admin', 'dispatcher', 'company_manager', 'client', 'guard')
2. Fetch camera from Supabase (RLS enforces company scoping)
3. If camera has no stream_id → return null
4. POST to Ant Media REST API:
   /WebRTCAppEE/rest/v2/broadcasts/{stream_id}/token
   ?expireDate={now + 1 hour}&type=play
   Authorization: Bearer {ANTMEDIA_API_KEY}
5. Return { token, streamId, webrtcUrl, hlsUrl }
```

Token expiry: 1 hour. The CameraPlayer component re-fetches a new token 5 minutes before expiry via setTimeout.

## 5. Webhook Handler

Next.js API route at `/api/webhooks/antmedia/route.ts`.

**Auth:** Validates `X-Antmedia-Secret` header against `ANTMEDIA_WEBHOOK_SECRET` env var.

**Events handled:**

| Ant Media Event | Action |
|---|---|
| `liveStreamStarted` | UPDATE cameras SET status='Online', last_frame_at=now() WHERE stream_id={streamId}. INSERT stream_events. |
| `liveStreamEnded` | UPDATE cameras SET status='Offline' WHERE stream_id={streamId}. INSERT stream_events. (Does NOT touch recordings — `vodReady` handles that.) |
| `vodReady` | INSERT recordings (camera_id, stream_id, file_url, duration_s, file_size, started_at, ended_at, status='complete'). INSERT stream_events. |

**Recording lifecycle:** Only `vodReady` creates recording rows — this is the only event that has the final file URL, duration, and size. `liveStreamEnded` updates camera status only. This avoids race conditions between the two events.

Uses Supabase service role key (bypasses RLS for webhook-driven updates).

**Recording file URL:** Ant Media stores VODs to DO Spaces at `https://{bucket}.{endpoint}/recordings/{streamId}_{timestamp}.mp4`. The `vodName` field from the webhook provides the filename.

## 6. CameraPlayer Component

`components/streaming/camera-player.tsx` — WebRTC primary, HLS fallback.

### Props

```typescript
interface CameraPlayerProps {
  cameraId: string
  cameraName: string
  status: CameraStatus
  compact?: boolean   // smaller variant for dispatcher panel
}
```

### State machine

```
idle → loading_token → connecting_webrtc → live
                                          → fallback_hls → live
                                          → error
```

### Behavior

1. If camera status is "Offline" → render offline placeholder (dark navy bg with WifiOff icon, matching existing CameraTile style)
2. Call `getStreamToken(cameraId)` server action → show loading skeleton
3. Initialize `WebRTCAdaptor` from `@antmedia/webrtc_adaptor` with the token
4. On `play_started` callback → show live video with LIVE badge overlay
5. On WebRTC failure (timeout 10s or error callback) → fall back to HLS.js with hlsUrl
6. On HLS failure → show error state with "Stream unavailable" and retry button

### UI overlays

- **LIVE badge** — top-left, red pulsing dot (same style as existing CameraTile)
- **Camera name** — bottom-left
- **Connection pill** — top-right: "WebRTC" or "HLS" showing active protocol
- **Fullscreen toggle** — bottom-right (hidden in compact mode)

### Token refresh

`useEffect` sets a timeout for `token.expiresAt - 5 minutes` (using the `expiresAt` epoch ms field from `StreamToken`). When fired, fetches a new token and reinitializes connection without visible interruption.

### Compact mode (dispatcher)

No fullscreen button, smaller overlays, 240px max height.

### Hook: `useStreamToken(cameraId)`

```typescript
// Returns { token, streamId, webrtcUrl, hlsUrl, isLoading, error, refresh }
// Calls getStreamToken server action
// refresh() can be called to manually re-fetch
```

### Dependencies

- `@antmedia/webrtc_adaptor` — WebRTC signaling with Ant Media
- `hls.js` — HLS playback fallback

## 7. Recording Timeline Component

`components/streaming/recording-timeline.tsx` — visual scrubber for recorded footage.

### Props

```typescript
interface RecordingTimelineProps {
  cameraId: string
  recordings: Recording[]
  onSeek: (timestamp: Date, recording: Recording) => void
  onLive: () => void
}
```

### Layout

```
[1h] [6h] [12h] [24h]                              [LIVE]

|████████░░░░████████████████░░░░████████████████████|
06:00    08:00    10:00    12:00    14:00    16:00 NOW
         ^ cursor
```

- Colored blocks = recorded segments (from recordings table)
- Gaps = no recording (camera offline)
- Click/drag anywhere to seek to that timestamp
- "LIVE" button returns to live WebRTC stream

### Behavior

1. Fetch recordings for selected time window via `getRecordings(cameraId, from, to)`
2. Render segments as colored blocks proportional to duration
3. On click/drag: calculate target timestamp, find covering recording
4. Call `onSeek(timestamp, recording)` — parent switches CameraPlayer to HLS playback of the recording file URL, seeking to correct offset
5. "LIVE" button calls `onLive()` — parent re-initializes WebRTC

### Time window presets

1h, 6h, 12h, 24h. Default: 6h. Timeline auto-scrolls to keep "now" at right edge in live mode.

### Recording playback

Ant Media stores VOD recordings as plain `.mp4` files in DO Spaces. Playback uses a native `<video>` element (not HLS.js — HLS.js is only for live HLS fallback). The player seeks to `clickedTimestamp - recording.started_at` offset within the file using `video.currentTime`.

## 8. Frontend Integration Points

### Camera detail page (`cameras/[id]`)

Replace the "View live (Phase 2)" disabled button and static CameraTile preview with:
- `CameraPlayer` component (full size, max-w-2xl)
- `RecordingTimeline` below the player
- Existing Camera info and AI Detection cards remain below

Page server component fetches recordings in addition to camera + site + aiConfig.

### Dispatcher console (`dispatcher/sections/queue.tsx`)

When selected alert has a linked `camera_id` with an Online status and a `stream_id`:
- Show `CameraPlayer` in compact mode above the alert description card
- No timeline in dispatcher view (live only)

When camera is Offline or has no stream_id, show existing static camera info.

### No changes to

Manager cameras section (status-only tiles), portal, guard view, sites pages, alert list pages.

## 9. Ant Media Server Configuration

### Webhook setup

- URL: `https://{primex-domain}/api/webhooks/antmedia`
- Custom header: `X-Antmedia-Secret: {ANTMEDIA_WEBHOOK_SECRET}`
- Events: `liveStreamStarted`, `liveStreamEnded`, `vodReady`

### Recording setup

- Record Live Streams as MP4: enabled
- S3 storage: DO Spaces bucket `primex-recordings`
- Path pattern: `recordings/{streamId}_{timestamp}.mp4`

### Token security

- Token Control: enabled
- Type: JWT

### Camera broadcast creation

When a camera gets a `stream_id` assigned in Primex, a server action calls:
```
POST /WebRTCAppEE/rest/v2/broadcasts
{ "streamId": "{stream_id}", "name": "{camera_name}", "type": "liveStream" }
```

If broadcast already exists (409), it's reused. The camera then pushes RTSP/RTMP to the generated ingest URL.

An edit camera modal also accepts manual `stream_id` entry for pre-existing broadcasts.

## 10. Environment Variables

```
ANTMEDIA_URL=https://antmedia.primex.io:5443
ANTMEDIA_API_KEY=your-admin-api-key
ANTMEDIA_WS_URL=wss://antmedia.primex.io/WebRTCAppEE/websocket
ANTMEDIA_WEBHOOK_SECRET=your-webhook-secret
DO_SPACES_RECORDINGS_BUCKET=primex-recordings
```

## 11. Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Player SDK | @antmedia/webrtc_adaptor | Full UI control, matches design system, native WebRTC |
| Primary protocol | WebRTC with HLS fallback | Low latency for monitoring, resilience on poor networks |
| Stream security | Per-session JWT tokens, 1h expiry | Never expose raw stream URLs to browser |
| Token generation | Next.js server action | RLS-enforced access, no separate backend |
| Webhooks | Next.js API route | Simple, single codebase |
| Recordings | Always-on, DO Spaces | Full audit trail for security operations |
| Playback UI | Timeline scrubber with presets | Quick navigation to any point in recorded footage |
| Stream access | Role-based, matches camera RLS | Consistent with existing access model |
| Player locations | Camera detail + dispatcher | Live view where it matters most |
| Broadcast creation | Auto-create via REST API + manual | Flexible for different deployment scenarios |

## 12. Dependencies

This spec assumes:
- Ant Media Server Enterprise Edition deployed on DO Droplet (confirmed: deployed, not yet configured)
- DO Spaces bucket for recordings created (`primex-recordings`)
- `stream_id` column already exists on cameras table (added by AI detection migration)
- Ant Media webhook URL reachable from the Ant Media server

## 13. Out of Scope

- Camera PTZ (pan-tilt-zoom) controls
- Multi-camera grid view with live thumbnails
- Audio streaming (video only at launch)
- Stream quality selector UI (Ant Media handles adaptive bitrate automatically)
- Recording retention policies / auto-deletion
- Recording download/export functionality
