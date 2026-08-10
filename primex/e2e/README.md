# End-to-end suite

Playwright, Chromium only, `workers: 1` — every spec shares one database, so they
must stay serial.

## Running

```bash
# from primex/
npx supabase start          # the suite needs a local stack; it will not run without one
npm run test:e2e            # headless
npm run test:e2e:headed     # with the browser visible
npx playwright test e2e/portal.spec.ts   # one file
```

`npm run test:e2e` **drops and re-seeds the local database** (`e2e/global-setup.ts`
runs `supabase db reset`). Anything you were holding in local Supabase is gone.

## Why the suite ignores `.env.local`

A developer's `.env.local` points `NEXT_PUBLIC_SUPABASE_URL` at the *remote*
Supabase project and carries live Resend, Stripe, DigitalOcean Spaces and
production Ant Media credentials. A suite that resets the database and exercises
create/delete flows must not inherit any of that.

So `playwright.config.ts` starts its own dev server on **port 3100** with the
environment in `e2e/env.ts`, which:

- points Supabase at `http://127.0.0.1:54321`,
- blanks every outbound integration, so an invite test sends no mail and a camera
  test provisions no broadcast on the production stream server (each of those
  layers degrades to a logged no-op when its key is unset),
- refuses to start at all if the Supabase URL is not a local host
  (`assertLocalSupabase()`).

Port 3100 and `reuseExistingServer: false` are deliberate: a dev server you started
by hand on port 3000 *does* inherit `.env.local`, and reusing it would put the
whole suite back on production.

## Test accounts

All ten are created by `supabase/seed.sql` with the password **`testpass123`**, and
exist only where `supabase db reset` has run — i.e. locally. They are not the
deployed project's accounts.

| Handle (`loginAs`)     | Email                          | Role             | Company            | Lands on      |
| ---------------------- | ------------------------------ | ---------------- | ------------------ | ------------- |
| `super_admin`          | jordan@primexsecurity.com.au   | super_admin      | —                  | `/dashboard`  |
| `dispatcher`           | samira@primexsecurity.com.au   | dispatcher       | —                  | `/dispatcher` |
| `dispatcher_alt`       | tom@primexsecurity.com.au      | dispatcher       | —                  | `/dispatcher` |
| `guard`                | marcus@primexsecurity.com.au   | guard            | Apex Retail Group  | `/guard`      |
| `guard_unassigned`     | priya@primexsecurity.com.au    | guard            | Nexus Logistics    | `/guard`      |
| `company_manager`      | claire@apexretail.com.au       | company_manager  | Apex Retail Group  | `/manager`    |
| `company_manager_alt`  | nadia@nexuslogistics.com.au    | company_manager  | Nexus Logistics    | `/manager`    |
| `client`               | brett@nexuslogistics.com.au    | client           | Nexus Logistics    | `/portal`     |

Two accounts exist purely to make scoping observable — you cannot prove a manager
is confined to their own company with only one manager, so `company_manager_alt`
(Nexus) sits opposite `company_manager` (Apex) and each is asked whether it can see
the other's sites, cameras, team, incidents and reports. `guard_unassigned` covers
the empty-state half of the guard flow. Two seeded guards (`damien`, `leila`) have
no handle; add one if a spec needs them.

The client is scoped per *site*, not per company: `client_sites` maps Brett to both
Nexus warehouses (migration 013).

`loginAs()` caches cookies per account under `e2e/.auth/`; `global-setup` clears
that directory on every run, since a cache minted against the previous database is
worthless after the reset.

## What each spec covers

| Spec | Covers |
| --- | --- |
| `auth.spec.ts` | login through the UI, role → home redirect for all five roles, signed-out redirect |
| `access-control.spec.ts` | the role × route matrix — every role against all 15 protected routes, plus signed-out |
| `alerts.spec.ts` | create alert → auto-opened incident; close an alert |
| `incidents.spec.ts` | incident list, close via action menu, persistence across reload |
| `dispatch.spec.ts` | dispatcher board columns, convert alert → incident, assign a guard |
| `guard.spec.ts` | guard mobile shell, the full `assigned → accepted → enroute → arrived → resolved` walk, and that a resolve survives a reload |
| `manager.spec.ts` | manager workspace sections, own-company scoping, denied admin routes |
| `portal.spec.ts` | client portal sections, per-site scoping, report-an-incident modal |
| `tenant-isolation.spec.ts` | two managers on two companies, each checked for the other's data |
| `admin-features.spec.ts` | guards roster, companies, audit log + CSV export, team, settings, reports |

Two specs deliberately fail rather than skip when their fixture is not in the
expected state. `guard.spec.ts` refuses to run its lifecycle walk against an
already-resolved incident, and refuses to treat an empty assignment list as
"nothing to check" — a test that quietly asserts nothing is worse than one that
fails, because it reports the feature as covered. If it fails with *"is already
resolved"*, the database was not reset; that is the message working as intended.

`access-control.spec.ts` is the one to keep green above all others. `src/middleware.ts`
checks only that *someone* is signed in — it has no notion of role — so the only
thing standing between a guard and `/companies` is the `redirect()` in each page's
server component. Lose one of those and middleware will serve the page happily.
