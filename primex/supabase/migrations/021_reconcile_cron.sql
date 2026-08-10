-- ============================================================
-- 021: schedule camera reconciliation in Postgres (SEC-180)
-- ============================================================
-- The reconcile endpoint was scheduled with Vercel Cron at `*/15 * * * *`. That
-- deployment is rejected outright on Vercel's Hobby plan, which allows a cron to
-- run at most once per day — the build compiles and the *deployment* fails, which
-- is a confusing signal to debug from.
--
-- Daily is not a usable substitute: SEC-180 exists because a lost webhook strands
-- a camera at the wrong status indefinitely, and a 24-hour correction window is
-- barely an improvement on that. So the schedule moves to pg_cron, which is where
-- this repo already runs retention (005, 020), and pg_net makes the HTTP call.
--
-- The Vercel cron stays as a **daily backstop**, deliberately: pg_net is
-- fire-and-forget (failures land in `net._http_response`, not in anything that
-- shouts), so a once-a-day run from outside the database also proves the endpoint
-- is reachable from the public internet at all. The endpoint only corrects state,
-- so running it twice is harmless.
--
-- ⚠️ REQUIRES TWO VAULT SECRETS. They are not in this file and never should be —
-- a migration is committed to git. Set them once per environment:
--
--   select vault.create_secret('https://your-domain.com', 'primex_site_url');
--   select vault.create_secret('<CRON_SECRET value>',      'primex_cron_secret');
--
-- Until both exist the job is a logged no-op rather than a stream of 401s.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

/**
 * Call the reconcile endpoint. Returns the pg_net request id, or NULL when the
 * job was skipped because it is not configured.
 *
 * search_path lists `net` and `extensions` because pg_net's home schema differs
 * between Supabase project vintages; a schema that does not exist is ignored, so
 * naming both resolves `http_get` either way rather than guessing.
 */
CREATE OR REPLACE FUNCTION public.trigger_camera_reconcile()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net, vault
AS $$
DECLARE
  site_url    TEXT;
  cron_secret TEXT;
  request_id  BIGINT;
BEGIN
  SELECT decrypted_secret INTO site_url
  FROM vault.decrypted_secrets WHERE name = 'primex_site_url';

  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets WHERE name = 'primex_cron_secret';

  -- Skipping loudly beats calling with no credential: the endpoint fails closed
  -- (SEC-180), so a missing secret would otherwise be an invisible 401 every 15
  -- minutes that looks identical to reconciliation simply having nothing to do.
  IF site_url IS NULL OR cron_secret IS NULL THEN
    RAISE WARNING 'camera reconcile skipped — set the primex_site_url and primex_cron_secret vault secrets (SEC-180)';
    RETURN NULL;
  END IF;

  SELECT http_get(
    url := rtrim(site_url, '/') || '/api/cron/reconcile-cameras',
    headers := jsonb_build_object('Authorization', 'Bearer ' || cron_secret),
    timeout_milliseconds := 20000
  ) INTO request_id;

  RETURN request_id;
END;
$$;

COMMENT ON FUNCTION public.trigger_camera_reconcile() IS
  'Calls /api/cron/reconcile-cameras over HTTP (SEC-180). Scheduled by pg_cron '
  'every 15 minutes because Vercel Hobby caps crons at once per day. Reads its '
  'URL and bearer token from Vault; a no-op until both secrets exist.';

-- Replace rather than add, so re-running this migration cannot end up with two
-- jobs racing each other.
DO $$
BEGIN
  PERFORM cron.unschedule('reconcile_cameras');
EXCEPTION
  WHEN OTHERS THEN
    NULL; -- not scheduled yet
END;
$$;

SELECT cron.schedule(
  'reconcile_cameras',
  '*/15 * * * *',
  $$SELECT public.trigger_camera_reconcile()$$
);
