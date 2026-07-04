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
CREATE POLICY notif_prefs_own ON notification_preferences FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
