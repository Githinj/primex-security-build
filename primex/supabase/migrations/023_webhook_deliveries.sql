-- 023_webhook_deliveries.sql
-- Durable capture of Ant Media listener-hook deliveries (SEC-202)
--
-- Why this table exists:
--
-- The webhook has never been observed firing in production. `listenerHookURL`
-- was null on every broadcast, and `stream_events` / `recordings` are empty —
-- so camera status, drop telemetry and recordings are all built on a path no
-- deployment has executed. The provisioning fix went in, but *verifying* it
-- still required somebody to be tailing Vercel logs at the exact moment a
-- stream started, and then to read the payload out of a log line.
--
-- Everything diagnostic about a delivery currently dies in that log:
--
--   * an unparseable body is warned about and discarded
--   * a delivery for an unknown stream_id is warned about and discarded
--   * a successful delivery leaves a `stream_events` row, but nothing recording
--     the Content-Type or the field names AMS actually sent
--
-- `stream_events` cannot hold the first two: `camera_id` is NOT NULL with an FK,
-- and by definition those deliveries have no camera. Hence a separate table
-- keyed on nothing.
--
-- This is deliberately a diagnostic buffer, not an audit log — 7-day retention,
-- matching `stream_events`, and a truncated body. Once SEC-202's acceptance
-- criteria are recorded (real Content-Type, real field names) this stays useful
-- for exactly one question: "is Ant Media still calling us at all?"

CREATE TABLE IF NOT EXISTS webhook_deliveries (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source       TEXT NOT NULL DEFAULT 'antmedia',
  -- The header as sent. The whole point of the table: AMS's documented contract
  -- is form-urlencoded, the route was written for JSON, and nobody has seen
  -- which one 2.14 EE actually posts.
  content_type TEXT,
  action       TEXT,
  stream_id    TEXT,
  -- Top-level keys of the parsed body. Answers "does it send streamId or id or
  -- streamName" without having to read the raw body.
  body_keys    TEXT[],
  -- Truncated in the application layer. Bodies are small; the cap is a guard
  -- against a pathological payload, not an expectation.
  raw_body     TEXT,
  -- parsed | unparseable | unknown_stream | unauthorized
  outcome      TEXT NOT NULL,
  camera_id    UUID REFERENCES cameras(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created
  ON webhook_deliveries(created_at DESC);

-- ─── RLS ──────────────────────────────────────────────────
--
-- super_admin only. A delivery body carries stream ids across every tenant, so
-- this is not company-scoped data and must not be readable per-company.

ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_deliveries_access ON webhook_deliveries;
CREATE POLICY webhook_deliveries_access ON webhook_deliveries FOR ALL USING (
  get_user_role() = 'super_admin'
);

-- Required, and easy to forget: this repo has no default-privilege auto-grant,
-- so without these the table is unreachable over PostgREST even with correct
-- RLS (SEC-154, see migration 015).
GRANT SELECT, INSERT, UPDATE, DELETE ON webhook_deliveries TO authenticated, anon, service_role;

-- ─── Retention ────────────────────────────────────────────
-- Same 7-day window as stream_events (migration 005). Idempotent: unschedule
-- first so re-applying this migration doesn't error on a duplicate job name.

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup_old_webhook_deliveries');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- not scheduled yet
END;
$$;

SELECT cron.schedule(
  'cleanup_old_webhook_deliveries',
  '30 3 * * *',
  $$DELETE FROM public.webhook_deliveries WHERE created_at < now() - interval '7 days'$$
);
