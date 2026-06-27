-- 004_transactional_functions.sql
-- Postgres functions for transactional multi-table writes (SEC-88)
-- Replaces sequential inserts in server actions + Edge Function

-- ─── 1. create_alert_with_incident ──────────────────────────
-- Used by: createAlert server action, ai-event-ingest Edge Function
-- Atomically inserts an alert and its linked incident.

CREATE OR REPLACE FUNCTION create_alert_with_incident(
  p_title       TEXT,
  p_site_id     UUID,
  p_camera_id   UUID DEFAULT NULL,
  p_severity    alert_severity DEFAULT 'Info',
  p_description TEXT DEFAULT '',
  p_source      TEXT DEFAULT '',
  p_frame_url   TEXT DEFAULT NULL,
  p_confidence  REAL DEFAULT NULL,
  p_event_type  detection_event_type DEFAULT NULL,
  p_ai_metadata JSONB DEFAULT NULL
)
RETURNS TABLE(alert_id UUID, incident_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert_id    UUID;
  v_incident_id UUID;
BEGIN
  INSERT INTO alerts (title, site_id, camera_id, severity, status, description, source, frame_url, confidence, event_type, ai_metadata)
  VALUES (p_title, p_site_id, p_camera_id, p_severity, 'New', p_description, p_source, p_frame_url, p_confidence, p_event_type, p_ai_metadata)
  RETURNING id INTO v_alert_id;

  INSERT INTO incidents (title, site_id, alert_id, severity, status, guard_id, started_at, notes)
  VALUES (p_title, p_site_id, v_alert_id, p_severity, 'Open', NULL, now(), NULLIF(p_description, ''))
  RETURNING id INTO v_incident_id;

  RETURN QUERY SELECT v_alert_id, v_incident_id;
END;
$$;

-- ─── 2. dispatch_guard ──────────────────────────────────────
-- Used by: dispatchGuard server action
-- Atomically creates incident, escalates alert, sets guard to On Incident.

CREATE OR REPLACE FUNCTION dispatch_guard(
  p_alert_id UUID,
  p_guard_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_alert       RECORD;
  v_incident_id UUID;
BEGIN
  SELECT id, title, site_id, severity, description
  INTO v_alert
  FROM alerts
  WHERE id = p_alert_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Alert not found: %', p_alert_id;
  END IF;

  INSERT INTO incidents (title, site_id, alert_id, severity, status, guard_id, started_at, notes)
  VALUES (v_alert.title, v_alert.site_id, p_alert_id, v_alert.severity, 'Dispatched', p_guard_id, now(), v_alert.description)
  RETURNING id INTO v_incident_id;

  UPDATE alerts SET status = 'Escalated' WHERE id = p_alert_id;

  UPDATE profiles SET guard_status = 'On Incident' WHERE id = p_guard_id;

  RETURN v_incident_id;
END;
$$;

-- ─── 3. resolve_incident ────────────────────────────────────
-- Used by: updateIncidentStatus server action (on Resolved/Closed)
-- Atomically updates incident status and resets guard to Available.

CREATE OR REPLACE FUNCTION resolve_incident(
  p_incident_id UUID,
  p_status      incident_status
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_guard_id UUID;
BEGIN
  UPDATE incidents SET status = p_status WHERE id = p_incident_id
  RETURNING guard_id INTO v_guard_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Incident not found: %', p_incident_id;
  END IF;

  IF p_status = 'Resolved' AND v_guard_id IS NOT NULL THEN
    UPDATE profiles SET guard_status = 'Available' WHERE id = v_guard_id;
  END IF;
END;
$$;

-- ─── GRANTS ─────────────────────────────────────────────────

GRANT EXECUTE ON FUNCTION create_alert_with_incident TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION dispatch_guard TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_incident TO authenticated;
