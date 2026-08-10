-- ============================================================
-- 022: make the reconcile cron's HTTP call verifiable (SEC-180)
-- ============================================================
-- 021 calls `http_get` with `net` and `extensions` both on the search_path,
-- because pg_net's home schema differs between Supabase project vintages. That
-- works or it doesn't, and there was no way to find out short of waiting for the
-- job to run: plpgsql resolves function names at execution, not at creation, so
-- 021 applying cleanly proved nothing about it.
--
-- The failure that would have caused is the exact one SEC-180 exists to fix — a
-- job that silently never runs — so this migration does two things:
--
--   1. Asserts pg_net is actually resolvable, at migration time. Pushing this
--      either confirms it or fails loudly, right now, with a message that says
--      what to do.
--   2. Rewrites the call to resolve pg_net's schema from the catalog rather than
--      relying on search_path.
--
-- Idempotent per repo convention.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pg_net;

-- (1) Prove it resolves, and say where it lives.
DO $$
DECLARE
  net_schema TEXT;
BEGIN
  SELECT n.nspname INTO net_schema
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'http_get'
  ORDER BY (n.nspname = 'net') DESC
  LIMIT 1;

  IF net_schema IS NULL THEN
    RAISE EXCEPTION
      'pg_net is not installed — camera reconciliation (SEC-180) cannot make its HTTP call. Enable pg_net in the Supabase dashboard (Database → Extensions) and re-run.';
  END IF;

  RAISE NOTICE 'pg_net http_get resolved in schema "%"', net_schema;
END;
$$;

-- (2) Resolve the schema at call time instead of trusting search_path.
CREATE OR REPLACE FUNCTION public.trigger_camera_reconcile()
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, net, vault
AS $$
DECLARE
  site_url    TEXT;
  cron_secret TEXT;
  net_schema  TEXT;
  request_id  BIGINT;
BEGIN
  SELECT decrypted_secret INTO site_url
  FROM vault.decrypted_secrets WHERE name = 'primex_site_url';

  SELECT decrypted_secret INTO cron_secret
  FROM vault.decrypted_secrets WHERE name = 'primex_cron_secret';

  -- Skipping loudly beats calling with no credential: the endpoint fails closed,
  -- so a missing secret would otherwise be an invisible 401 every 15 minutes that
  -- looks identical to reconciliation having nothing to do.
  IF site_url IS NULL OR cron_secret IS NULL THEN
    RAISE WARNING 'camera reconcile skipped — set the primex_site_url and primex_cron_secret vault secrets (SEC-180)';
    RETURN NULL;
  END IF;

  SELECT n.nspname INTO net_schema
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE p.proname = 'http_get'
  ORDER BY (n.nspname = 'net') DESC
  LIMIT 1;

  IF net_schema IS NULL THEN
    RAISE WARNING 'camera reconcile skipped — pg_net is not installed (SEC-180)';
    RETURN NULL;
  END IF;

  EXECUTE format(
    'SELECT %I.http_get(url := $1, headers := $2, timeout_milliseconds := 20000)',
    net_schema
  )
  INTO request_id
  USING
    rtrim(site_url, '/') || '/api/cron/reconcile-cameras',
    jsonb_build_object('Authorization', 'Bearer ' || cron_secret);

  RETURN request_id;
END;
$$;

COMMENT ON FUNCTION public.trigger_camera_reconcile() IS
  'Calls /api/cron/reconcile-cameras over HTTP (SEC-180). Scheduled by pg_cron '
  'every 15 minutes because Vercel Hobby caps crons at once per day. Reads its '
  'URL and bearer token from Vault and resolves pg_net from the catalog; a '
  'logged no-op if any of the three is missing.';
