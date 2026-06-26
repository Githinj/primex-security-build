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
