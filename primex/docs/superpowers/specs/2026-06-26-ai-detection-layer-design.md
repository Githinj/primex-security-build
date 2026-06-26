# AI Detection Layer — Design Spec

> Primex Security Platform — Phase 2 AI Detection
> Date: 2026-06-26

---

## 1. Overview

An AI-powered detection layer that analyzes camera feeds from Ant Media Server and automatically generates security alerts. A Python worker runs on a DO GPU Droplet, polling camera snapshots, running YOLOv8 inference, applying behavior heuristics, and posting detected events to a Supabase Edge Function that creates alerts and incidents.

This layer sits on top of the Ant Media streaming infrastructure (to be built separately) and feeds into the existing alert/incident pipeline with no changes to downstream flows.

## 2. Architecture

```
                        DO GPU Droplet
  ┌─────────────────────────────────────────────────────────────┐
  │              AI Detection Service (Python)                   │
  │                                                             │
  │  Supervisor                                                 │
  │  ├── Camera Task: CAM-01 (poll -> detect -> track -> alert) │
  │  ├── Camera Task: CAM-02 (poll -> detect -> track -> alert) │
  │  ├── Camera Task: CAM-03 ...                                │
  │  └── ... (one async task per online camera)                 │
  │                                                             │
  │  Shared Resources:                                          │
  │  ├── YOLOv8 Model (loaded once, shared across tasks)        │
  │  ├── GPU Inference Queue (serialize GPU access)             │
  │  └── Cooldown Registry (camera_id + event_type -> last)     │
  └──────────────────┬──────────────────────┬───────────────────┘
              snapshots from           frames to
              Ant Media REST           DO Spaces
               ┌─────┴─────┐    ┌──────────┴──────────┐
               │ Ant Media  │    │     DO Spaces       │
               │  Server    │    │  (frame storage)    │
               └────────────┘    └──────────┬──────────┘
                                            │ frame_url
                                   ┌────────┴────────┐
                                   │ Supabase Edge Fn │
                                   │(ai-event-ingest) │
                                   └────────┬────────┘
                                            │ INSERT
                                   ┌────────┴────────┐
                                   │   Supabase DB    │
                                   │ alerts+incidents │
                                   └────────┬────────┘
                                            │ Realtime
                                   ┌────────┴────────┐
                                   │   Next.js App    │
                                   │ (dispatcher UI)  │
                                   └─────────────────┘
```

### Data flow

1. Supervisor queries Supabase for online cameras with AI enabled, spawns/stops async tasks
2. Each camera task polls Ant Media snapshot API every 2 seconds
3. Frames queued for GPU inference (serialized to avoid CUDA contention)
4. YOLOv8 returns detections -> behavior tracker updates per-camera state
5. If detection exceeds confidence threshold (0.7) and passes cooldown (60s), triggering frame uploads to DO Spaces
6. Worker POSTs event to Supabase Edge Function -> inserts alert + incident -> Supabase Realtime notifies dispatchers

## 3. Detection Categories

| Event Type | Severity | Detection Method |
|---|---|---|
| `motion_afterhours` | Critical | Person/vehicle detection + time-of-day check against site business hours |
| `person_lingering` | Warning | Person detection + dwell tracker (>5 min same zone) |
| `concealment_behavior` | Critical | Person detection + posture heuristic (crouching near entry points for >30s, face covering) |
| `door_event` | Warning | Open door state in defined door zones + time threshold (>2 min) |
| `vehicle_detection` | Info | Vehicle class detection in restricted zones |

**Concealment false-positive mitigation:** The concealment heuristic (bbox aspect ratio <0.4) requires a secondary condition: the person must also be lingering near an `entry` zone for >30 seconds while in a crouching posture. Single-frame crouching detections (tying shoes, bending down) do not trigger alerts. This category can also be disabled per-camera via `camera_ai_config.zones` — if no `entry` zones are defined, concealment detection is skipped.

### Behavior tracking (per camera, in-memory)

