# Primex Security — Supabase Integration Design Spec

## Goal

Replace all mock data with a real Supabase backend: database schema, email/password auth, full multi-tenant RLS, server-side data layer, and server component migration.

## Tech Stack

- **Framework**: Next.js 16 (App Router, TypeScript, Turbopack)
- **Database + Auth**: Supabase (PostgreSQL + Supabase Auth)
- **Styling**: Tailwind CSS v4
- **Auth method**: Email/password
- **Data fetching**: Server components via server-side Supabase client

---

## 1. Database Schema

### Enums

```sql
CREATE TYPE user_role AS ENUM ('super_admin', 'company_manager', 'dispatcher', 'guard', 'client');
CREATE TYPE company_status AS ENUM ('Active', 'Pending', 'Suspended');
CREATE TYPE site_risk AS ENUM ('Low', 'Medium', 'High');
CREATE TYPE site_status AS ENUM ('Active', 'Maintenance', 'Inactive');
CREATE TYPE camera_status AS ENUM ('Online', 'Offline', 'Maintenance', 'Unknown');
CREATE TYPE alert_severity AS ENUM ('Critical', 'Warning', 'Info');
CREATE TYPE alert_status AS ENUM ('New', 'Reviewing', 'Escalated', 'Closed');
CREATE TYPE incident_status AS ENUM ('Open', 'In Progress', 'Dispatched', 'Resolved', 'Closed');
CREATE TYPE guard_status AS ENUM ('Available', 'On Incident', 'Off-duty');
```

Note: `'In Progress'` and `'On Incident'` contain spaces. This matches existing TypeScript types and is valid PostgreSQL. URL params should use URL encoding when needed.

### Tables

**companies**
```
id          uuid PK DEFAULT gen_random_uuid()
name        text NOT NULL
type        text NOT NULL
status      company_status DEFAULT 'Active'
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```
- `sites` and `users` counts are computed, not stored

**sites**
```
id          uuid PK DEFAULT gen_random_uuid()
company_id  uuid FK -> companies NOT NULL ON DELETE CASCADE
name        text NOT NULL
type        text NOT NULL
address     text NOT NULL
risk        site_risk DEFAULT 'Low'
status      site_status DEFAULT 'Active'
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```
- `cameras` count is computed, not stored

**cameras**
```
id            uuid PK DEFAULT gen_random_uuid()
site_id       uuid FK -> sites NOT NULL ON DELETE CASCADE
name          text NOT NULL
location      text NOT NULL
status        camera_status DEFAULT 'Online'
last_checked  timestamptz DEFAULT now()
warning       text
created_at    timestamptz DEFAULT now()
updated_at    timestamptz DEFAULT now()
```

**profiles** (extends auth.users — replaces TEAM + GUARDS)
```
id            uuid PK FK -> auth.users(id) ON DELETE CASCADE
full_name     text NOT NULL
email         text NOT NULL UNIQUE
role          user_role NOT NULL
company_id    uuid FK -> companies ON DELETE SET NULL (NULL for super_admin, dispatcher)
status        text DEFAULT 'Active'
phone         text
zone          text
shifts        text
guard_status  guard_status
last_active   timestamptz
created_at    timestamptz DEFAULT now()
```
- Guards are profiles with `role = 'guard'` and populated phone/zone/shifts/guard_status fields
- A trigger on `auth.users` INSERT auto-creates a profile row

