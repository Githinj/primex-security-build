-- Fix 1: dispatcher profile RLS policy
-- Dispatchers could only read guard profiles, not their own.
-- This caused the proxy to fall back to 'client' role routing.

DROP POLICY profiles_dispatcher_select ON profiles;

CREATE POLICY profiles_dispatcher_select ON profiles
  FOR SELECT USING (
    get_user_role() = 'dispatcher'
    AND (role = 'guard' OR id = auth.uid())
  );

-- Fix 2: Grant service_role access to public tables
-- The admin client (service role) needs table access for inviteUser and other admin ops.
-- service_role bypasses RLS but still needs base table grants.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;
