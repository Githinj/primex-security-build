-- ============================================================
-- 015: Catch-up API-role table grants (SEC-154)
-- ============================================================
-- Migrations 007/010/013/014 created tables without granting the API roles
-- (this repo has no default-privilege auto-grant — 001's TABLE GRANTS block only
-- covered tables existing then). The grants were added back into those migration
-- files, which fixes any FRESH database. But environments where those migrations
-- were ALREADY applied (e.g. remote is at 007) will not re-run them, so this
-- forward migration re-applies the grants idempotently to catch those up.
--
-- RLS on each table still scopes row access; GRANT only makes the table reachable
-- through PostgREST. GRANT is idempotent, so running this everywhere is safe.
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON notification_preferences TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON incident_updates          TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON client_sites              TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON subscriptions             TO authenticated, anon, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON billing_events            TO service_role;
