-- ============================================================
-- Primex Security: Initial Schema Migration
-- ============================================================
-- Supabase / PostgreSQL
-- Run order: enums -> tables -> indexes -> triggers -> RLS
-- ============================================================

-- ===================  1. ENUM TYPES  ========================

CREATE TYPE user_role       AS ENUM ('super_admin','company_manager','dispatcher','guard','client');
CREATE TYPE company_status  AS ENUM ('Active','Pending','Suspended');
CREATE TYPE site_risk       AS ENUM ('Low','Medium','High');
CREATE TYPE site_status     AS ENUM ('Active','Maintenance','Inactive');
CREATE TYPE camera_status   AS ENUM ('Online','Offline','Maintenance','Unknown');
CREATE TYPE alert_severity  AS ENUM ('Critical','Warning','Info');
CREATE TYPE alert_status    AS ENUM ('New','Reviewing','Escalated','Closed');
CREATE TYPE incident_status AS ENUM ('Open','In Progress','Dispatched','Resolved','Closed');
CREATE TYPE guard_status    AS ENUM ('Available','On Incident','Off-duty');


-- ===================  2. TABLES  ============================

-- companies
CREATE TABLE companies (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,
  sites      INT  NOT NULL DEFAULT 0,
  users      INT  NOT NULL DEFAULT 0,
  status     company_status NOT NULL DEFAULT 'Active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- sites
CREATE TABLE sites (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL,
  address    TEXT NOT NULL,
  risk       site_risk   NOT NULL DEFAULT 'Low',
  status     site_status NOT NULL DEFAULT 'Active',
  cameras    INT  NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- cameras
CREATE TABLE cameras (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id      UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  location     TEXT NOT NULL,
  status       camera_status NOT NULL DEFAULT 'Online',
  last_checked TIMESTAMPTZ NOT NULL DEFAULT now(),
  warning      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- profiles  (PK references auth.users)
CREATE TABLE profiles (
  id           UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name    TEXT NOT NULL,
  email        TEXT NOT NULL,
  role         user_role    NOT NULL DEFAULT 'client',
  company_id   UUID REFERENCES companies(id) ON DELETE SET NULL,
  phone        TEXT,
  zone         TEXT,
  shifts       TEXT,
  guard_status guard_status,
  last_active  TIMESTAMPTZ,
  status       TEXT NOT NULL DEFAULT 'Active',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- alerts
CREATE TABLE alerts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title       TEXT NOT NULL,
  site_id     UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  camera_id   UUID REFERENCES cameras(id) ON DELETE SET NULL,
  severity    alert_severity NOT NULL DEFAULT 'Info',
  status      alert_status   NOT NULL DEFAULT 'New',
  description TEXT NOT NULL DEFAULT '',
  source      TEXT NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- incidents
CREATE TABLE incidents (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title      TEXT NOT NULL,
  site_id    UUID NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  alert_id   UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
  severity   alert_severity NOT NULL DEFAULT 'Info',
  status     incident_status NOT NULL DEFAULT 'Open',
  guard_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes      TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- reports
CREATE TABLE reports (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  date       DATE NOT NULL,
  type       TEXT NOT NULL,
  incidents  INT  NOT NULL DEFAULT 0,
  size       TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- activity_log
CREATE TABLE activity_log (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id   UUID REFERENCES profiles(id) ON DELETE SET NULL,
  actor_name TEXT NOT NULL,
  action     TEXT NOT NULL,
  target     TEXT NOT NULL,
  icon       TEXT NOT NULL DEFAULT 'Activity',
  tone       TEXT NOT NULL DEFAULT 'gray',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);


-- ===================  3. INDEXES  ===========================

-- Foreign-key indexes
CREATE INDEX idx_sites_company      ON sites(company_id);
CREATE INDEX idx_cameras_site       ON cameras(site_id);
CREATE INDEX idx_alerts_site        ON alerts(site_id);
CREATE INDEX idx_alerts_camera      ON alerts(camera_id);
CREATE INDEX idx_incidents_site     ON incidents(site_id);
CREATE INDEX idx_incidents_alert    ON incidents(alert_id);
CREATE INDEX idx_incidents_guard    ON incidents(guard_id);
CREATE INDEX idx_reports_company    ON reports(company_id);
CREATE INDEX idx_activity_actor     ON activity_log(actor_id);

-- Additional useful indexes
CREATE INDEX idx_profiles_role      ON profiles(role);
CREATE INDEX idx_profiles_company   ON profiles(company_id);
CREATE INDEX idx_activity_created   ON activity_log(created_at DESC);


-- ===================  4. TRIGGERS  ==========================

-- Generic updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_sites_updated_at BEFORE UPDATE ON sites
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_cameras_updated_at BEFORE UPDATE ON cameras
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_alerts_updated_at BEFORE UPDATE ON alerts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_incidents_updated_at BEFORE UPDATE ON incidents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ===================  5. RLS HELPER FUNCTIONS  ==============

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION get_user_company()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid();
$$;


-- ===================  6. ENABLE RLS  =======================

ALTER TABLE companies    ENABLE ROW LEVEL SECURITY;
ALTER TABLE sites        ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras      ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles     ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents    ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;


-- ===================  7. RLS POLICIES  =====================

-- ─── companies ──────────────────────────────────────────────

-- super_admin: full CRUD
CREATE POLICY companies_super_admin_all ON companies
  FOR ALL USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- company_manager: read own company
CREATE POLICY companies_manager_select ON companies
  FOR SELECT USING (
    get_user_role() = 'company_manager'
    AND id = get_user_company()
  );

-- dispatcher: read all
CREATE POLICY companies_dispatcher_select ON companies
  FOR SELECT USING (get_user_role() = 'dispatcher');

-- client: read own company
CREATE POLICY companies_client_select ON companies
  FOR SELECT USING (
    get_user_role() = 'client'
    AND id = get_user_company()
  );


-- ─── sites ─────────────────────────────────────────────────

-- super_admin: full CRUD
CREATE POLICY sites_super_admin_all ON sites
  FOR ALL USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- company_manager: CRUD own company
CREATE POLICY sites_manager_all ON sites
  FOR ALL USING (
    get_user_role() = 'company_manager'
    AND company_id = get_user_company()
  )
  WITH CHECK (
    get_user_role() = 'company_manager'
    AND company_id = get_user_company()
  );

-- dispatcher: read all
CREATE POLICY sites_dispatcher_select ON sites
  FOR SELECT USING (get_user_role() = 'dispatcher');

-- guard: read assigned site (sites linked via incidents)
CREATE POLICY sites_guard_select ON sites
  FOR SELECT USING (
    get_user_role() = 'guard'
    AND id IN (SELECT site_id FROM incidents WHERE guard_id = auth.uid())
  );

-- client: read own company
CREATE POLICY sites_client_select ON sites
  FOR SELECT USING (
    get_user_role() = 'client'
    AND company_id = get_user_company()
  );


-- ─── cameras ───────────────────────────────────────────────

-- super_admin: full CRUD
CREATE POLICY cameras_super_admin_all ON cameras
  FOR ALL USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- company_manager: CRUD own company cameras
CREATE POLICY cameras_manager_all ON cameras
  FOR ALL USING (
    get_user_role() = 'company_manager'
    AND site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
  )
  WITH CHECK (
    get_user_role() = 'company_manager'
    AND site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
  );

-- dispatcher: read all
CREATE POLICY cameras_dispatcher_select ON cameras
  FOR SELECT USING (get_user_role() = 'dispatcher');

-- guard: read cameras at assigned sites
CREATE POLICY cameras_guard_select ON cameras
  FOR SELECT USING (
    get_user_role() = 'guard'
    AND site_id IN (SELECT site_id FROM incidents WHERE guard_id = auth.uid())
  );

-- client: read own company cameras
CREATE POLICY cameras_client_select ON cameras
  FOR SELECT USING (
    get_user_role() = 'client'
    AND site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
  );


-- ─── alerts ────────────────────────────────────────────────

-- super_admin: full CRUD
CREATE POLICY alerts_super_admin_all ON alerts
  FOR ALL USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- company_manager: read own company alerts
CREATE POLICY alerts_manager_select ON alerts
  FOR SELECT USING (
    get_user_role() = 'company_manager'
    AND site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
  );

-- dispatcher: read all + update
CREATE POLICY alerts_dispatcher_select ON alerts
  FOR SELECT USING (get_user_role() = 'dispatcher');

CREATE POLICY alerts_dispatcher_update ON alerts
  FOR UPDATE USING (get_user_role() = 'dispatcher')
  WITH CHECK (get_user_role() = 'dispatcher');

-- guard: read alerts at assigned sites
CREATE POLICY alerts_guard_select ON alerts
  FOR SELECT USING (
    get_user_role() = 'guard'
    AND site_id IN (SELECT site_id FROM incidents WHERE guard_id = auth.uid())
  );

-- client: read own company alerts
CREATE POLICY alerts_client_select ON alerts
  FOR SELECT USING (
    get_user_role() = 'client'
    AND site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
  );


-- ─── incidents ─────────────────────────────────────────────

-- super_admin: full CRUD
CREATE POLICY incidents_super_admin_all ON incidents
  FOR ALL USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- company_manager: read own company incidents
CREATE POLICY incidents_manager_select ON incidents
  FOR SELECT USING (
    get_user_role() = 'company_manager'
    AND site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
  );

-- dispatcher: full CRUD
CREATE POLICY incidents_dispatcher_all ON incidents
  FOR ALL USING (get_user_role() = 'dispatcher')
  WITH CHECK (get_user_role() = 'dispatcher');

-- guard: read + update assigned incidents
CREATE POLICY incidents_guard_select ON incidents
  FOR SELECT USING (
    get_user_role() = 'guard'
    AND guard_id = auth.uid()
  );

CREATE POLICY incidents_guard_update ON incidents
  FOR UPDATE USING (
    get_user_role() = 'guard'
    AND guard_id = auth.uid()
  )
  WITH CHECK (
    get_user_role() = 'guard'
    AND guard_id = auth.uid()
  );

-- client: read own company incidents
CREATE POLICY incidents_client_select ON incidents
  FOR SELECT USING (
    get_user_role() = 'client'
    AND site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())
  );


-- ─── reports ───────────────────────────────────────────────

-- super_admin: full CRUD
CREATE POLICY reports_super_admin_all ON reports
  FOR ALL USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- company_manager: read own company
CREATE POLICY reports_manager_select ON reports
  FOR SELECT USING (
    get_user_role() = 'company_manager'
    AND company_id = get_user_company()
  );

-- dispatcher: read all
CREATE POLICY reports_dispatcher_select ON reports
  FOR SELECT USING (get_user_role() = 'dispatcher');

-- client: read own company
CREATE POLICY reports_client_select ON reports
  FOR SELECT USING (
    get_user_role() = 'client'
    AND company_id = get_user_company()
  );


-- ─── profiles ──────────────────────────────────────────────

-- super_admin: full CRUD
CREATE POLICY profiles_super_admin_all ON profiles
  FOR ALL USING (get_user_role() = 'super_admin')
  WITH CHECK (get_user_role() = 'super_admin');

-- company_manager: read own company
CREATE POLICY profiles_manager_select ON profiles
  FOR SELECT USING (
    get_user_role() = 'company_manager'
    AND company_id = get_user_company()
  );

-- dispatcher: read all guards
CREATE POLICY profiles_dispatcher_select ON profiles
  FOR SELECT USING (
    get_user_role() = 'dispatcher'
    AND role = 'guard'
  );

-- guard: read own profile
CREATE POLICY profiles_guard_select ON profiles
  FOR SELECT USING (
    get_user_role() = 'guard'
    AND id = auth.uid()
  );

-- client: read own profile
CREATE POLICY profiles_client_select ON profiles
  FOR SELECT USING (
    get_user_role() = 'client'
    AND id = auth.uid()
  );


-- ─── activity_log ──────────────────────────────────────────

-- super_admin: read all + insert
CREATE POLICY activity_super_admin_select ON activity_log
  FOR SELECT USING (get_user_role() = 'super_admin');

CREATE POLICY activity_super_admin_insert ON activity_log
  FOR INSERT WITH CHECK (get_user_role() = 'super_admin');

-- company_manager: read own company + system events
CREATE POLICY activity_manager_select ON activity_log
  FOR SELECT USING (
    get_user_role() = 'company_manager'
    AND (
      actor_id IN (SELECT id FROM profiles WHERE company_id = get_user_company())
      OR actor_id IS NULL  -- system events
    )
  );

-- dispatcher: read all + insert
CREATE POLICY activity_dispatcher_select ON activity_log
  FOR SELECT USING (get_user_role() = 'dispatcher');

CREATE POLICY activity_dispatcher_insert ON activity_log
  FOR INSERT WITH CHECK (get_user_role() = 'dispatcher');

-- guard: read own activity
CREATE POLICY activity_guard_select ON activity_log
  FOR SELECT USING (
    get_user_role() = 'guard'
    AND actor_id = auth.uid()
  );

-- client: read own company + system events
CREATE POLICY activity_client_select ON activity_log
  FOR SELECT USING (
    get_user_role() = 'client'
    AND (
      actor_id IN (SELECT id FROM profiles WHERE company_id = get_user_company())
      OR actor_id IS NULL  -- system events
    )
  );


-- ===================  8. AUTO-CREATE PROFILE TRIGGER  ======

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.email, ''),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
