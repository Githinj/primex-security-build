# AI Detection Layer Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the AI detection pipeline — database schema, Supabase Edge Function for alert ingestion, Python worker for camera analysis, and frontend UI changes for AI alerts.

**Architecture:** A Python worker on a DO GPU Droplet polls camera snapshots from Ant Media, runs YOLOv8 inference + behavior heuristics, and posts detected events to a Supabase Edge Function that creates alerts/incidents. The frontend shows AI badges, frame snapshots, and realtime toast notifications.

**Tech Stack:** PostgreSQL (Supabase), Supabase Edge Functions (Deno), Python 3.11+ (asyncio, ultralytics, httpx, boto3), Next.js 16 (TypeScript, Tailwind v4), Supabase Realtime

**Spec:** `docs/superpowers/specs/2026-06-26-ai-detection-layer-design.md`

---

## Chunk 1: Database Schema & Types

### Task 1: Create migration file for AI detection tables

**Files:**
- Create: `supabase/migrations/002_ai_detection.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- 002_ai_detection.sql
-- AI Detection Layer schema changes
-- Spec: docs/superpowers/specs/2026-06-26-ai-detection-layer-design.md

-- New ENUM for detection event types
CREATE TYPE detection_event_type AS ENUM (
  'motion_afterhours',
  'person_lingering',
  'concealment_behavior',
  'door_event',
  'vehicle_detection'
);

-- stream_id on cameras (Ant Media broadcast ID)
-- NOTE: This column is also needed by the Phase 2 streaming spec.
-- Using IF NOT EXISTS to avoid conflict if streaming migration runs first.
ALTER TABLE cameras ADD COLUMN IF NOT EXISTS stream_id TEXT;

-- Per-camera AI configuration
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

-- Per-site business hours (for after-hours detection)
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

-- Global AI worker config (singleton table)
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

INSERT INTO ai_worker_config DEFAULT VALUES;

-- New columns on alerts for AI detections
ALTER TABLE alerts
  ADD COLUMN frame_url    TEXT,
  ADD COLUMN confidence   REAL,
  ADD COLUMN event_type   detection_event_type,
  ADD COLUMN ai_metadata  JSONB;

CREATE INDEX idx_alerts_event_type ON alerts(event_type);

-- ─── RLS ──────────────────────────────────────────────────

ALTER TABLE camera_ai_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_worker_config ENABLE ROW LEVEL SECURITY;

-- camera_ai_config: same pattern as cameras (subqueries camera -> site -> company)
CREATE POLICY camera_ai_config_access ON camera_ai_config FOR ALL USING (
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

-- site_business_hours: same pattern as sites
CREATE POLICY site_business_hours_access ON site_business_hours FOR ALL USING (
  CASE get_user_role()
    WHEN 'super_admin' THEN true
    WHEN 'dispatcher' THEN true
    WHEN 'company_manager' THEN site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
    WHEN 'client' THEN site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
    WHEN 'guard' THEN site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
    ELSE false
  END
);

-- ai_worker_config: super_admin only
CREATE POLICY ai_worker_config_admin ON ai_worker_config
  FOR ALL USING (get_user_role() = 'super_admin');

-- ─── GRANTS ───────────────────────────────────────────────

GRANT ALL ON camera_ai_config TO authenticated;
GRANT ALL ON site_business_hours TO authenticated;
GRANT ALL ON ai_worker_config TO authenticated;
```

- [ ] **Step 2: Verify migration syntax**

Run: `cd primex && npx supabase db lint`
Expected: No syntax errors.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/002_ai_detection.sql
git commit -m "feat: add AI detection schema — tables, ENUM, RLS, indexes (SEC-AI-01)"
```

---

### Task 2: Update TypeScript types

**Files:**
- Modify: `src/lib/types/index.ts`

- [ ] **Step 1: Add new types to `src/lib/types/index.ts`**

After the existing `Camera` interface (line 39), add:

```typescript
export type DetectionEventType = 'motion_afterhours' | 'person_lingering' | 'concealment_behavior' | 'door_event' | 'vehicle_detection'

export interface AiZone {
  name: string
  type: 'door' | 'restricted' | 'entry'
  coords: { x1: number; y1: number; x2: number; y2: number }
}

export interface CameraAiConfig {
  id: string
  camera_id: string
  enabled: boolean
  zones: AiZone[]
}

export interface SiteBusinessHours {
  id: string
  site_id: string
  timezone: string
  hours: Record<string, { open: string; close: string }>
}

export interface AiWorkerConfig {
  id: number
  confidence_threshold: number
  snapshot_interval_s: number
  cooldown_s: number
  dwell_threshold_s: number
  door_open_threshold_s: number
  updated_at: string
}
```

- [ ] **Step 2: Add AI fields to the existing `Alert` interface**

In `src/lib/types/index.ts`, update the `Alert` interface (lines 55-65). Add after `source: string`:

```typescript
  frame_url: string | null
  confidence: number | null
  event_type: DetectionEventType | null
  ai_metadata: Record<string, unknown> | null
```

- [ ] **Step 3: Verify the project compiles**

Run: `cd primex && npx next build --no-lint 2>&1 | head -20`
Expected: Build starts without type errors. (Full build may fail for unrelated reasons — check for type errors only.)

- [ ] **Step 4: Commit**

```bash
git add src/lib/types/index.ts
git commit -m "feat: add AI detection TypeScript types (SEC-AI-02)"
```

---

### Task 3: Add seed data for AI config tables

**Files:**
- Modify: `supabase/seed.sql`

- [ ] **Step 1: Add AI config seed data at the end of `supabase/seed.sql`**

```sql
-- ===================  AI DETECTION CONFIG  ==================

-- Camera AI configs (enable AI on first 4 cameras, with zones on CAM-01 and CAM-03)
INSERT INTO camera_ai_config (camera_id, enabled, zones) VALUES
  ('00000000-0000-0000-0000-0000000ca001', true,
   '[{"name":"Main Entry","type":"entry","coords":{"x1":0,"y1":0,"x2":320,"y2":480}},{"name":"Front Door","type":"door","coords":{"x1":280,"y1":100,"x2":360,"y2":400}}]'),
  ('00000000-0000-0000-0000-0000000ca002', true, '[]'),
  ('00000000-0000-0000-0000-0000000ca003', true,
   '[{"name":"Loading Dock Gate","type":"door","coords":{"x1":100,"y1":50,"x2":540,"y2":400}},{"name":"Dock Restricted","type":"restricted","coords":{"x1":0,"y1":300,"x2":640,"y2":480}}]'),
  ('00000000-0000-0000-0000-0000000ca004', true, '[]'),
  ('00000000-0000-0000-0000-0000000ca005', false, '[]');

-- Site business hours
INSERT INTO site_business_hours (site_id, timezone, hours) VALUES
  ('00000000-0000-0000-0000-00000000b001', 'Australia/Sydney',
   '{"mon":{"open":"08:00","close":"18:00"},"tue":{"open":"08:00","close":"18:00"},"wed":{"open":"08:00","close":"18:00"},"thu":{"open":"08:00","close":"18:00"},"fri":{"open":"08:00","close":"18:00"}}'),
  ('00000000-0000-0000-0000-00000000b002', 'Australia/Sydney',
   '{"mon":{"open":"09:00","close":"17:00"},"tue":{"open":"09:00","close":"17:00"},"wed":{"open":"09:00","close":"17:00"},"thu":{"open":"09:00","close":"17:00"},"fri":{"open":"09:00","close":"17:00"},"sat":{"open":"10:00","close":"14:00"}}'),
  ('00000000-0000-0000-0000-00000000b003', 'Australia/Sydney',
   '{"mon":{"open":"06:00","close":"22:00"},"tue":{"open":"06:00","close":"22:00"},"wed":{"open":"06:00","close":"22:00"},"thu":{"open":"06:00","close":"22:00"},"fri":{"open":"06:00","close":"22:00"},"sat":{"open":"06:00","close":"22:00"},"sun":{"open":"06:00","close":"22:00"}}');
