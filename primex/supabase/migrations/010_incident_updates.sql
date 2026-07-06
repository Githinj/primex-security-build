-- ============================================================
-- 010: Incident on-scene updates (guard notes + photo evidence)
-- ============================================================
-- Guards capture field notes and photo evidence while working an incident.
-- These are stored as an append-only log (not overwriting the dispatcher's
-- `incidents.notes`) so the incident keeps a real audit trail.
-- ============================================================

CREATE TABLE incident_updates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  author_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  author_name TEXT NOT NULL,
  note        TEXT,
  photo_url   TEXT,
  status      TEXT,          -- incident status at the time of this update
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_incident_updates_incident ON incident_updates(incident_id, created_at);

-- ---------- RLS ----------
ALTER TABLE incident_updates ENABLE ROW LEVEL SECURITY;

-- super_admin + dispatcher: full access (they run the incident desk).
CREATE POLICY incident_updates_super_admin_all ON incident_updates
  FOR ALL USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

CREATE POLICY incident_updates_dispatcher_all ON incident_updates
  FOR ALL USING (get_user_role() = 'dispatcher')
  WITH CHECK (get_user_role() = 'dispatcher');

-- guard: read/write updates only for incidents assigned to them, and only as
-- themselves. Mirrors incidents_access (guard_id = auth.uid()).
CREATE POLICY incident_updates_guard ON incident_updates
  FOR ALL
  USING (
    get_user_role() = 'guard'
    AND incident_id IN (SELECT id FROM incidents WHERE guard_id = auth.uid())
  )
  WITH CHECK (
    get_user_role() = 'guard'
    AND author_id = auth.uid()
    AND incident_id IN (SELECT id FROM incidents WHERE guard_id = auth.uid())
  );

-- company_manager + client: read-only, scoped to their company's incidents.
CREATE POLICY incident_updates_company_select ON incident_updates
  FOR SELECT USING (
    get_user_role() IN ('company_manager', 'client')
    AND incident_id IN (
      SELECT i.id FROM incidents i
      JOIN sites s ON s.id = i.site_id
      WHERE s.company_id = get_user_company()
    )
  );

-- ---------- Evidence storage bucket ----------
-- Public read (photos render via a plain URL; paths are unguessable UUIDs).
-- Uploads happen server-side via the service role.
INSERT INTO storage.buckets (id, name, public)
VALUES ('incident-evidence', 'incident-evidence', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS incident_evidence_public_read ON storage.objects;
CREATE POLICY incident_evidence_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'incident-evidence');