```python
camera_state = {
    "tracks": {
        "person_001": {
            "class": "person",
            "first_seen": 1719400000.0,
            "last_seen": 1719400300.0,
            "positions": [(x1,y1), (x2,y2), ...],
            "zone": "loading_dock"
        }
    },
    "door_zones": {
        "zone_A": {"state": "open", "since": 1719400200.0}
    }
}
```

### Zone configuration

Each camera gets optional zones via `camera_ai_config.zones` (JSONB). Zone types: `door`, `restricted`, `entry`. Defined as named rectangular regions `{x1, y1, x2, y2}`.

If no zones configured: detection runs on full frame. Zone-specific events (door events, concealment near entry points) are skipped.

### Business hours

Stored per site in `site_business_hours`. `motion_afterhours` compares detection timestamp against configured hours in the site's timezone. If no hours configured, this event type is disabled for that site.

## 4. Database Schema Changes

### New ENUM type

```sql
CREATE TYPE detection_event_type AS ENUM (
  'motion_afterhours',
  'person_lingering',
  'concealment_behavior',
  'door_event',
  'vehicle_detection'
);
```

### Column added to `cameras` (streaming dependency)

The Phase 2 streaming spec will add this column. Listed here for completeness since the AI worker depends on it:

```sql
ALTER TABLE cameras ADD COLUMN stream_id TEXT;
```

`stream_id` maps to the Ant Media broadcast ID for snapshot polling. Cameras without a `stream_id` are skipped by the AI worker.

### New table: `camera_ai_config`