```

- [ ] **Step 2: Commit**

```bash
git add supabase/seed.sql
git commit -m "feat: add AI config seed data — camera zones and business hours (SEC-AI-03)"
```

---

### Task 4: Add data query modules for AI config

**Files:**
- Create: `src/lib/data/camera-ai-config.ts`
- Create: `src/lib/data/site-business-hours.ts`

- [ ] **Step 1: Create `src/lib/data/camera-ai-config.ts`**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { CameraAiConfig } from '@/lib/types'

export async function getCameraAiConfig(cameraId: string): Promise<CameraAiConfig | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('camera_ai_config')
    .select('*')
    .eq('camera_id', cameraId)
    .single()
  if (error) return null
  return data
}
```

- [ ] **Step 2: Create `src/lib/data/site-business-hours.ts`**

```typescript
import { createServerSupabaseClient } from '@/lib/supabase/server'
import type { SiteBusinessHours } from '@/lib/types'

export async function getSiteBusinessHours(siteId: string): Promise<SiteBusinessHours | null> {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase
    .from('site_business_hours')
    .select('*')
    .eq('site_id', siteId)
    .single()
  if (error) return null
  return data
}
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/data/camera-ai-config.ts src/lib/data/site-business-hours.ts
git commit -m "feat: add data query modules for AI config tables (SEC-AI-04)"
```

---

### Task 5: Add server action for toggling AI config

**Files:**
- Create: `src/lib/data/actions/camera-ai-config.ts`

- [ ] **Step 1: Create `src/lib/data/actions/camera-ai-config.ts`**

```typescript
'use server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { requireRole } from '@/lib/auth/require-role'

export async function toggleCameraAi(cameraId: string, enabled: boolean) {
  await requireRole('super_admin', 'company_manager')
  const supabase = await createServerSupabaseClient()

  // Upsert: create config if it doesn't exist, update if it does
  const { error } = await supabase
    .from('camera_ai_config')
    .upsert({ camera_id: cameraId, enabled }, { onConflict: 'camera_id' })
  if (error) throw error

  revalidatePath(`/cameras/${cameraId}`)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/data/actions/camera-ai-config.ts
git commit -m "feat: add toggleCameraAi server action (SEC-AI-05)"
```

---

## Chunk 2: Supabase Edge Function

### Task 6: Create the `ai-event-ingest` Edge Function

**Files:**
- Create: `supabase/functions/ai-event-ingest/index.ts`

**Docs to check:** Supabase Edge Functions docs for Deno runtime, `createClient` from `@supabase/supabase-js`.

- [ ] **Step 1: Create Edge Function directory**

```bash
mkdir -p supabase/functions/ai-event-ingest
```

- [ ] **Step 2: Create `supabase/functions/ai-event-ingest/index.ts`**

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VALID_EVENT_TYPES = [
  'motion_afterhours',
  'person_lingering',
  'concealment_behavior',
  'door_event',
  'vehicle_detection',
] as const

type EventType = typeof VALID_EVENT_TYPES[number]

const EVENT_MAP: Record<EventType, { title: string; severity: string }> = {
  motion_afterhours: { title: 'After-hours motion detected', severity: 'Critical' },
  person_lingering: { title: 'Person lingering detected', severity: 'Warning' },
  concealment_behavior: { title: 'Suspicious concealment detected', severity: 'Critical' },
  door_event: { title: 'Door left open', severity: 'Warning' },
  vehicle_detection: { title: 'Vehicle in restricted zone', severity: 'Info' },
}

interface AiEventPayload {
  camera_id: string
  site_id: string
  event_type: string
  confidence: number
  frame_url?: string | null
  detections?: unknown[]
  metadata?: Record<string, unknown>
}

