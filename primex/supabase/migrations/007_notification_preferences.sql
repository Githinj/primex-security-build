-- 007_notification_preferences.sql
-- Per-user notification channel preferences (SEC-127)

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_key  TEXT NOT NULL,
  email      BOOLEAN NOT NULL DEFAULT true,
  push       BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, event_key)
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

-- Each user manages only their own preferences. The notification dispatcher
-- reads across users via the service-role client, which bypasses RLS.
-- DROP-then-CREATE so the migration is idempotent on environments where the
-- table/policy already exist but weren't tracked in migration history.
DROP POLICY IF EXISTS notif_prefs_own ON notification_preferences;
CREATE POLICY notif_prefs_own ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Table grants. This project grants API-role privileges per migration — there is
-- no default-privilege auto-grant (001's TABLE GRANTS block only covered tables
-- existing then). Without this, the authenticated session's reads/writes fail with
-- "permission denied for table" and preference saves silently do not persist. RLS
-- above still scopes rows; GRANT is idempotent. (SEC-154)
GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated, anon, service_role;