```sql
CREATE TABLE camera_ai_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id   UUID NOT NULL REFERENCES cameras(id) ON DELETE CASCADE UNIQUE,
  enabled     BOOLEAN NOT NULL DEFAULT true,
  zones       JSONB NOT NULL DEFAULT '[]',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_camera_ai_config_camera ON camera_ai_config(camera_id);

CREATE TRIGGER trg_camera_ai_config_updated_at BEFORE UPDATE ON camera_ai_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

Zones schema: `[{ "name": "string", "type": "door|restricted|entry", "coords": {"x1": 0, "y1": 0, "x2": 100, "y2": 100} }]`

### New table: `site_business_hours`

```sql
CREATE TABLE site_business_hours (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id   UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE UNIQUE,
  timezone  TEXT NOT NULL DEFAULT 'Australia/Sydney',
  hours     JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_site_business_hours_site ON site_business_hours(site_id);

CREATE TRIGGER trg_site_business_hours_updated_at BEFORE UPDATE ON site_business_hours
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

Hours schema: `{ "mon": {"open": "08:00", "close": "18:00"}, "tue": {...}, ... }`. Missing day = closed all day (after-hours detection active 24h).

### New table: `ai_worker_config` (singleton)

```sql
CREATE TABLE ai_worker_config (
  id                    INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  confidence_threshold  REAL NOT NULL DEFAULT 0.7,
  snapshot_interval_s   INT NOT NULL DEFAULT 2,
  cooldown_s            INT NOT NULL DEFAULT 60,
  dwell_threshold_s     INT NOT NULL DEFAULT 300,
  door_open_threshold_s INT NOT NULL DEFAULT 120,
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TRIGGER trg_ai_worker_config_updated_at BEFORE UPDATE ON ai_worker_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Seed the single config row
INSERT INTO ai_worker_config DEFAULT VALUES;
```

### Columns added to `alerts`

```sql
ALTER TABLE alerts
  ADD COLUMN frame_url    TEXT,
  ADD COLUMN confidence   REAL,
  ADD COLUMN event_type   detection_event_type,
  ADD COLUMN ai_metadata  JSONB;

CREATE INDEX idx_alerts_event_type ON alerts(event_type);
```

### RLS

- `camera_ai_config`: same CASE-based pattern as `cameras` (subqueries parent camera's site)
- `site_business_hours`: same CASE-based pattern as `sites`
- `ai_worker_config`: super_admin only (SELECT/UPDATE)
- New `alerts` columns: no RLS changes needed (existing policy covers)

### TypeScript types

```typescript
interface CameraAiConfig {
  id: string
  camera_id: string
  enabled: boolean
  zones: AiZone[]
}

interface AiZone {
  name: string
  type: 'door' | 'restricted' | 'entry'
  coords: { x1: number; y1: number; x2: number; y2: number }
}

interface SiteBusinessHours {
  id: string
  site_id: string
  timezone: string
  hours: Record<string, { open: string; close: string }>
}

interface AiWorkerConfig {
  id: number
  confidence_threshold: number
  snapshot_interval_s: number
  cooldown_s: number
  dwell_threshold_s: number
  door_open_threshold_s: number
  updated_at: string
}

// Added to existing Alert interface
interface Alert {
  // ...existing fields
  frame_url: string | null
  confidence: number | null
  event_type: 'motion_afterhours' | 'person_lingering' | 'concealment_behavior' | 'door_event' | 'vehicle_detection' | null
  ai_metadata: Record<string, unknown> | null
}
```

## 5. Supabase Edge Function: `ai-event-ingest`

**Endpoint:** `POST /functions/v1/ai-event-ingest`

**Auth:** Bearer token (`AI_WORKER_SECRET` in Edge Function secrets). Not a Supabase user JWT. The Edge Function uses the Supabase service role key internally to bypass RLS for inserts.

**Note on duplicate logic:** The existing `createAlert` server action in `src/lib/data/actions/alerts.ts` also performs alert + incident inserts. The Edge Function intentionally duplicates this pattern rather than calling the Next.js server action, keeping the AI pipeline decoupled from the web app. If the `alerts` or `incidents` schema changes (new required columns, constraint changes), both the Edge Function and the server action must be updated in lockstep. A code comment in both files should cross-reference the other.

### Request payload

```json
{
  "camera_id": "uuid",
  "site_id": "uuid",
  "event_type": "person_lingering",
  "confidence": 0.82,
  "frame_url": "https://spaces.do/primex-frames/cam-01/2026-06-26T10-15-00.jpg",
  "detections": [
    {
      "class": "person",
      "bbox": [120, 80, 340, 450],
      "track_id": "person_003",
      "zone": "loading_dock"
    }
  ],
  "metadata": {
    "dwell_seconds": 312,
    "door_zone": null,
    "business_hours_active": false
  }
}
```

### Processing logic

1. Validate `AI_WORKER_SECRET` from Authorization header
2. Validate required fields (`camera_id`, `site_id`, `event_type`, `confidence`)
3. Map `event_type` to alert title + severity:
   - `motion_afterhours` -> "After-hours motion detected" / Critical
   - `person_lingering` -> "Person lingering detected" / Warning
   - `concealment_behavior` -> "Suspicious concealment detected" / Critical
   - `door_event` -> "Door left open" / Warning
   - `vehicle_detection` -> "Vehicle in restricted zone" / Info
4. INSERT into `alerts` (title, site_id, camera_id, severity, status='New', source='AI Detection', description, frame_url, confidence, event_type, ai_metadata)
5. INSERT into `incidents` (title, site_id, alert_id, severity, status='Open', started_at=now(), notes=description)
6. Return `{ alert_id, incident_id }` with 201

### Error responses

- `401` — invalid or missing worker secret
- `400` — missing required fields or unknown event_type
- `500` — database insert failure

Supabase Realtime picks up the `alerts` INSERT automatically.

## 6. Python AI Worker

### Project structure

```
ai_worker/
├── main.py              # Entry point — loads config, starts supervisor
├── supervisor.py        # Manages camera task lifecycle
├── camera_task.py       # Per-camera async loop (poll -> detect -> track -> alert)
├── detector.py          # YOLOv8 model wrapper + GPU inference queue
├── behavior_tracker.py  # Dwell, concealment, door state tracking
├── cooldown.py          # Per camera+event_type cooldown registry
├── event_poster.py      # Uploads frame to DO Spaces, POSTs to Edge Function
├── config.py            # Loads worker config from Supabase (ai_worker_config)
└── requirements.txt     # ultralytics, httpx, boto3 (S3-compat for DO Spaces)
```

### Supervisor loop (`supervisor.py`)

Every 30 seconds:
1. Query Supabase: cameras JOIN camera_ai_config WHERE status='Online' AND enabled=true AND stream_id IS NOT NULL
2. Fetch site_business_hours for each site
3. Diff against running tasks:
   - New online cameras -> spawn camera_task
   - Cameras gone offline or AI disabled -> cancel task
   - Config changed (zones, business hours) -> update task config in place

### Camera task loop (`camera_task.py`)

```python
async def run(camera_id, stream_id, zones, business_hours):
    tracker = BehaviorTracker(zones, business_hours)
    while True:
        frame = await fetch_snapshot(stream_id)
        detections = await inference_queue.submit(frame)
        events = tracker.process(detections, time.now())
        for event in events:
            if cooldown.can_fire(camera_id, event.type):
                frame_url = await upload_frame(frame, camera_id)
                await post_event(camera_id, site_id, event, frame_url)
                cooldown.mark_fired(camera_id, event.type)
        await asyncio.sleep(SNAPSHOT_INTERVAL)
```

### Event type mapping (Python side)

The worker sends raw `event_type` strings. Severity mapping happens only in the Edge Function to keep a single source of truth:

| Worker sends (event_type) | Edge Function maps to (severity) |
|---|---|
| `motion_afterhours` | Critical |
| `person_lingering` | Warning |
| `concealment_behavior` | Critical |
| `door_event` | Warning |
| `vehicle_detection` | Info |

### GPU inference queue (`detector.py`)

- YOLOv8n model loaded once on startup
- `asyncio.Queue` serializes frame submissions (FIFO)
- Tasks await results via Future
- Throughput target: ~10-15 fps with `model.track()` (tracking mode is slower than `model.predict()`; enough for ~20-30 cameras at 2s intervals on a single T4/A100 GPU)
- If tracking overhead is too high at scale, snapshot interval can be increased to 3s as a fallback
- Uses `model.track()` for persistent track IDs across frames

### Behavior tracker (`behavior_tracker.py`)

Per-camera stateful tracker receiving raw detections each cycle:

- **Dwell tracking:** `track_id -> {first_seen, last_seen, zone}`. Person in same zone >300s -> `person_lingering`
- **Concealment heuristic:** Person bbox aspect ratio <0.4 (crouching) near `entry` zone for >30s -> `concealment_behavior`. Single-frame crouching is ignored.
- **After-hours check:** Person/vehicle detection outside `site_business_hours` -> `motion_afterhours`
- **Door state:** `door` zone changes from closed->open (baseline frame diff), open >120s -> `door_event`
- **Vehicle in restricted zone:** Vehicle class bbox center inside `restricted` zone -> `vehicle_detection`
- Track pruning: tracks disappearing for >10s are removed from state

### Cooldown (`cooldown.py`)

- Fixed 60-second cooldown per `(camera_id, event_type)` pair
- `can_fire()` checks if last fired time + cooldown_s < now
- `mark_fired()` records current timestamp
- In-memory dict, resets on worker restart (acceptable — worst case is one duplicate alert)

## 7. Frontend Changes

### 7.1 AI badge on alerts

Alerts with `source = 'AI Detection'` render a blue AI pill next to the title in all alert list views:
- `AlertsClient` (super admin)
- Manager `CompanyAlerts`
- Portal `PortalAlerts`
- Dispatcher `AlertQueue`

Conditional render using existing `Pill` component with `tone="blue"`. No new component needed.

### 7.2 Frame snapshot in alert detail

On `alerts/[id]/alert-detail-client.tsx`, when `frame_url` is not null:
- 16:9 container (matching CameraTile preview style)
- Actual snapshot image from DO Spaces
- Overlay: confidence score pill, event type label
- Bounding box overlays from `ai_metadata` (optional Phase 2.1 enhancement)

### 7.3 AI detection config on camera detail

On `cameras/[id]/camera-detail-client.tsx`, new card below "Camera info":
- AI Detection card: enabled/disabled toggle, zone count display
- Zone editor (drawing rectangles on camera frame) deferred to future iteration
- For launch: zones configured via seed data or direct DB entry

### 7.4 Realtime alert subscription

`useRealtimeAlerts` hook for dispatcher console:

```typescript
supabase
  .channel('ai-alerts')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'alerts' },
    (payload) => { /* toast notification + refresh alert list */ }
  )
  .subscribe()
```

Toast notification on new AI alert with title and severity. Click navigates to alert detail.

## 8. Error Handling

### Camera task errors

- **Snapshot fetch fails:** Log warning, skip cycle, continue. After 5 consecutive failures, mark degraded in health output. Supervisor cancels on next sync when camera is offline in DB.
- **Inference fails:** Log error, skip frame, continue. >10 consecutive GPU errors -> supervisor pauses all tasks 30s, retries (circuit breaker).
- **Edge Function POST fails:** Retry 3x with exponential backoff (1s, 2s, 4s). After 3 failures, log to `missed_events.jsonl`. A `replay_missed.py` script is included in `ai_worker/` to replay missed events by reading the JSONL file and re-posting each event to the Edge Function. At launch this is a manual recovery tool; automated replay is out of scope.
- **Frame upload fails:** Alert created with `frame_url = null`. Alert still useful without snapshot.

### Worker restart

All in-memory state (dwell trackers, cooldown registry) lost on restart:
- Dwell trackers rebuild within seconds as detections resume
- Cooldown resets — worst case is one duplicate alert (preferable to missing an alert)
- Supervisor re-syncs camera list from Supabase immediately

## 9. Health & Monitoring

HTTP health endpoint (`GET /health` on port 8080):

```json
{
  "status": "healthy",
  "active_cameras": 34,
  "gpu_utilization": 0.72,
  "frames_processed_last_min": 1020,
  "alerts_fired_last_min": 3,
  "uptime_s": 86400
}
```

Sufficient for DO uptime checks and manual debugging at launch. No external monitoring stack required.

## 10. Security

- `AI_WORKER_SECRET` for Edge Function auth — rotatable, stored as env var on Droplet
- Supabase service role key for reading camera/config tables — scoped to SELECT only via dedicated Postgres role
- DO Spaces credentials scoped to single bucket (`primex-frames`)

## 11. Key Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Architecture | Camera-per-task async Python | Isolation without multi-service complexity |
| Model | YOLOv8n self-hosted on DO GPU | Full control, flat cost, no data leaving infra |
| Detection scope | All 5 categories at launch | Maximum client value from day one |
| Snapshot storage | DO Spaces (write) + Supabase (reference) | Fast writes on same DO network |
| Alert ingestion | Supabase Edge Function | Decoupled from Next.js, stays in Supabase ecosystem |
| Realtime | Supabase Realtime on alerts INSERT | Zero extra infra, already using Supabase |
| Cooldown | 60s fixed per camera per event type | Simple, predictable, no tuning needed |
| Confidence threshold | Single global 0.7 | Simple to configure, adjust later if needed |

## 12. Dependencies

This spec assumes the following are in place before implementation:
- Ant Media Server deployed and accepting RTSP streams from cameras
- Camera streaming (Phase 2) built — cameras table has `stream_id` column mapping to Ant Media broadcast IDs
- DO GPU Droplet provisioned with CUDA drivers
- DO Spaces bucket (`primex-frames`) created
- Supabase Edge Functions enabled on the project

## 13. Out of Scope

- Zone editor UI (drawing rectangles on camera frames) — future iteration
- AI-powered report generation (Claude Vision for post-incident summaries) — Phase 3
- Multi-GPU / distributed worker scaling — only needed at very high camera counts
- Custom model training / fine-tuning — YOLOv8n pretrained is sufficient for launch
- Bounding box overlay rendering on frame snapshots — Phase 2.1 enhancement
- Automated missed event replay — manual script provided, automation deferred
