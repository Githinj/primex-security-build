-- ============================================================
-- 016: Web push subscriptions (SEC-148)
-- ============================================================
-- One row per browser push subscription. A user can have several (multiple
-- devices/browsers). The notify layer reads these via the service-role client to
-- fan out web push; users manage their own rows through the subscribe/unsubscribe
-- server actions. Idempotent per repo convention.
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL UNIQUE,   -- push service URL; unique per subscription
  p256dh     TEXT NOT NULL,          -- client public key (encryption)
  auth       TEXT NOT NULL,          -- client auth secret
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON push_subscriptions(user_id);

-- ---------- RLS: users manage only their own subscriptions ----------
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS push_subscriptions_own ON push_subscriptions;
CREATE POLICY push_subscriptions_own ON push_subscriptions FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------- Table grants (no default-privilege auto-grant; see SEC-154) ----------
-- authenticated: manage own rows (RLS scopes); service_role: fan-out reads in notify.
GRANT SELECT, INSERT, UPDATE, DELETE ON push_subscriptions TO authenticated, anon, service_role;
