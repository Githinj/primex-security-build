-- ============================================================
-- 013: Per-site client scoping (portal isolation)
-- ============================================================
-- Business clients were scoped by company_id, so every client in a company
-- could see every site's cameras/alerts/incidents — even sites belonging to a
-- different business client. Introduce an explicit client -> site mapping and
-- re-scope the `client` RLS branches to it. (Reports stay company-scoped: they
-- are company-level aggregates with no site dimension — a separate concern.)
-- ============================================================

-- ---------- 1. Mapping table ----------
CREATE TABLE IF NOT EXISTS client_sites (
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  site_id    UUID NOT NULL REFERENCES sites(id)    ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, site_id)
);
CREATE INDEX IF NOT EXISTS idx_client_sites_user ON client_sites(user_id);

-- Backfill existing clients to their company's first site so they keep access.
-- Best-effort: for companies with multiple clients (the leak case) the true
-- per-client site was never recorded, so all map to the first site until an
-- admin corrects them — safe (over-restrictive), never leakier.
INSERT INTO client_sites (user_id, site_id)
SELECT p.id, s.id
FROM profiles p
JOIN LATERAL (
  SELECT id FROM sites WHERE company_id = p.company_id ORDER BY created_at LIMIT 1
) s ON true
WHERE p.role = 'client' AND p.company_id IS NOT NULL
ON CONFLICT DO NOTHING;

-- ---------- 2. Helper ----------
-- Site ids the current client may access. plpgsql + row_security off mirrors
-- get_user_company() to avoid recursive RLS evaluation.
CREATE OR REPLACE FUNCTION get_client_site_ids()
RETURNS SETOF UUID AS $$
BEGIN
  PERFORM set_config('row_security', 'off', true);
  RETURN QUERY SELECT site_id FROM public.client_sites WHERE user_id = auth.uid();
  PERFORM set_config('row_security', 'on', true);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public;

-- ---------- 3. client_sites RLS ----------
ALTER TABLE client_sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS client_sites_super_admin_all ON client_sites;
CREATE POLICY client_sites_super_admin_all ON client_sites
  FOR ALL USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

DROP POLICY IF EXISTS client_sites_manager ON client_sites;
CREATE POLICY client_sites_manager ON client_sites
  FOR ALL
  USING (get_user_role() = 'company_manager' AND site_id IN (SELECT id FROM sites WHERE company_id = get_user_company()))
  WITH CHECK (get_user_role() = 'company_manager' AND site_id IN (SELECT id FROM sites WHERE company_id = get_user_company()));

DROP POLICY IF EXISTS client_sites_self_select ON client_sites;
CREATE POLICY client_sites_self_select ON client_sites
  FOR SELECT USING (user_id = auth.uid());

-- ---------- 4. Re-scope client branches ----------
-- Only the `client` branch changes in each policy; other roles are unchanged.

DROP POLICY IF EXISTS sites_access ON sites;
CREATE POLICY sites_access ON sites FOR ALL USING (
  CASE get_user_role()
    WHEN 'super_admin' THEN true
    WHEN 'dispatcher' THEN true
    WHEN 'company_manager' THEN company_id = get_user_company()
    WHEN 'client' THEN id IN (SELECT get_client_site_ids())
    WHEN 'guard' THEN company_id = get_user_company()
    ELSE false
  END
);

DROP POLICY IF EXISTS cameras_access ON cameras;
CREATE POLICY cameras_access ON cameras FOR ALL USING (
  CASE get_user_role()
    WHEN 'super_admin' THEN true
    WHEN 'dispatcher' THEN true
    WHEN 'company_manager' THEN site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
    WHEN 'client' THEN site_id IN (SELECT get_client_site_ids())
    WHEN 'guard' THEN site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
    ELSE false
  END
);

DROP POLICY IF EXISTS alerts_access ON alerts;
CREATE POLICY alerts_access ON alerts FOR ALL USING (
  CASE get_user_role()
    WHEN 'super_admin' THEN true
    WHEN 'dispatcher' THEN true
    WHEN 'company_manager' THEN site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
    WHEN 'client' THEN site_id IN (SELECT get_client_site_ids())
    WHEN 'guard' THEN site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
    ELSE false
  END
);

DROP POLICY IF EXISTS incidents_access ON incidents;
CREATE POLICY incidents_access ON incidents FOR ALL USING (
  CASE get_user_role()
    WHEN 'super_admin' THEN true
    WHEN 'dispatcher' THEN true
    WHEN 'company_manager' THEN site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
    WHEN 'guard' THEN guard_id = auth.uid()
    WHEN 'client' THEN site_id IN (SELECT get_client_site_ids())
    ELSE false
  END
);

-- ---------- 5. incident_updates: split client from manager, site-scope client ----------
DROP POLICY IF EXISTS incident_updates_company_select ON incident_updates;

DROP POLICY IF EXISTS incident_updates_manager_select ON incident_updates;
CREATE POLICY incident_updates_manager_select ON incident_updates
  FOR SELECT USING (
    get_user_role() = 'company_manager'
    AND incident_id IN (
      SELECT i.id FROM incidents i JOIN sites s ON s.id = i.site_id
      WHERE s.company_id = get_user_company()
    )
  );

DROP POLICY IF EXISTS incident_updates_client_select ON incident_updates;
CREATE POLICY incident_updates_client_select ON incident_updates
  FOR SELECT USING (
    get_user_role() = 'client'
    AND incident_id IN (SELECT id FROM incidents WHERE site_id IN (SELECT get_client_site_ids()))
  );