**alerts**
```
id          uuid PK DEFAULT gen_random_uuid()
site_id     uuid FK -> sites NOT NULL ON DELETE CASCADE
camera_id   uuid FK -> cameras ON DELETE SET NULL (nullable)
title       text NOT NULL
severity    alert_severity NOT NULL
status      alert_status DEFAULT 'New'
description text NOT NULL
source      text NOT NULL
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

**incidents**
```
id          uuid PK DEFAULT gen_random_uuid()
site_id     uuid FK -> sites NOT NULL ON DELETE CASCADE
alert_id    uuid FK -> alerts NOT NULL ON DELETE CASCADE
title       text NOT NULL
severity    alert_severity NOT NULL
status      incident_status DEFAULT 'Open'
guard_id    uuid FK -> profiles ON DELETE SET NULL (nullable)
started_at  timestamptz DEFAULT now()
notes       text
created_at  timestamptz DEFAULT now()
updated_at  timestamptz DEFAULT now()
```

**reports**
```
id             uuid PK DEFAULT gen_random_uuid()
company_id     uuid FK -> companies NOT NULL ON DELETE CASCADE
name           text NOT NULL
date           date NOT NULL
type           text NOT NULL
incident_count integer DEFAULT 0
size           text
created_at     timestamptz DEFAULT now()
```

**activity_log**
```
id          uuid PK DEFAULT gen_random_uuid()
actor_id    uuid FK -> profiles ON DELETE SET NULL (nullable, NULL for system events)
action      text NOT NULL
target      text NOT NULL
icon        text NOT NULL DEFAULT 'Activity'
tone        text NOT NULL DEFAULT 'gray'
metadata    jsonb DEFAULT '{}'
created_at  timestamptz DEFAULT now()
```
- `icon` stores Lucide icon name (e.g. 'Bell', 'Radio', 'CheckCircle')
- `tone` stores color variant ('red', 'amber', 'green', 'blue', 'gray')
- `actor_id` resolves to display name via profiles join; NULL actor = 'System'

### Indexes

```sql
CREATE INDEX idx_sites_company_id ON sites(company_id);
CREATE INDEX idx_cameras_site_id ON cameras(site_id);
CREATE INDEX idx_alerts_site_id ON alerts(site_id);
CREATE INDEX idx_alerts_camera_id ON alerts(camera_id);
CREATE INDEX idx_incidents_site_id ON incidents(site_id);
CREATE INDEX idx_incidents_guard_id ON incidents(guard_id);
CREATE INDEX idx_incidents_alert_id ON incidents(alert_id);
CREATE INDEX idx_profiles_company_id ON profiles(company_id);
CREATE INDEX idx_profiles_role ON profiles(role);
CREATE INDEX idx_reports_company_id ON reports(company_id);
CREATE INDEX idx_activity_log_actor_id ON activity_log(actor_id);
CREATE INDEX idx_activity_log_created_at ON activity_log(created_at DESC);
```

### Updated-at trigger

Auto-update `updated_at` on row modification for tables that have it:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
-- Applied to: companies, sites, cameras, alerts, incidents
```

---

## 2. Row-Level Security (RLS)

### Helper functions

```sql
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS user_role AS $$
  SELECT role FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION get_user_company()
RETURNS uuid AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;
```

### Policy matrix

| Table          | super_admin | company_manager      | dispatcher     | guard              | client             |
|----------------|-------------|----------------------|----------------|--------------------|--------------------|
| companies      | CRUD all    | Read own             | Read all       | --                 | Read own           |
| sites          | CRUD all    | CRUD own company     | Read all       | Read assigned site | Read own company   |
| cameras        | CRUD all    | CRUD own company     | Read all       | Read assigned site | Read own company   |
| alerts         | CRUD all    | Read own company     | Read all, update | Read assigned site | Read own company |
| incidents      | CRUD all    | Read own company     | CRUD all       | Read/update assigned | Read own company |
| reports        | CRUD all    | Read own company     | Read all       | --                 | Read own company   |
| profiles       | CRUD all    | Read own company     | Read all guards | Read own          | Read own           |
| activity_log   | Read all    | Read own company     | Read all       | Read own           | Read own company   |

**"Own company"** = entity's company_id matches user's company_id. For cameras/alerts/incidents, resolved via `site_id IN (SELECT id FROM sites WHERE company_id = get_user_company())`.

### Guard RLS detail

Guards use cross-table subqueries:
```sql
-- Guard can SELECT incidents assigned to them
CREATE POLICY guard_select_incidents ON incidents
  FOR SELECT TO authenticated
  USING (get_user_role() = 'guard' AND guard_id = auth.uid());

-- Guard can UPDATE only status/notes on assigned incidents
CREATE POLICY guard_update_incidents ON incidents
  FOR UPDATE TO authenticated
  USING (get_user_role() = 'guard' AND guard_id = auth.uid())
  WITH CHECK (get_user_role() = 'guard' AND guard_id = auth.uid());

-- Guard can read cameras/alerts at sites of their assigned incidents
CREATE POLICY guard_select_cameras ON cameras
  FOR SELECT TO authenticated
  USING (get_user_role() = 'guard' AND site_id IN (
    SELECT site_id FROM incidents WHERE guard_id = auth.uid()
  ));
```