serve(async (req: Request) => {
  // Only accept POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  // Validate worker secret
  const authHeader = req.headers.get('Authorization')
  const workerSecret = Deno.env.get('AI_WORKER_SECRET')
  if (!authHeader || authHeader !== `Bearer ${workerSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  // Parse body
  let body: AiEventPayload
  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), { status: 400 })
  }

  // Validate required fields
  const { camera_id, site_id, event_type, confidence, frame_url, detections, metadata } = body
  if (!camera_id || !site_id || !event_type || confidence === undefined) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: camera_id, site_id, event_type, confidence' }),
      { status: 400 }
    )
  }

  // Validate event_type
  if (!VALID_EVENT_TYPES.includes(event_type as EventType)) {
    return new Response(
      JSON.stringify({ error: `Unknown event_type: ${event_type}` }),
      { status: 400 }
    )
  }

  const eventConfig = EVENT_MAP[event_type as EventType]

  // Build description from metadata
  const description = metadata
    ? `AI detected ${event_type.replace(/_/g, ' ')}. Confidence: ${(confidence * 100).toFixed(0)}%.`
    : `AI detection event: ${event_type}`

  // Create Supabase client with service role key (bypasses RLS)
  // NOTE: This duplicates the alert+incident insert pattern from
  // src/lib/data/actions/alerts.ts (createAlert). If the alerts or incidents
  // schema changes, both this Edge Function and createAlert must be updated.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  // Insert alert
  const { data: alertData, error: alertError } = await supabase
    .from('alerts')
    .insert({
      title: eventConfig.title,
      site_id,
      camera_id,
      severity: eventConfig.severity,
      status: 'New',
      source: 'AI Detection',
      description,
      frame_url: frame_url ?? null,
      confidence,
      event_type,
      ai_metadata: { detections: detections ?? [], metadata: metadata ?? {} },
    })
    .select('id')
    .single()

  if (alertError) {
    return new Response(
      JSON.stringify({ error: 'Failed to create alert', detail: alertError.message }),
      { status: 500 }
    )
  }

  // Insert linked incident
  const { data: incidentData, error: incidentError } = await supabase
    .from('incidents')
    .insert({
      title: eventConfig.title,
      site_id,
      alert_id: alertData.id,
      severity: eventConfig.severity,
      status: 'Open',
      guard_id: null,
      started_at: new Date().toISOString(),
      notes: description,
    })
    .select('id')
    .single()

  if (incidentError) {
    // Alert was created but incident failed — log but don't fail the whole request
    console.error('Failed to create linked incident:', incidentError.message)
  }

  return new Response(
    JSON.stringify({
      alert_id: alertData.id,
      incident_id: incidentData?.id ?? null,
    }),
    { status: 201, headers: { 'Content-Type': 'application/json' } }
  )
})
```

- [ ] **Step 3: Add cross-reference comment to `src/lib/data/actions/alerts.ts`**

Add a comment at the top of `createAlert` in `src/lib/data/actions/alerts.ts`:

```typescript
// NOTE: The AI detection Edge Function (supabase/functions/ai-event-ingest/index.ts)
// duplicates this alert+incident insert pattern. If the schema changes,
// update both this file and the Edge Function in lockstep.
```

- [ ] **Step 4: Commit**

```bash
git add supabase/functions/ai-event-ingest/index.ts src/lib/data/actions/alerts.ts
git commit -m "feat: add ai-event-ingest Edge Function for AI alert ingestion (SEC-AI-06)"
```

---

## Chunk 3: Python AI Worker

### Task 7: Create worker project structure and config

**Files:**
- Create: `ai_worker/requirements.txt`
- Create: `ai_worker/config.py`
- Create: `ai_worker/.env.example`

- [ ] **Step 1: Create `ai_worker/requirements.txt`**

```
ultralytics>=8.0.0
httpx>=0.25.0
boto3>=1.28.0
supabase>=2.0.0
python-dotenv>=1.0.0
aiohttp>=3.9.0
```

- [ ] **Step 2: Create `ai_worker/.env.example`**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJ...
AI_WORKER_SECRET=your-worker-secret-here
ANTMEDIA_URL=http://your-antmedia-server:5080
ANTMEDIA_TOKEN=your-antmedia-token
DO_SPACES_ENDPOINT=https://sgp1.digitaloceanspaces.com
DO_SPACES_KEY=your-spaces-key
DO_SPACES_SECRET=your-spaces-secret
DO_SPACES_BUCKET=primex-frames
```

- [ ] **Step 3: Create `ai_worker/config.py`**

```python
"""Loads worker configuration from Supabase ai_worker_config table."""

import os
from dataclasses import dataclass, field
from supabase import create_client


@dataclass
class WorkerConfig:
    confidence_threshold: float = 0.7
    snapshot_interval_s: int = 2
    cooldown_s: int = 60
    dwell_threshold_s: int = 300
    door_open_threshold_s: int = 120


def load_config() -> WorkerConfig:
    """Fetch singleton config from ai_worker_config table."""
    url = os.environ["SUPABASE_URL"]
    key = os.environ["SUPABASE_SERVICE_KEY"]
    client = create_client(url, key)

    resp = client.table("ai_worker_config").select("*").eq("id", 1).single().execute()
    row = resp.data
    if not row:
        return WorkerConfig()

    return WorkerConfig(
        confidence_threshold=row["confidence_threshold"],
        snapshot_interval_s=row["snapshot_interval_s"],
        cooldown_s=row["cooldown_s"],
        dwell_threshold_s=row["dwell_threshold_s"],
        door_open_threshold_s=row["door_open_threshold_s"],
    )
```

- [ ] **Step 4: Commit**

```bash
git add ai_worker/requirements.txt ai_worker/.env.example ai_worker/config.py
git commit -m "feat: add AI worker project structure and config loader (SEC-AI-07)"
```

---

### Task 8: Create Python test infrastructure and cooldown module

**Files:**
- Create: `ai_worker/pyproject.toml`
- Create: `ai_worker/tests/__init__.py`
- Create: `ai_worker/cooldown.py`
- Create: `ai_worker/tests/test_cooldown.py`

- [ ] **Step 0: Create `ai_worker/pyproject.toml` for test config**

```toml
[tool.pytest.ini_options]
pythonpath = ["."]
testpaths = ["tests"]
```

- [ ] **Step 0b: Create `ai_worker/tests/__init__.py`**

```python
```

(Empty file — marks tests as a package.)

- [ ] **Step 1: Write the test file `ai_worker/tests/test_cooldown.py`**

```python
"""Tests for cooldown registry."""

import time
from cooldown import CooldownRegistry


def test_can_fire_when_never_fired():
    registry = CooldownRegistry(cooldown_s=60)
    assert registry.can_fire("cam-01", "person_lingering") is True


def test_cannot_fire_within_cooldown():
    registry = CooldownRegistry(cooldown_s=60)
    registry.mark_fired("cam-01", "person_lingering")
    assert registry.can_fire("cam-01", "person_lingering") is False


def test_can_fire_after_cooldown_expires(monkeypatch):
    registry = CooldownRegistry(cooldown_s=1)
    registry.mark_fired("cam-01", "person_lingering")
    # Simulate time passing
    future = time.time() + 2
    monkeypatch.setattr(time, "time", lambda: future)
    assert registry.can_fire("cam-01", "person_lingering") is True


def test_different_event_types_independent():
    registry = CooldownRegistry(cooldown_s=60)
    registry.mark_fired("cam-01", "person_lingering")
    assert registry.can_fire("cam-01", "motion_afterhours") is True


def test_different_cameras_independent():
    registry = CooldownRegistry(cooldown_s=60)
    registry.mark_fired("cam-01", "person_lingering")
    assert registry.can_fire("cam-02", "person_lingering") is True
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ai_worker && python -m pytest tests/test_cooldown.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'cooldown'`

- [ ] **Step 3: Create `ai_worker/cooldown.py`**

```python
"""Per camera+event_type cooldown registry."""

import time


class CooldownRegistry:
    def __init__(self, cooldown_s: int = 60):
        self.cooldown_s = cooldown_s
        self._last_fired: dict[tuple[str, str], float] = {}

    def can_fire(self, camera_id: str, event_type: str) -> bool:
        key = (camera_id, event_type)
        last = self._last_fired.get(key)
        if last is None:
            return True
        return time.time() - last >= self.cooldown_s

    def mark_fired(self, camera_id: str, event_type: str) -> None:
        self._last_fired[(camera_id, event_type)] = time.time()
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ai_worker && python -m pytest tests/test_cooldown.py -v`
Expected: All 5 tests PASS

- [ ] **Step 5: Commit**

```bash
git add ai_worker/pyproject.toml ai_worker/tests/__init__.py ai_worker/cooldown.py ai_worker/tests/test_cooldown.py
git commit -m "feat: add cooldown registry with tests and pytest config (SEC-AI-08)"
```

---

### Task 9: Create behavior tracker module

**Files:**
- Create: `ai_worker/behavior_tracker.py`
- Create: `ai_worker/tests/test_behavior_tracker.py`

- [ ] **Step 1: Write the test file `ai_worker/tests/test_behavior_tracker.py`**

```python
"""Tests for behavior tracker."""

from behavior_tracker import BehaviorTracker, Detection, SecurityEvent


def make_person(track_id="p1", x1=100, y1=100, x2=200, y2=400, conf=0.8):
    """Helper: create a person detection."""
    return Detection(
        cls="person", bbox=(x1, y1, x2, y2),
        confidence=conf, track_id=track_id,
    )


def make_vehicle(track_id="v1", x1=100, y1=100, x2=300, y2=300, conf=0.85):
    """Helper: create a vehicle detection."""
    return Detection(
        cls="car", bbox=(x1, y1, x2, y2),
        confidence=conf, track_id=track_id,
    )


ENTRY_ZONE = [{"name": "entry1", "type": "entry", "coords": {"x1": 50, "y1": 50, "x2": 250, "y2": 450}}]
RESTRICTED_ZONE = [{"name": "restricted1", "type": "restricted", "coords": {"x1": 50, "y1": 50, "x2": 350, "y2": 350}}]
DOOR_ZONE = [{"name": "door1", "type": "door", "coords": {"x1": 100, "y1": 100, "x2": 300, "y2": 400}}]
BIZ_HOURS = {"mon": {"open": "08:00", "close": "18:00"}}


def test_no_events_on_empty_detections():
    tracker = BehaviorTracker(zones=[], business_hours={}, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    events = tracker.process([], timestamp=1000.0)
    assert events == []


def test_person_lingering_fires_after_dwell():
    tracker = BehaviorTracker(zones=[], business_hours={}, timezone="UTC", dwell_threshold_s=10, door_open_threshold_s=120)
    person = make_person()
    # First 9 seconds: no event
    for t in range(10):
        events = tracker.process([person], timestamp=1000.0 + t)
    assert all(e.event_type != "person_lingering" for e in events)
    # At 11 seconds: should fire
    events = tracker.process([person], timestamp=1011.0)
    types = [e.event_type for e in events]
    assert "person_lingering" in types


def test_afterhours_motion_fires_outside_hours():
    # Tuesday 23:00 UTC = outside business hours (mon 08-18 only, no tue defined)
    tracker = BehaviorTracker(zones=[], business_hours=BIZ_HOURS, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    # Timestamp for a Tuesday at 23:00 UTC
    import datetime
    tue_23 = datetime.datetime(2026, 6, 30, 23, 0, 0).timestamp()  # Tuesday
    person = make_person()
    events = tracker.process([person], timestamp=tue_23)
    types = [e.event_type for e in events]
    assert "motion_afterhours" in types


def test_no_afterhours_during_business_hours():
    tracker = BehaviorTracker(zones=[], business_hours=BIZ_HOURS, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    import datetime
    mon_10 = datetime.datetime(2026, 6, 29, 10, 0, 0).timestamp()  # Monday 10:00
    person = make_person()
    events = tracker.process([person], timestamp=mon_10)
    types = [e.event_type for e in events]
    assert "motion_afterhours" not in types


def test_vehicle_in_restricted_zone():
    tracker = BehaviorTracker(zones=RESTRICTED_ZONE, business_hours={}, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    vehicle = make_vehicle(x1=100, y1=100, x2=300, y2=300)  # center at 200,200 — inside restricted
    events = tracker.process([vehicle], timestamp=1000.0)
    types = [e.event_type for e in events]
    assert "vehicle_detection" in types


def test_concealment_requires_entry_zone_and_duration():
    tracker = BehaviorTracker(zones=ENTRY_ZONE, business_hours={}, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    # Crouching person (aspect ratio < 0.4): wide and short bbox
    crouching = make_person(x1=100, y1=350, x2=250, y2=400)  # w=150, h=50 -> ratio=0.33
    # Single frame should NOT trigger
    events = tracker.process([crouching], timestamp=1000.0)
    types = [e.event_type for e in events]
    assert "concealment_behavior" not in types
    # After 31 seconds of crouching near entry zone -> should trigger
    for t in range(1, 32):
        events = tracker.process([crouching], timestamp=1000.0 + t)
    types = [e.event_type for e in events]
    assert "concealment_behavior" in types


def test_door_event_fires_after_threshold():
    tracker = BehaviorTracker(zones=DOOR_ZONE, business_hours={}, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=5)
    # Simulate door open by calling mark_door_open directly
    tracker.mark_door_open("door1", timestamp=1000.0)
    # Before threshold: no event
    events = tracker.process([], timestamp=1004.0)
    types = [e.event_type for e in events]
    assert "door_event" not in types
    # After threshold: should fire
    events = tracker.process([], timestamp=1006.0)
    types = [e.event_type for e in events]
    assert "door_event" in types


def test_track_pruning_after_disappearance():
    tracker = BehaviorTracker(zones=[], business_hours={}, timezone="UTC", dwell_threshold_s=300, door_open_threshold_s=120)
    person = make_person(track_id="p1")
    tracker.process([person], timestamp=1000.0)
    assert "p1" in tracker._tracks
    # Person disappears for 11 seconds
    tracker.process([], timestamp=1011.0)
    assert "p1" not in tracker._tracks
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd ai_worker && python -m pytest tests/test_behavior_tracker.py -v`
Expected: FAIL — `ModuleNotFoundError: No module named 'behavior_tracker'`

- [ ] **Step 3: Create `ai_worker/behavior_tracker.py`**

```python
"""Per-camera behavior tracker — dwell, concealment, after-hours, door, vehicle."""

import datetime
from dataclasses import dataclass, field


@dataclass
class Detection:
    cls: str  # "person", "car", "truck", etc.
    bbox: tuple[int, int, int, int]  # (x1, y1, x2, y2)
    confidence: float
    track_id: str


@dataclass
class SecurityEvent:
    event_type: str
    confidence: float
    track_id: str | None = None
    zone: str | None = None
    metadata: dict = field(default_factory=dict)


@dataclass
class _TrackState:
    cls: str
    first_seen: float
    last_seen: float
    bbox: tuple[int, int, int, int]
    zone: str | None = None
    crouching_since: float | None = None


PERSON_CLASSES = {"person"}
VEHICLE_CLASSES = {"car", "truck", "bus", "motorcycle"}
PRUNE_TIMEOUT_S = 10


class BehaviorTracker:
    def __init__(
        self,
        zones: list[dict],
        business_hours: dict,
        timezone: str = "UTC",
        dwell_threshold_s: int = 300,
        door_open_threshold_s: int = 120,
    ):
        self.zones = zones
        self.business_hours = business_hours
        self.timezone = timezone
        self.dwell_threshold_s = dwell_threshold_s
        self.door_open_threshold_s = door_open_threshold_s
        self._tracks: dict[str, _TrackState] = {}
        self._door_state: dict[str, float] = {}  # zone_name -> open_since timestamp

    def mark_door_open(self, zone_name: str, timestamp: float) -> None:
        """Mark a door zone as open. Called externally or by frame-diff logic."""
        if zone_name not in self._door_state:
            self._door_state[zone_name] = timestamp

    def mark_door_closed(self, zone_name: str) -> None:
        """Mark a door zone as closed."""
        self._door_state.pop(zone_name, None)

    def process(self, detections: list[Detection], timestamp: float) -> list[SecurityEvent]:
        events: list[SecurityEvent] = []
        seen_track_ids: set[str] = set()

        for det in detections:
            seen_track_ids.add(det.track_id)
            is_person = det.cls in PERSON_CLASSES
            is_vehicle = det.cls in VEHICLE_CLASSES

            # Update or create track
            if det.track_id in self._tracks:
                track = self._tracks[det.track_id]
                track.last_seen = timestamp
                track.bbox = det.bbox
            else:
                track = _TrackState(
                    cls=det.cls,
                    first_seen=timestamp,
                    last_seen=timestamp,
                    bbox=det.bbox,
                )
                self._tracks[det.track_id] = track

            # Determine zone
            center_x = (det.bbox[0] + det.bbox[2]) / 2
            center_y = (det.bbox[1] + det.bbox[3]) / 2
            track.zone = self._get_zone(center_x, center_y)

            # After-hours check
            if (is_person or is_vehicle) and self._is_after_hours(timestamp):
                events.append(SecurityEvent(
                    event_type="motion_afterhours",
                    confidence=det.confidence,
                    track_id=det.track_id,
                    metadata={"business_hours_active": False},
                ))

            # Dwell / lingering
            if is_person:
                dwell = timestamp - track.first_seen
                if dwell >= self.dwell_threshold_s:
                    events.append(SecurityEvent(
                        event_type="person_lingering",
                        confidence=det.confidence,
                        track_id=det.track_id,
                        zone=track.zone,
                        metadata={"dwell_seconds": dwell},
                    ))

            # Concealment heuristic
            if is_person:
                w = det.bbox[2] - det.bbox[0]
                h = det.bbox[3] - det.bbox[1]
                aspect_ratio = h / w if w > 0 else 1.0
                is_crouching = aspect_ratio < 0.4
                near_entry = self._is_near_zone_type(center_x, center_y, "entry")

                if is_crouching and near_entry:
                    if track.crouching_since is None:
                        track.crouching_since = timestamp
                    elif timestamp - track.crouching_since >= 30:
                        events.append(SecurityEvent(
                            event_type="concealment_behavior",
                            confidence=det.confidence,
                            track_id=det.track_id,
                            zone=track.zone,
                        ))
                else:
                    track.crouching_since = None

            # Vehicle in restricted zone
            if is_vehicle and self._is_near_zone_type(center_x, center_y, "restricted"):
                events.append(SecurityEvent(
                    event_type="vehicle_detection",
                    confidence=det.confidence,
                    track_id=det.track_id,
                    zone=track.zone,
                ))

        # Door events: check if any door zone has been open past threshold
        for zone_name, open_since in list(self._door_state.items()):
            if timestamp - open_since >= self.door_open_threshold_s:
                events.append(SecurityEvent(
                    event_type="door_event",
                    confidence=1.0,
                    zone=zone_name,
                    metadata={"open_seconds": timestamp - open_since},
                ))

        # Prune disappeared tracks
        to_prune = [
            tid for tid, t in self._tracks.items()
            if tid not in seen_track_ids and timestamp - t.last_seen > PRUNE_TIMEOUT_S
        ]
        for tid in to_prune:
            del self._tracks[tid]

        return events

    def _get_zone(self, x: float, y: float) -> str | None:
        for zone in self.zones:
            c = zone["coords"]
            if c["x1"] <= x <= c["x2"] and c["y1"] <= y <= c["y2"]:
                return zone["name"]
        return None

    def _is_near_zone_type(self, x: float, y: float, zone_type: str) -> bool:
        for zone in self.zones:
            if zone["type"] != zone_type:
                continue
            c = zone["coords"]
            if c["x1"] <= x <= c["x2"] and c["y1"] <= y <= c["y2"]:
                return True
        return False

    def _is_after_hours(self, timestamp: float) -> bool:
        if not self.business_hours:
            return False  # No hours configured = disabled
        try:
            import zoneinfo
            tz = zoneinfo.ZoneInfo(self.timezone)
        except Exception:
            tz = datetime.timezone.utc

        dt = datetime.datetime.fromtimestamp(timestamp, tz=tz)
        day_name = dt.strftime("%a").lower()  # mon, tue, wed, ...

        if day_name not in self.business_hours:
            return True  # Day not defined = closed = after hours

        hours = self.business_hours[day_name]
        open_time = datetime.time.fromisoformat(hours["open"])
        close_time = datetime.time.fromisoformat(hours["close"])
        current_time = dt.time()

        return current_time < open_time or current_time >= close_time
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd ai_worker && python -m pytest tests/test_behavior_tracker.py -v`
Expected: All 7 tests PASS

- [ ] **Step 5: Commit**

```bash
git add ai_worker/behavior_tracker.py ai_worker/tests/test_behavior_tracker.py
git commit -m "feat: add behavior tracker with dwell, concealment, after-hours, vehicle detection (SEC-AI-09)"
```

---

### Task 10: Create detector module (YOLOv8 GPU inference queue)

**Files:**
- Create: `ai_worker/detector.py`

- [ ] **Step 1: Create `ai_worker/detector.py`**

```python
"""YOLOv8 model wrapper with async GPU inference queue."""

import asyncio
from dataclasses import dataclass
from ultralytics import YOLO

from behavior_tracker import Detection


@dataclass
class InferenceRequest:
    frame: bytes
    future: asyncio.Future


class Detector:
    def __init__(self, model_path: str = "yolov8n.pt"):
        self.model = YOLO(model_path)
        self._queue: asyncio.Queue[InferenceRequest] = asyncio.Queue()
        self._running = False

    async def start(self):
        """Start the inference consumer loop."""
        self._running = True
        while self._running:
            request = await self._queue.get()
            try:
                detections = await asyncio.to_thread(self._run_inference, request.frame)
                request.future.set_result(detections)
            except Exception as e:
                request.future.set_exception(e)
            finally:
                self._queue.task_done()

    def stop(self):
        self._running = False

    async def submit(self, frame: bytes) -> list[Detection]:
        """Submit a frame for inference. Returns detections."""
        loop = asyncio.get_event_loop()
        future = loop.create_future()
        await self._queue.put(InferenceRequest(frame=frame, future=future))
        return await future

    def _run_inference(self, frame: bytes) -> list[Detection]:
        """Run YOLOv8 tracking on a single frame. Called in thread pool."""
        import numpy as np
        import cv2

        # Decode JPEG bytes to numpy array
        nparr = np.frombuffer(frame, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if img is None:
            return []

        # Run tracking for persistent track IDs
        results = self.model.track(img, persist=True, verbose=False)

        detections: list[Detection] = []
        for result in results:
            if result.boxes is None:
                continue
            for box in result.boxes:
                cls_id = int(box.cls[0])
                cls_name = self.model.names[cls_id]
                conf = float(box.conf[0])
                x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                track_id = str(int(box.id[0])) if box.id is not None else f"notrack_{cls_id}"

                detections.append(Detection(
                    cls=cls_name,
                    bbox=(x1, y1, x2, y2),
                    confidence=conf,
                    track_id=track_id,
                ))

        return detections
```

- [ ] **Step 2: Commit**

```bash
git add ai_worker/detector.py
git commit -m "feat: add YOLOv8 detector with async GPU inference queue (SEC-AI-10)"
```

---

### Task 11: Create event poster module

**Files:**
- Create: `ai_worker/event_poster.py`

- [ ] **Step 1: Create `ai_worker/event_poster.py`**

```python
"""Uploads frames to DO Spaces and posts events to the Edge Function."""

import os
import json
import logging
from datetime import datetime, timezone

import httpx
import boto3

logger = logging.getLogger(__name__)

# Missed events log for manual recovery
MISSED_EVENTS_FILE = "missed_events.jsonl"


class EventPoster:
    def __init__(self):
        self.edge_fn_url = os.environ["SUPABASE_URL"] + "/functions/v1/ai-event-ingest"
        self.worker_secret = os.environ["AI_WORKER_SECRET"]

        # DO Spaces client (S3-compatible)
        self.s3 = boto3.client(
            "s3",
            endpoint_url=os.environ["DO_SPACES_ENDPOINT"],
            aws_access_key_id=os.environ["DO_SPACES_KEY"],
            aws_secret_access_key=os.environ["DO_SPACES_SECRET"],
        )
        self.bucket = os.environ["DO_SPACES_BUCKET"]

    async def upload_frame(self, frame: bytes, camera_id: str) -> str | None:
        """Upload frame JPEG to DO Spaces. Returns public URL or None on failure."""
        ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H-%M-%S")
        key = f"frames/{camera_id}/{ts}.jpg"
        try:
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=frame,
                ContentType="image/jpeg",
                ACL="public-read",
            )
            return f"{os.environ['DO_SPACES_ENDPOINT']}/{self.bucket}/{key}"
        except Exception as e:
            logger.warning(f"Frame upload failed for {camera_id}: {e}")
            return None

    async def post_event(
        self,
        camera_id: str,
        site_id: str,
        event_type: str,
        confidence: float,
        frame_url: str | None,
        detections: list[dict],
        metadata: dict,
    ) -> bool:
        """Post detection event to Edge Function. Retries 3x with backoff."""
        payload = {
            "camera_id": camera_id,
            "site_id": site_id,
            "event_type": event_type,
            "confidence": confidence,
            "frame_url": frame_url,
            "detections": detections,
            "metadata": metadata,
        }

        backoff = [1, 2, 4]
        async with httpx.AsyncClient(timeout=10) as client:
            for attempt, delay in enumerate(backoff):
                try:
                    resp = await client.post(
                        self.edge_fn_url,
                        json=payload,
                        headers={"Authorization": f"Bearer {self.worker_secret}"},
                    )
                    if resp.status_code == 201:
                        return True
                    logger.warning(f"Edge Function returned {resp.status_code}: {resp.text}")
                except Exception as e:
                    logger.warning(f"POST attempt {attempt + 1} failed: {e}")

                if attempt < len(backoff) - 1:
                    import asyncio
                    await asyncio.sleep(delay)

        # All retries failed — log to missed events file
        logger.error(f"Failed to post event after 3 retries: {event_type} for {camera_id}")
        self._log_missed_event(payload)
        return False

    def _log_missed_event(self, payload: dict) -> None:
        """Append missed event to JSONL file for manual recovery."""
        try:
            with open(MISSED_EVENTS_FILE, "a") as f:
                f.write(json.dumps(payload) + "\n")
        except Exception as e:
            logger.error(f"Failed to write missed event: {e}")
```

- [ ] **Step 2: Commit**

```bash
git add ai_worker/event_poster.py
git commit -m "feat: add event poster — DO Spaces upload + Edge Function POST with retry (SEC-AI-11)"
```

---

### Task 12: Create camera task module

**Files:**
- Create: `ai_worker/camera_task.py`

- [ ] **Step 1: Create `ai_worker/camera_task.py`**

```python
"""Per-camera async task loop: poll -> detect -> track -> alert."""

import asyncio
import logging

import httpx

from behavior_tracker import BehaviorTracker, Detection
from cooldown import CooldownRegistry
from detector import Detector
from event_poster import EventPoster

logger = logging.getLogger(__name__)


class CameraTask:
    def __init__(
        self,
        camera_id: str,
        site_id: str,
        stream_id: str,
        zones: list[dict],
        business_hours: dict,
        timezone: str,
        detector: Detector,
        cooldown: CooldownRegistry,
        poster: EventPoster,
        snapshot_interval_s: int = 2,
        dwell_threshold_s: int = 300,
        door_open_threshold_s: int = 120,
        confidence_threshold: float = 0.7,
        antmedia_url: str = "",
        antmedia_token: str = "",
    ):
        self.camera_id = camera_id
        self.site_id = site_id
        self.stream_id = stream_id
        self.detector = detector
        self.cooldown = cooldown
        self.poster = poster
        self.snapshot_interval_s = snapshot_interval_s
        self.confidence_threshold = confidence_threshold
        self.antmedia_url = antmedia_url
        self.antmedia_token = antmedia_token
        self._consecutive_failures = 0

        self.tracker = BehaviorTracker(
            zones=zones,
            business_hours=business_hours,
            timezone=timezone,
            dwell_threshold_s=dwell_threshold_s,
            door_open_threshold_s=door_open_threshold_s,
        )

    async def run(self):
        """Main camera loop. Runs until cancelled."""
        logger.info(f"Camera task started: {self.camera_id} (stream: {self.stream_id})")
        while True:
            try:
                frame = await self._fetch_snapshot()
                if frame is None:
                    self._consecutive_failures += 1
                    if self._consecutive_failures >= 5:
                        logger.warning(f"Camera {self.camera_id}: 5+ consecutive snapshot failures")
                    await asyncio.sleep(self.snapshot_interval_s)
                    continue

                self._consecutive_failures = 0

                # Run inference
                try:
                    detections = await self.detector.submit(frame)
                except Exception as e:
                    logger.error(f"Inference failed for {self.camera_id}: {e}")
                    await asyncio.sleep(self.snapshot_interval_s)
                    continue

                # Filter by confidence threshold
                detections = [d for d in detections if d.confidence >= self.confidence_threshold]

                # Process through behavior tracker
                import time
                events = self.tracker.process(detections, timestamp=time.time())

                # Post events that pass cooldown
                for event in events:
                    if self.cooldown.can_fire(self.camera_id, event.event_type):
                        frame_url = await self.poster.upload_frame(frame, self.camera_id)
                        det_dicts = [
                            {"class": d.cls, "bbox": list(d.bbox), "track_id": d.track_id}
                            for d in detections
                        ]
                        await self.poster.post_event(
                            camera_id=self.camera_id,
                            site_id=self.site_id,
                            event_type=event.event_type,
                            confidence=event.confidence,
                            frame_url=frame_url,
                            detections=det_dicts,
                            metadata=event.metadata,
                        )
                        self.cooldown.mark_fired(self.camera_id, event.event_type)

            except asyncio.CancelledError:
                logger.info(f"Camera task cancelled: {self.camera_id}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error in camera task {self.camera_id}: {e}")

            await asyncio.sleep(self.snapshot_interval_s)

    async def _fetch_snapshot(self) -> bytes | None:
        """Fetch JPEG snapshot from Ant Media REST API."""
        url = f"{self.antmedia_url}/WebRTCAppEE/rest/v2/broadcasts/{self.stream_id}/snapshot"
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(
                    url,
                    headers={"Authorization": f"Bearer {self.antmedia_token}"},
                )
                if resp.status_code == 200:
                    return resp.content
                logger.warning(f"Snapshot fetch returned {resp.status_code} for {self.camera_id}")
                return None
        except Exception as e:
            logger.warning(f"Snapshot fetch failed for {self.camera_id}: {e}")
            return None

    @property
    def is_degraded(self) -> bool:
        return self._consecutive_failures >= 5
```

- [ ] **Step 2: Commit**

```bash
git add ai_worker/camera_task.py
git commit -m "feat: add camera task — per-camera async detection loop (SEC-AI-12)"
```

---

### Task 13: Create supervisor and main entry point

**Files:**
- Create: `ai_worker/supervisor.py`
- Create: `ai_worker/main.py`

- [ ] **Step 1: Create `ai_worker/supervisor.py`**

```python
"""Supervisor — manages camera task lifecycle based on Supabase state."""

import asyncio
import logging
import os
import time
from dataclasses import dataclass

from supabase import create_client

from camera_task import CameraTask
from cooldown import CooldownRegistry
from config import WorkerConfig
from detector import Detector
from event_poster import EventPoster

logger = logging.getLogger(__name__)

SYNC_INTERVAL_S = 30


@dataclass
class CameraInfo:
    camera_id: str
    site_id: str
    stream_id: str
    zones: list[dict]
    business_hours: dict
    timezone: str


class Supervisor:
    def __init__(self, config: WorkerConfig):
        self.config = config
        self.detector = Detector()
        self.cooldown = CooldownRegistry(cooldown_s=config.cooldown_s)
        self.poster = EventPoster()
        self._tasks: dict[str, asyncio.Task] = {}
        self._camera_info: dict[str, CameraInfo] = {}

        # Stats for health endpoint
        self.stats = {
            "active_cameras": 0,
            "frames_processed_last_min": 0,
            "alerts_fired_last_min": 0,
            "start_time": time.time(),
            "gpu_errors": 0,
        }

        url = os.environ["SUPABASE_URL"]
        key = os.environ["SUPABASE_SERVICE_KEY"]
        self._supabase = create_client(url, key)

    async def run(self):
        """Main supervisor loop — syncs camera tasks every 30s."""
        # Start detector inference consumer
        asyncio.create_task(self.detector.start())
        logger.info("Supervisor started. Syncing cameras every %ds.", SYNC_INTERVAL_S)

        while True:
            try:
                await self._sync_cameras()
            except Exception as e:
                logger.error(f"Supervisor sync error: {e}")
            await asyncio.sleep(SYNC_INTERVAL_S)

    async def _sync_cameras(self):
        """Query DB for active cameras and start/stop tasks as needed."""
        # Fetch cameras with AI enabled and a stream_id
        resp = self._supabase.table("cameras").select(
            "id, site_id, stream_id, status, camera_ai_config!inner(enabled, zones)"
        ).eq("status", "Online").eq("camera_ai_config.enabled", True).not_.is_("stream_id", "null").execute()

        active_cameras: dict[str, CameraInfo] = {}
        site_ids: set[str] = set()

        for row in resp.data or []:
            site_ids.add(row["site_id"])
            ai_config = row["camera_ai_config"]
            if isinstance(ai_config, list):
                ai_config = ai_config[0] if ai_config else {"enabled": True, "zones": []}

            active_cameras[row["id"]] = CameraInfo(
                camera_id=row["id"],
                site_id=row["site_id"],
                stream_id=row["stream_id"],
                zones=ai_config.get("zones", []),
                business_hours={},  # Filled below
                timezone="Australia/Sydney",
            )

        # Fetch business hours for all relevant sites
        if site_ids:
            bh_resp = self._supabase.table("site_business_hours").select("*").in_("site_id", list(site_ids)).execute()
            bh_map = {r["site_id"]: r for r in (bh_resp.data or [])}
            for cam_info in active_cameras.values():
                bh = bh_map.get(cam_info.site_id)
                if bh:
                    cam_info.business_hours = bh.get("hours", {})
                    cam_info.timezone = bh.get("timezone", "Australia/Sydney")

        # Stop tasks for cameras no longer active
        to_stop = set(self._tasks.keys()) - set(active_cameras.keys())
        for cam_id in to_stop:
            logger.info(f"Stopping camera task: {cam_id}")
            self._tasks[cam_id].cancel()
            del self._tasks[cam_id]
            if cam_id in self._camera_info:
                del self._camera_info[cam_id]

        # Start tasks for new cameras
        to_start = set(active_cameras.keys()) - set(self._tasks.keys())
        for cam_id in to_start:
            info = active_cameras[cam_id]
            self._camera_info[cam_id] = info
            task = CameraTask(
                camera_id=info.camera_id,
                site_id=info.site_id,
                stream_id=info.stream_id,
                zones=info.zones,
                business_hours=info.business_hours,
                timezone=info.timezone,
                detector=self.detector,
                cooldown=self.cooldown,
                poster=self.poster,
                snapshot_interval_s=self.config.snapshot_interval_s,
                dwell_threshold_s=self.config.dwell_threshold_s,
                door_open_threshold_s=self.config.door_open_threshold_s,
                confidence_threshold=self.config.confidence_threshold,
                antmedia_url=os.environ.get("ANTMEDIA_URL", ""),
                antmedia_token=os.environ.get("ANTMEDIA_TOKEN", ""),
            )
            self._tasks[cam_id] = asyncio.create_task(task.run())
            logger.info(f"Started camera task: {cam_id}")

        self.stats["active_cameras"] = len(self._tasks)

    def get_health(self) -> dict:
        return {
            "status": "healthy",
            "active_cameras": self.stats["active_cameras"],
            "frames_processed_last_min": self.stats["frames_processed_last_min"],
            "alerts_fired_last_min": self.stats["alerts_fired_last_min"],
            "uptime_s": int(time.time() - self.stats["start_time"]),
        }
```

- [ ] **Step 2: Create `ai_worker/main.py`**

```python
"""AI Detection Worker — entry point."""

import asyncio
import json
import logging
import os

from aiohttp import web
from dotenv import load_dotenv

from config import load_config
from supervisor import Supervisor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

load_dotenv()

supervisor: Supervisor | None = None


async def health_handler(request: web.Request) -> web.Response:
    """GET /health — returns worker health status."""
    if supervisor is None:
        return web.json_response({"status": "starting"}, status=503)
    return web.json_response(supervisor.get_health())


async def start_worker(app: web.Application):
    """Start the supervisor as a background task."""
    global supervisor
    config = load_config()
    logger.info(f"Worker config loaded: threshold={config.confidence_threshold}, interval={config.snapshot_interval_s}s")
    supervisor = Supervisor(config)
    asyncio.create_task(supervisor.run())


def main():
    app = web.Application()
    app.router.add_get("/health", health_handler)
    app.on_startup.append(start_worker)

    port = int(os.environ.get("HEALTH_PORT", "8080"))
    logger.info(f"Starting AI worker (health on :{port})")
    web.run_app(app, host="0.0.0.0", port=port)


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Commit**

```bash
git add ai_worker/supervisor.py ai_worker/main.py
git commit -m "feat: add supervisor and main entry point for AI worker (SEC-AI-13)"
```

---

### Task 14: Create missed events replay script

**Files:**
- Create: `ai_worker/replay_missed.py`

- [ ] **Step 1: Create `ai_worker/replay_missed.py`**

```python
"""Replay missed events from missed_events.jsonl to the Edge Function.

Usage: python replay_missed.py [--file missed_events.jsonl]
"""

import argparse
import json
import os
import sys

import httpx
from dotenv import load_dotenv

load_dotenv()


def main():
    parser = argparse.ArgumentParser(description="Replay missed AI detection events")
    parser.add_argument("--file", default="missed_events.jsonl", help="Path to missed events JSONL file")
    args = parser.parse_args()

    if not os.path.exists(args.file):
        print(f"No missed events file found: {args.file}")
        return

    edge_url = os.environ["SUPABASE_URL"] + "/functions/v1/ai-event-ingest"
    secret = os.environ["AI_WORKER_SECRET"]

    with open(args.file) as f:
        lines = f.readlines()

    print(f"Replaying {len(lines)} missed events...")
    success = 0
    failed = 0

    with httpx.Client(timeout=10) as client:
        for i, line in enumerate(lines, 1):
            payload = json.loads(line.strip())
            try:
                resp = client.post(
                    edge_url,
                    json=payload,
                    headers={"Authorization": f"Bearer {secret}"},
                )
                if resp.status_code == 201:
                    success += 1
                else:
                    print(f"  [{i}] FAILED ({resp.status_code}): {resp.text[:100]}")
                    failed += 1
            except Exception as e:
                print(f"  [{i}] ERROR: {e}")
                failed += 1

    print(f"Done. Success: {success}, Failed: {failed}")
    if failed == 0 and success > 0:
        os.rename(args.file, args.file + ".replayed")
        print(f"Renamed {args.file} -> {args.file}.replayed")


if __name__ == "__main__":
    main()
```

- [ ] **Step 2: Commit**

```bash
git add ai_worker/replay_missed.py
git commit -m "feat: add replay_missed.py for manual recovery of failed events (SEC-AI-14)"
```

---

## Chunk 4: Frontend Changes

### Task 15: Add AI badge to super admin alerts list

**Files:**
- Modify: `src/app/(app)/alerts/alerts-client.tsx`

The super admin alerts list already has AI badge logic (line 45: `const isAI = alert.source.includes("AI")` and line 71: `{isAI && <PhaseTag>AI</PhaseTag>}`). This uses `PhaseTag` which renders as a gray tag. Update it to use a blue `Pill` instead for better visibility.

- [ ] **Step 1: Update the AI source display in `alerts-client.tsx`**

Replace the existing source column rendering (lines 69-72):

Old:
```tsx
<span key="source" className="inline-flex items-center gap-1.5 text-ink-2">
  {alert.source}
  {isAI && <PhaseTag>AI</PhaseTag>}
</span>,
```

New:
```tsx
<span key="source" className="inline-flex items-center gap-1.5 text-ink-2">
  {alert.source}
  {isAI && <Pill tone="blue" size="sm">AI</Pill>}
</span>,
```

- [ ] **Step 2: Add AI badge to dispatcher queue**

In `src/app/(app)/dispatcher/sections/queue.tsx`, inside the alert list item (around line 144), after the title `<span>`, add an AI indicator:

After the existing title span:
```tsx
<span className="text-[13.5px] font-semibold text-ink leading-snug line-clamp-1">
  {alert.title}
</span>
```

Add after the `{isCriticalNew && <LiveDot color="red" />}` line:

```tsx
{alert.source.includes('AI') && <Pill tone="blue" size="sm">AI</Pill>}
```

Also add `Pill` to the import from `@/components/ui` if not already there. Check line 14 — `Pill` is already imported.

- [ ] **Step 3: Verify it compiles**

Run: `cd primex && npx next build --no-lint 2>&1 | head -20`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/alerts/alerts-client.tsx src/app/(app)/dispatcher/sections/queue.tsx
git commit -m "feat: update AI badge to blue Pill in super admin and dispatcher alerts (SEC-AI-15)"
```

---

### Task 16: Add AI badge to manager and portal alerts

**Files:**
- Modify: `src/app/(app)/manager/sections/alerts.tsx`
- Modify: `src/app/(app)/portal/sections/alerts.tsx`

- [ ] **Step 1: Update manager alerts — same Pill change**

In `src/app/(app)/manager/sections/alerts.tsx`, replace the source column (lines 56-59):

Old:
```tsx
<span key="source" className="inline-flex items-center gap-1.5 text-ink-2">
  {alert.source}
  {isAI && <PhaseTag>AI</PhaseTag>}
</span>,
```

New:
```tsx
<span key="source" className="inline-flex items-center gap-1.5 text-ink-2">
  {alert.source}
  {isAI && <Pill tone="blue" size="sm">AI</Pill>}
</span>,
```

- [ ] **Step 2: Update portal alerts — add AI badge**

In `src/app/(app)/portal/sections/alerts.tsx`, in the alert card (line 77), update the source display:

Old:
```tsx
{alert.source && <span> &middot; Source: {alert.source}</span>}
```

New:
```tsx
{alert.source && (
  <span className="inline-flex items-center gap-1.5">
    {' '}&middot; Source: {alert.source}
    {alert.source.includes('AI') && <Pill tone="blue" size="sm">AI</Pill>}
  </span>
)}
```

Add `Pill` to the import at the top if not already imported (line 3). It's already imported.

- [ ] **Step 3: Commit**

```bash
git add src/app/(app)/manager/sections/alerts.tsx src/app/(app)/portal/sections/alerts.tsx
git commit -m "feat: add AI badge to manager and portal alert views (SEC-AI-16)"
```

---

### Task 17: Add frame snapshot display to alert detail

**Files:**
- Modify: `src/app/(app)/alerts/[id]/alert-detail-client.tsx`

- [ ] **Step 1: Add frame snapshot section**

In `src/app/(app)/alerts/[id]/alert-detail-client.tsx`, replace the existing camera tile preview block (lines 107-122):

Old:
```tsx
{/* Camera tile preview */}
{camera && (
  <div className="w-full max-w-sm rounded-xl overflow-hidden border border-border">
    <div className="bg-navy flex flex-col items-center justify-center gap-3 h-44">
      <Camera size={28} strokeWidth={1.5} className="text-white/30" />
      <span className="text-white/40 text-xs font-sans tracking-wide">
        {camera.name} — {camera.location}
      </span>
    </div>
    <div className="px-3 py-2 bg-surface flex items-center justify-between font-sans">
      <span className="text-xs text-ink-3">{camera.name}</span>
      <Pill tone={camera.status === "Online" ? "green" : camera.status === "Offline" ? "red" : "amber"} size="sm">
        {camera.status}
      </Pill>
    </div>
  </div>
)}
```

New:
```tsx
{/* AI frame snapshot or camera placeholder */}
{alert.frame_url ? (
  <div className="w-full max-w-lg rounded-xl overflow-hidden border border-border">
    <div className="relative" style={{ aspectRatio: "16/9" }}>
      {/* Using raw img tag — DO Spaces URLs are public, no Next.js optimization needed */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={alert.frame_url}
        alt={`AI detection frame — ${alert.title}`}
        className="w-full h-full object-cover"
      />
      {/* Overlay: confidence + event type */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-2">
        {alert.event_type && (
          <Pill tone="blue" size="sm">
            {alert.event_type.replace(/_/g, ' ')}
          </Pill>
        )}
        {alert.confidence != null && (
          <Pill tone="gray" size="sm">
            {(alert.confidence * 100).toFixed(0)}% confidence
          </Pill>
        )}
      </div>
      <div className="absolute top-2.5 right-2.5">
        <Pill tone="blue" size="sm">AI</Pill>
      </div>
    </div>
    {camera && (
      <div className="px-3 py-2 bg-surface flex items-center justify-between font-sans">
        <span className="text-xs text-ink-3">{camera.name} — {camera.location}</span>
        <Pill tone={camera.status === "Online" ? "green" : camera.status === "Offline" ? "red" : "amber"} size="sm">
          {camera.status}
        </Pill>
      </div>
    )}
  </div>
) : camera ? (
  <div className="w-full max-w-sm rounded-xl overflow-hidden border border-border">
    <div className="bg-navy flex flex-col items-center justify-center gap-3 h-44">
      <Camera size={28} strokeWidth={1.5} className="text-white/30" />
      <span className="text-white/40 text-xs font-sans tracking-wide">
        {camera.name} — {camera.location}
      </span>
    </div>
    <div className="px-3 py-2 bg-surface flex items-center justify-between font-sans">
      <span className="text-xs text-ink-3">{camera.name}</span>
      <Pill tone={camera.status === "Online" ? "green" : camera.status === "Offline" ? "red" : "amber"} size="sm">
        {camera.status}
      </Pill>
    </div>
  </div>
) : null}
```

- [ ] **Step 2: Commit**

```bash
git add src/app/(app)/alerts/[id]/alert-detail-client.tsx
git commit -m "feat: show AI frame snapshot with confidence overlay in alert detail (SEC-AI-17)"
```

---

### Task 18: Add AI detection config card to camera detail

**Files:**
- Modify: `src/app/(app)/cameras/[id]/camera-detail-client.tsx`
- Modify: `src/app/(app)/cameras/[id]/page.tsx`

- [ ] **Step 1: Update the page server component to fetch AI config**

In `src/app/(app)/cameras/[id]/page.tsx`, add the AI config fetch:

```typescript
import { getCameraAiConfig } from "@/lib/data/camera-ai-config";
```

After `const site = await getSiteById(camera.site_id)`, add:

```typescript
const aiConfig = await getCameraAiConfig(camera.id);
```

Update the return to pass it:

```tsx
return <CameraDetailClient camera={camera} site={site} aiConfig={aiConfig} />;
```

- [ ] **Step 2: Update `camera-detail-client.tsx` to show AI config card**

Add to the imports:

```typescript
import { toggleCameraAi } from "@/lib/data/actions/camera-ai-config";
import type { CameraAiConfig } from "@/lib/types";
```

Update the interface:

```typescript
interface CameraDetailClientProps {
  camera: Camera;
  site: Site;
  aiConfig: CameraAiConfig | null;
}
```

Update the function signature:

```typescript
export function CameraDetailClient({ camera, site, aiConfig }: CameraDetailClientProps) {
```

After the closing `</Card>` of the "Camera info" card (after line 84), add a new card:

```tsx
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
```

- [ ] **Step 3: Add `useRouter` import if not present and verify it compiles**

`useRouter` and `useTransition` are already imported.

Run: `cd primex && npx next build --no-lint 2>&1 | head -20`
Expected: No type errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/(app)/cameras/[id]/camera-detail-client.tsx src/app/(app)/cameras/[id]/page.tsx
git commit -m "feat: add AI detection config card with toggle to camera detail (SEC-AI-18)"
```

---

### Task 19: Add realtime alert subscription for dispatchers

**Files:**
- Create: `src/lib/hooks/use-realtime-alerts.ts`
- Modify: `src/app/(app)/dispatcher/sections/queue.tsx`

- [ ] **Step 1: Create `src/lib/hooks/use-realtime-alerts.ts`**

```typescript
'use client'

import { useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserSupabaseClient } from '@/lib/supabase/client'

export function useRealtimeAlerts() {
  const router = useRouter()
  const supabase = useMemo(() => createBrowserSupabaseClient(), [])

  useEffect(() => {
    const channel = supabase
      .channel('ai-alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const alert = payload.new as { title?: string; severity?: string; source?: string }
          // Only toast for AI alerts
          if (alert.source?.includes('AI')) {
            // Simple browser notification if permitted
            if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
              new Notification(`${alert.severity}: ${alert.title}`, {
                body: 'New AI detection alert',
                icon: '/favicon.ico',
              })
            }
          }
          // Refresh the page data for all new alerts
          router.refresh()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, router])
}
```

- [ ] **Step 2: Add the hook to the dispatcher queue**

In `src/app/(app)/dispatcher/sections/queue.tsx`, add the import:

```typescript
import { useRealtimeAlerts } from '@/lib/hooks/use-realtime-alerts'
```

Inside the `DispatcherQueue` component, after the existing state declarations (after line 61), add:

```typescript
useRealtimeAlerts()
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/hooks/use-realtime-alerts.ts src/app/(app)/dispatcher/sections/queue.tsx
git commit -m "feat: add realtime alert subscription with browser notifications for dispatchers (SEC-AI-19)"
```

---

### Task 20: Final verification and commit

- [ ] **Step 1: Verify the full project builds**

Run: `cd primex && npx next build 2>&1 | tail -20`
Expected: Build succeeds or only has pre-existing warnings.

- [ ] **Step 2: Verify no TypeScript errors**

Run: `cd primex && npx tsc --noEmit 2>&1 | head -30`
Expected: No new type errors.

- [ ] **Step 3: Run Python worker tests**

Run: `cd ai_worker && python -m pytest tests/ -v`
Expected: All tests pass.

- [ ] **Step 4: Final commit if any fixes were needed**

```bash
git add -A
git commit -m "fix: resolve any build issues from AI detection layer integration (SEC-AI-20)"
```
