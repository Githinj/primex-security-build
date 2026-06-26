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
