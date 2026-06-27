# Playwright E2E Tests — Design Spec

## Overview

End-to-end tests for the Primex security platform using Playwright. Tests run against a local Next.js dev server + local Supabase with seed data.

## Infrastructure

### Dependencies

- `@playwright/test` (devDependency)
- Playwright Chromium browser (installed via `npx playwright install chromium`)

### Config (`primex/playwright.config.ts`)

- `baseURL`: `http://localhost:3000`
- Single project: Chromium only
- `webServer`: starts `npm run dev` on port 3000, `reuseExistingServer: true`
- `testDir`: `./e2e`
- `retries`: 1 (CI flake tolerance)
- `use.trace`: `on-first-retry` (for debugging failures)
- `globalSetup`: runs `supabase db reset` before the full suite to ensure clean seed state

### Commands

```bash
npx playwright test                    # run all
npx playwright test auth.spec.ts       # run single file
npx playwright test --headed           # watch in browser
```

### Prerequisites

- `supabase start` running with seed data
- Port 3000 available (webServer config handles `npm run dev`)

## Auth Helper (`e2e/helpers/auth.ts`)

`loginAs(page, role)` function that:

1. Calls Supabase REST auth endpoint (`/auth/v1/token?grant_type=password`) with seed user credentials
2. Gets `access_token` and `refresh_token`
3. Sets the auth cookie on the browser context — cookie name derived from `NEXT_PUBLIC_SUPABASE_URL` (local Supabase uses a fixed project ref)
4. Navigates to the role's home path to confirm auth works

Seed user mapping:

| Role | Email | Password |
|------|-------|----------|
| super_admin | jordan@primexsecurity.com.au | testpass123 |
| dispatcher | samira@primexsecurity.com.au | testpass123 |
| guard | marcus@primexsecurity.com.au | testpass123 |
| company_manager | claire@apexretail.com.au | testpass123 |
| client | brett@nexuslogistics.com.au | testpass123 |

## Test Specs

### 1. `auth.spec.ts` — Auth & Role Routing

- **UI login flow**: Navigate to `/login`, fill email/password for super_admin, submit, verify redirect to `/dashboard`
- **Role redirects**: For each of 5 roles, login via API helper, navigate to home path, verify correct page loads (`/dashboard`, `/dispatcher`, `/guard`, `/manager`, `/portal`)
- **Unauthenticated access**: Verify that visiting a protected route (e.g., `/dashboard`) without a session redirects to `/login`

Note: `proxy.ts` only enforces authenticated vs unauthenticated — it does NOT enforce cross-role route restrictions. Testing cross-role access is out of scope.

### 2. `alerts.spec.ts` — Alert & Incident Lifecycle

Login as: `super_admin`

- Create a new alert via the UI — fill title, select a seed site from dropdown, set severity, source, description, submit
- Verify alert appears in the alerts list (match by title)
- Navigate to incidents page, verify an incident with the same title was auto-created (via `create_alert_with_incident` RPC)
- Update alert status (e.g., to Reviewing, then Closed)
- Verify status change reflected in UI
- Clean up: delete created alert/incident in `afterAll`

### 3. `incidents.spec.ts` — Incident Lifecycle

Login as: `dispatcher`

- View incidents list, verify seed data visible
- Update incident status through the flow (Open → Dispatched → In Progress → Resolved)
- Edit incident details
- Verify status changes persist after page reload

### 4. `dispatch.spec.ts` — Dispatch Flow

Login as: `dispatcher`

**Dispatch board (visual verification):**
- Navigate to dispatch board section
- Verify columns render in correct order: Open, Dispatched, In Progress, Resolved
- Verify seed incidents appear in appropriate columns

**Queue (assign guard flow):**
- Navigate to dispatcher queue section
- Find an alert, open the Assign Guard modal
- Select an available guard, click "Send dispatch"
- Verify alert status updates and guard is assigned

### 5. `management.spec.ts` — CRUD Operations

Login as: `super_admin`

- **Sites**: Create site → verify in list → toggle status to Inactive → toggle back to Active
- **Cameras**: Create camera → verify in list → edit name
- **Companies**: Create company → verify in list → update details
- Clean up: delete created records in `afterAll`

### 6. `guard.spec.ts` — Guard Mobile Flow

Login as: `guard` with mobile viewport (`375x812`)

- Verify guard dashboard loads (no sidebar)
- View assigned incident
- Update status: In Progress → Resolved
- Verify incident marked as resolved

## Conventions

- Each spec file is independent — no ordering dependencies
- `globalSetup` resets seed data before the full suite; individual tests clean up created data in `afterAll`
- Use Playwright auto-waiting locators (`page.getByRole`, `page.getByText`) over CSS selectors
- `test.describe` blocks group related tests within each file
- No mocking — all tests hit the real local Supabase
