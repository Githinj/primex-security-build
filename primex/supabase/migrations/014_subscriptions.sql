-- ============================================================
-- 014: Stripe subscriptions (SEC-129)
-- ============================================================
-- Real per-company billing. Each company has at most one subscription row,
-- synced from Stripe via the /api/webhooks/stripe handler (service-role writes,
-- which bypass RLS). The pre-existing companies.plan column (migration 011) is
-- just an admin label and is NOT touched here — subscription state lives here.
--
-- Idempotent (IF NOT EXISTS / DROP POLICY IF EXISTS) per repo convention.
-- ============================================================

-- ---------- 1. subscriptions ----------
CREATE TABLE IF NOT EXISTS subscriptions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id             UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
  stripe_customer_id     TEXT,
  stripe_subscription_id TEXT,
  plan_tier              TEXT,          -- 'starter' | 'professional' | 'enterprise'
  status                 TEXT,          -- Stripe status: trialing | active | past_due | canceled | ...
  current_period_end     TIMESTAMPTZ,
  trial_end              TIMESTAMPTZ,
  cancel_at_period_end   BOOLEAN NOT NULL DEFAULT false,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_company          ON subscriptions(company_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer  ON subscriptions(stripe_customer_id);

-- Reuse the generic updated_at trigger function from 001.
DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ---------- 2. subscriptions RLS ----------
-- Writes only ever happen through the service-role client (checkout action +
-- webhook), which bypasses RLS. Policies here are read-scoping only.
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscriptions_super_admin_all ON subscriptions;
CREATE POLICY subscriptions_super_admin_all ON subscriptions
  FOR ALL USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

DROP POLICY IF EXISTS subscriptions_company_select ON subscriptions;
CREATE POLICY subscriptions_company_select ON subscriptions
  FOR SELECT USING (
    get_user_role() IN ('company_manager', 'client')
    AND company_id = get_user_company()
  );

-- ---------- 3. billing_events (webhook audit + idempotency) ----------
-- Mirrors the antmedia stream_events pattern. stripe_event_id UNIQUE is the
-- idempotency key: a duplicate delivery fails the insert and is skipped.
CREATE TABLE IF NOT EXISTS billing_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT NOT NULL UNIQUE,
  type            TEXT NOT NULL,
  payload         JSONB,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS on with no policy = no access for normal users; only the service-role
-- webhook (which bypasses RLS) reads/writes this table.
ALTER TABLE billing_events ENABLE ROW LEVEL SECURITY;

-- ---------- 4. Table grants ----------
-- This project grants API-role table privileges PER MIGRATION — there is no
-- default-privilege auto-grant (see the "TABLE GRANTS" block in 001, which only
-- covers tables existing at that time). RLS above is what scopes row access;
-- these grants just make the tables reachable through PostgREST. Without them,
-- every service-role write (webhook + checkout action) and authenticated read
-- fails with "permission denied for table" — silently, since those writes are
-- not error-checked. GRANT is idempotent, matching this migration's convention.
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions  TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_events TO service_role;
