-- ============================================================
-- 020: evidentiary hold on recordings (SEC-190)
-- ============================================================
-- Migration 005 deletes every `recordings` row older than 30 days,
-- unconditionally and silently. An incident opened on day 28 loses its footage
-- on day 30, inside a `DELETE` running in pg_cron with no trace anywhere. For a
-- security company whose recordings get requested by a client, an insurer or the
-- police, that is a liability, and it is not recoverable after the fact.
--
-- Three things change:
--
--   1. `recordings.hold_until` — an explicit hold for a footage request.
--   2. Incident-linked footage is held automatically. Nobody remembers to place
--      a hold on day 28; the system already knows an incident happened on that
--      camera at that time.
--   3. Deletions are recorded in `recording_deletions`, so "where did the footage
--      go" has an answer.
--
-- The audit table is deliberately NOT `stream_events`: migration 005 trims that
-- to 7 days, so a deletion log there would itself be gone in a week, which is
-- the same failure one level up.
--
-- ⚠️ THE OBJECTS ARE NOT COVERED BY THIS. The MP4s in DO Spaces are expired by a
-- bucket lifecycle policy (SEC-94) that this database cannot see. If that policy
-- expires objects at 30 days, a held row survives pointing at a 404 — the row is
-- evidence that footage existed, not the footage. The bucket window must be at
-- least `evidence_retention_days` below, or held objects must be copied to a
-- longer-retention prefix. Recorded in docs/go-live-checklist.md.
--
-- Idempotent per repo convention.
-- ============================================================

ALTER TABLE recordings
  ADD COLUMN IF NOT EXISTS hold_until TIMESTAMPTZ;

COMMENT ON COLUMN recordings.hold_until IS
  'Explicit evidentiary hold (SEC-190). While in the future, retention will not '
  'delete this row. Incident-linked footage is held automatically and does not '
  'need this set.';

-- ─── Audit trail ──────────────────────────────────────────
-- No FK to cameras on purpose: an audit row must outlive the camera it refers
-- to, and `ON DELETE CASCADE` would erase exactly the history someone is asking
-- about after a camera was removed.
CREATE TABLE IF NOT EXISTS recording_deletions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  camera_id   UUID,
  stream_id   TEXT,
  file_url    TEXT NOT NULL,
  started_at  TIMESTAMPTZ,
  ended_at    TIMESTAMPTZ,
  reason      TEXT NOT NULL DEFAULT 'retention',
  deleted_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recording_deletions_camera
  ON recording_deletions (camera_id, deleted_at DESC);

ALTER TABLE recording_deletions ENABLE ROW LEVEL SECURITY;

-- Read-only to humans, and only to the two roles that would ever have to answer
-- a footage request. Rows are written by the retention function, which runs as
-- SECURITY DEFINER and so bypasses this.
DROP POLICY IF EXISTS recording_deletions_read ON recording_deletions;
CREATE POLICY recording_deletions_read ON recording_deletions FOR SELECT USING (
  CASE get_user_role()
    WHEN 'super_admin' THEN true
    WHEN 'dispatcher' THEN true
    ELSE false
  END
);

-- Every migration creating a public table must GRANT to the API roles or the
-- table is unreachable over PostgREST regardless of RLS (SEC-154, migration 015).
GRANT SELECT, INSERT, UPDATE, DELETE ON recording_deletions TO authenticated, anon, service_role;

-- ─── Retention with a hold ────────────────────────────────
CREATE OR REPLACE FUNCTION public.purge_expired_recordings()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Ordinary footage lifetime. Must stay >= the DO Spaces lifecycle window or
  -- rows outlive their objects and playback 404s with nothing surfaced.
  retention_days          CONSTANT INT = 30;
  -- How long incident-linked footage is kept. Recordings normally expire long
  -- before this; the point is that an incident extends the life of the footage
  -- around it rather than merely pausing the clock.
  evidence_retention_days CONSTANT INT = 365;
  -- Footage either side of an incident that counts as part of it. The lead
  -- matters more than the trail: what happened *before* someone forced a door
  -- is usually the useful part.
  hold_lead               CONSTANT INTERVAL = INTERVAL '6 hours';
  hold_trail              CONSTANT INTERVAL = INTERVAL '6 hours';
  deleted_count           INTEGER;
BEGIN
  WITH expired AS (
    SELECT r.*
    FROM recordings r
    WHERE r.created_at < now() - make_interval(days => retention_days)
      -- Explicit hold, e.g. a police or insurer request.
      AND (r.hold_until IS NULL OR r.hold_until <= now())
      -- Incident-linked. Cameras reach incidents through the alert that raised
      -- them; there is no direct incidents.camera_id.
      AND NOT EXISTS (
        SELECT 1
        FROM incidents i
        JOIN alerts a ON a.id = i.alert_id
        WHERE a.camera_id = r.camera_id
          AND i.started_at > now() - make_interval(days => evidence_retention_days)
          -- Overlap between the recording's span and the incident's window.
          AND r.started_at <= i.started_at + hold_trail
          AND COALESCE(r.ended_at, r.started_at) >= i.started_at - hold_lead
      )
  ), logged AS (
    INSERT INTO recording_deletions (
      camera_id, stream_id, file_url, started_at, ended_at, reason
    )
    SELECT camera_id, stream_id, file_url, started_at, ended_at, 'retention'
    FROM expired
    RETURNING 1
  ), removed AS (
    DELETE FROM recordings
    WHERE id IN (SELECT id FROM expired)
    RETURNING 1
  )
  SELECT count(*)::INTEGER INTO deleted_count FROM removed;

  RETURN deleted_count;
END;
$$;

COMMENT ON FUNCTION public.purge_expired_recordings() IS
  'Retention with an evidentiary hold (SEC-190). Skips explicitly held rows and '
  'footage around an incident on the same camera; logs every deletion to '
  'recording_deletions. Returns the number of rows deleted.';

-- ─── Re-point the cron job ────────────────────────────────
-- 005 scheduled a bare DELETE. Replace it rather than adding a second job, or
-- the unconditional one would keep deleting held footage alongside this.
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup_old_recordings');
EXCEPTION
  WHEN OTHERS THEN
    -- Not scheduled (fresh database, or already replaced) — nothing to remove.
    NULL;
END;
$$;

SELECT cron.schedule(
  'cleanup_old_recordings',
  '15 3 * * *',
  $$SELECT public.purge_expired_recordings()$$
);