If a guard has no assigned incidents, they see no site data (only their own profile). This is intentional — guards should only access data relevant to active assignments.

### Activity log company filtering

For company_manager and client roles, activity_log is filtered by joining through `actor_id -> profiles.company_id`:
```sql
CREATE POLICY cm_select_activity ON activity_log
  FOR SELECT TO authenticated
  USING (
    get_user_role() = 'company_manager' AND (
      actor_id IN (SELECT id FROM profiles WHERE company_id = get_user_company())
      OR actor_id IS NULL  -- system events visible to all
    )
  );
```

---

## 3. Auth Flow

### Sign-in
1. User submits email/password on `/login`
2. Client-side call to `supabase.auth.signInWithPassword({ email, password })`
3. Supabase sets session cookies via `@supabase/ssr`
4. Redirect to `/dashboard`

### Browser client fix
The existing `src/lib/supabase/client.ts` uses `createClient` from `@supabase/supabase-js`. This must change to `createBrowserClient` from `@supabase/ssr` so cookies are shared between client and server:
```ts
import { createBrowserClient } from '@supabase/ssr'
export function createBrowserSupabaseClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### Proxy (`proxy.ts`)
- Read session from cookies via `createServerSupabaseClient()`
- Call `supabase.auth.getUser()` to refresh the JWT token (prevents logout after 1hr expiry)
- No session + route under `/(app)/*` -> redirect to `/login`
- Session exists + route is `/login` -> redirect to `/dashboard`
- Pass through for all other requests

### `useAuth` hook
- Wraps `supabase.auth.getUser()` + profile lookup from Supabase
- Returns `{ user, profile, role, isLoading, signIn, signOut }`
- Used in client components (sidebar, page-strip) for display

### Sign-out
- `supabase.auth.signOut()` -> clear cookies -> redirect to `/login`

---

## 4. Type Migration

The existing TypeScript interfaces in `src/lib/types/index.ts` change as follows:

### Company — no change
Fields remain the same. `sites` and `users` counts are added via Supabase query joins (`.select('*, sites(count), profiles(count)')`), not stored columns.

### Site — no change
`cameras` count added via join. `company_id` stays as a UUID FK.

### Camera — no change
All fields map directly.

### Guard — replaced by Profile
```ts
// Old: separate Guard interface
interface Guard { id, name, status, zone, phone, shifts }

// New: Guard is a filtered Profile
interface Profile {
  id: string           // uuid
  full_name: string    // was "name"
  email: string
  role: UserRole
  company_id: string | null
  status: string
  phone: string | null
  zone: string | null
  shifts: string | null
  guard_status: GuardStatus | null
  last_active: string | null
}

// getGuards() returns Profile[] filtered to role='guard'
// UI maps profile.full_name where it used guard.name
// UI maps profile.guard_status where it used guard.status
```

### TeamMember — replaced by Profile
```ts
// Old: no id field
interface TeamMember { name, role, email, last_active, status }

// New: uses Profile (which has id)
// getTeamMembers() returns Profile[]
// profile.id enables edit/delete/toggle operations in team modals
```

### Alert — no change
All fields map directly.

### Incident — no change
`guard_id` changes from string to uuid but the TS type stays `string | null`.

### Report — company field changes
```ts
// Old
interface Report { ..., company: string }  // company name

// New
interface Report { ..., company_id: string, company_name?: string }
// getReports() joins companies to include company_name
// UI uses report.company_name where it used report.company
```

### ActivityItem — field mapping
```ts
// Old
interface ActivityItem { who, what, target, when, icon, tone }

// New (maps from activity_log table)
// who    <- profiles.full_name via actor_id join (NULL actor = 'System')
// what   <- action
// target <- target
// when   <- created_at
// icon   <- icon (stored in table)
// tone   <- tone (stored in table)
// getActivity() returns this shape after joining profiles
```

### RolePermission — no database table
`ROLES_PERMS` stays as a static constant (not stored in DB). It's a display-only config for the settings page.

---

## 5. Data Access Layer

### Structure

```
src/lib/data/
  companies.ts    -> getCompanies(), getCompanyById(id), getCompanyStats(id)
  sites.ts        -> getSites(companyId?), getSiteById(id)
  cameras.ts      -> getCameras(siteId?), getCameraById(id)
  alerts.ts       -> getAlerts(siteId?), getAlertById(id)
  incidents.ts    -> getIncidents(siteId?), getIncidentById(id), getIncidentTimeline(id)
  guards.ts       -> getGuards(), getGuardById(id)
  reports.ts      -> getReports(companyId?)
  activity.ts     -> getActivity(limit?)
  profiles.ts     -> getProfile(userId), getTeamMembers(companyId?)
  dashboard.ts    -> getDashboardStats()
```

### getDashboardStats() return type
```ts
{
  totalSites: number
  totalCameras: number
  activeAlerts: number
  openIncidents: number
  recentAlerts: Alert[]       // latest 5
  recentActivity: ActivityItem[] // latest 10
}
```

### Mutation functions (server actions)

For pages with create/edit/delete modals, server actions in the same data files:

```
  companies.ts    -> createCompany(), updateCompany()
  sites.ts        -> createSite(), updateSite()
  cameras.ts      -> createCamera(), updateCamera()
  alerts.ts       -> createAlert(), updateAlertStatus()
  incidents.ts    -> createIncident(), updateIncident(), assignGuard()
  profiles.ts     -> inviteTeamMember(), updateProfile(), toggleProfileStatus()
```

These are `'use server'` functions called from client components via form actions or direct invocation.

### Pattern

Each function:
1. Calls `createServerSupabaseClient()` for a session-scoped client
2. Runs a Supabase query — RLS filters automatically based on user's role
3. Returns typed data matching updated TypeScript interfaces

---

## 6. Page Migration

### Server component conversion

All data pages become async server components:
- `/dashboard`, `/alerts`, `/alerts/[id]`, `/incidents`, `/incidents/[id]`
- `/sites`, `/sites/[id]`, `/cameras`, `/cameras/[id]`, `/guards`
- `/companies`, `/companies/[id]`, `/reports`, `/team`, `/settings`, `/audit`

### Pattern

```tsx
// Before
'use client'
import { ALERTS, SITES } from '@/lib/mock-data'

// After
import { getAlerts } from '@/lib/data/alerts'
import { getSites } from '@/lib/data/sites'

export default async function AlertsPage() {
  const [alerts, sites] = await Promise.all([getAlerts(), getSites()])
  return <AlertsClient alerts={alerts} sites={sites} />
}
```

### Client component extraction

Pages with interactivity (search, filters, modals) split into:
- `page.tsx` — async server component, fetches data
- `*-client.tsx` — `'use client'`, receives data as props, handles state

### Stays client-side
- `/(app)/layout.tsx` — sidebar interactivity, gets profile from `<ProfileProvider>`
- `/login` — form submission + auth
- `/` — landing page, no data

### ProfileProvider
- Server-side layout wrapper fetches profile via `getProfile(userId)`
- Passes profile as a prop to the client `<AppLayout>` component
- `<ProfileProvider>` context makes it available to sidebar, page-strip, etc.

---

## 7. Seed Data & Migration

### Files

- `supabase/migrations/001_initial_schema.sql` — enums, tables, indexes, triggers, RLS policies, helper functions
- `supabase/seed.sql` — mock data with deterministic UUIDs, test auth users

### Test users

| Email                          | Role            | Password    |
|--------------------------------|-----------------|-------------|
| jordan@primexsecurity.com.au   | super_admin     | testpass123 |
| claire@apexretail.com.au       | company_manager | testpass123 |
| samira@primexsecurity.com.au   | dispatcher      | testpass123 |
| marcus@primexsecurity.com.au   | guard           | testpass123 |
| brett@nexuslogistics.com.au    | client          | testpass123 |

### Local development

- `supabase init` in project root (creates `supabase/` directory)
- `supabase start` for local Docker-based Supabase
- `supabase db reset` runs migration + seed
- `.env.local` populated with local Supabase URL + anon key

### Generated types

After schema is created, run `supabase gen types typescript --local > src/lib/types/database.ts` to generate type-safe Supabase types. The data layer uses these internally; the app-facing interfaces in `src/lib/types/index.ts` are updated to match (see Section 4).

---

## 8. Verification

After implementation:
1. `npm run build` — no build errors
2. `npm run dev` — app loads and navigates
3. Sign in as each test user — verify role-appropriate data visibility
4. Verify RLS: company_manager cannot see other companies' data
5. Verify guard only sees assigned incidents
6. Verify all 19 routes render with real data
7. Test mutations: create alert, create site, invite team member
8. Test sign-out and session expiry redirect
