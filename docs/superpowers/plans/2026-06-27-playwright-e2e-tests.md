# Playwright E2E Tests Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Playwright E2E tests covering auth, alerts, incidents, dispatch, management CRUD, and guard mobile flow.

**Architecture:** Install Playwright in the existing Next.js project, create an `e2e/` directory with a shared auth helper and 6 spec files. Tests run against local Supabase with seed data. A globalSetup script resets the DB before each full run.

**Tech Stack:** Playwright Test, Chromium, Supabase local, Next.js dev server

---

## Chunk 1: Infrastructure

### Task 1: Install Playwright and configure

**Files:**
- Modify: `primex/package.json`
- Create: `primex/playwright.config.ts`
- Create: `primex/e2e/global-setup.ts`

- [ ] **Step 1: Install Playwright**

Run from `primex/`:
```bash
npm install -D @playwright/test
npx playwright install chromium
```

- [ ] **Step 2: Add npm scripts to package.json**

Add to `scripts`:
```json
"test:e2e": "playwright test",
"test:e2e:headed": "playwright test --headed"
```

- [ ] **Step 3: Create playwright.config.ts**

```typescript
import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 30000,
  },
})
```

- [ ] **Step 4: Create e2e/global-setup.ts**

```typescript
import { execSync } from 'child_process'

export default function globalSetup() {
  console.log('[global-setup] Resetting Supabase database...')
  execSync('npx supabase db reset', { stdio: 'inherit', cwd: __dirname + '/..' })
  console.log('[global-setup] Database reset complete.')
}
```

- [ ] **Step 5: Verify Playwright runs (empty test)**

Create a temporary `e2e/smoke.spec.ts`:
```typescript
import { test, expect } from '@playwright/test'

test('dev server is running', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBeLessThan(400)
})
```

Run: `npx playwright test smoke.spec.ts`
Expected: PASS

- [ ] **Step 6: Delete smoke test, commit**

Delete `e2e/smoke.spec.ts`.

```bash
git add playwright.config.ts e2e/global-setup.ts package.json package-lock.json
git commit -m "chore: add Playwright config and global setup (SEC-92)"
```

---

### Task 2: Auth helper

**Files:**
- Create: `primex/e2e/helpers/auth.ts`

The auth helper uses the UI login flow and caches `storageState` per role. This is more reliable than manually crafting cookies, since `@supabase/ssr` uses its own chunked cookie format internally.

- [ ] **Step 1: Create the auth helper**

```typescript
import { type Page, type BrowserContext } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

const USERS = {
  super_admin: { email: 'jordan@primexsecurity.com.au', home: '/dashboard' },
  dispatcher: { email: 'samira@primexsecurity.com.au', home: '/dispatcher' },
  guard: { email: 'marcus@primexsecurity.com.au', home: '/guard' },
  company_manager: { email: 'claire@apexretail.com.au', home: '/manager' },
  client: { email: 'brett@nexuslogistics.com.au', home: '/portal' },
} as const

export type Role = keyof typeof USERS

const AUTH_DIR = path.join(__dirname, '..', '.auth')

function storageStatePath(role: Role): string {
  return path.join(AUTH_DIR, `${role}.json`)
}

/**
 * Login as a seed user. Caches storageState per role to avoid
 * repeating the UI login flow for every test.
 */
export async function loginAs(page: Page, role: Role) {
  const user = USERS[role]
  const statePath = storageStatePath(role)

  // If cached storage state exists, restore it and navigate
  if (fs.existsSync(statePath)) {
    await page.context().addCookies(
      JSON.parse(fs.readFileSync(statePath, 'utf-8')).cookies ?? []
    )
    await page.goto(user.home)
    // Verify we're authenticated (not redirected to login)
    const url = page.url()
    if (!url.includes('/login')) return
    // If redirected, cache is stale — fall through to UI login
  }

  // UI login flow
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(user.email)
  await page.getByPlaceholder('Enter your password').fill('testpass123')
  await page.getByRole('button', { name: /Continue/ }).click()
  await page.waitForURL(`**${user.home}`)

  // Cache storage state for future tests
  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })
  await page.context().storageState({ path: statePath })
}

export function getHomePath(role: Role): string {
  return USERS[role].home
}
```

- [ ] **Step 2: Add .auth/ to .gitignore**

Append to `primex/.gitignore`:
```
# Playwright auth cache
e2e/.auth/
```

- [ ] **Step 3: Commit**

```bash
git add e2e/helpers/auth.ts .gitignore
git commit -m "feat: add Playwright auth helper with storageState caching (SEC-92)"
```

---

## Chunk 2: Auth & Alert Tests

### Task 3: auth.spec.ts

**Files:**
- Create: `primex/e2e/auth.spec.ts`

- [ ] **Step 1: Write auth tests**

```typescript
import { test, expect } from '@playwright/test'
import { loginAs, type Role } from './helpers/auth'

test.describe('Auth & Role Routing', () => {
  test('UI login flow — super_admin', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('you@example.com').fill('jordan@primexsecurity.com.au')
    await page.getByPlaceholder('Enter your password').fill('testpass123')
    await page.getByRole('button', { name: /Continue/ }).click()
    await page.waitForURL('**/dashboard')
    await expect(page).toHaveURL(/\/dashboard/)
  })

  const roles: { role: Role; path: string }[] = [
    { role: 'super_admin', path: '/dashboard' },
    { role: 'dispatcher', path: '/dispatcher' },
    { role: 'guard', path: '/guard' },
    { role: 'company_manager', path: '/manager' },
    { role: 'client', path: '/portal' },
  ]

  for (const { role, path } of roles) {
    test(`API login + redirect — ${role}`, async ({ page }) => {
      await loginAs(page, role)
      await expect(page).toHaveURL(new RegExp(path))
    })
  }

  test('unauthenticated access redirects to /login', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx playwright test auth.spec.ts`
Expected: All 7 tests PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/auth.spec.ts
git commit -m "test: auth and role routing E2E tests (SEC-92)"
```

---

### Task 4: alerts.spec.ts

**Files:**
- Create: `primex/e2e/alerts.spec.ts`

The create alert form (`components/alerts/create-alert-modal.tsx`) uses native `<select>` elements. Form fields in order:
- Company: `select` index 0, placeholder "Select company…"
- Site: `select` index 1, placeholder "Select site…"
- Camera: `select` index 2, placeholder "Select camera…" (optional)
- Severity: `select` index 3, placeholder "Select severity…"
- Title: `TextInput` placeholder "Brief description of the alert…"
- Description: `TextArea` placeholder "Additional context, observations, or notes…"
- Submit: Button "Create alert"
- Success: "Alert created & incident opened.", "Done" button

Seed data: company "Apex Retail Group", site "Apex Retail — Westfield", alert "Perimeter breach detected" (Critical, New status).

- [ ] **Step 1: Write alert lifecycle tests**

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const ALERT_TITLE = `E2E Test Alert ${Date.now()}`

test.describe('Alert & Incident Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin')
  })

  test('create alert and verify incident auto-created', async ({ page }) => {
    await page.goto('/alerts')
    await page.getByRole('button', { name: /Create alert/ }).click()

    // Fill the create alert form
    const dialog = page.getByRole('dialog')
    await dialog.locator('select').nth(0).selectOption({ label: 'Apex Retail Group' })
    await dialog.locator('select').nth(1).waitFor({ state: 'attached' })
    await dialog.locator('select').nth(1).selectOption({ label: /Apex Retail/ })
    await dialog.locator('select').nth(3).selectOption({ label: 'Warning' })
    await dialog.getByPlaceholder('Brief description of the alert').fill(ALERT_TITLE)
    await dialog.getByPlaceholder('Additional context').fill('Automated E2E test alert')

    // Submit
    await dialog.getByRole('button', { name: /Create alert/ }).click()

    // Wait for success state
    await expect(dialog.getByText('Alert created & incident opened.')).toBeVisible()
    await dialog.getByRole('button', { name: /Done/ }).click()

    // Verify alert appears in the list
    await expect(page.getByText(ALERT_TITLE)).toBeVisible()

    // Navigate to incidents and verify auto-created incident
    await page.goto('/incidents')
    await expect(page.getByText(ALERT_TITLE)).toBeVisible()
  })

  test('update alert status to closed', async ({ page }) => {
    await page.goto('/alerts')

    // Find the seed alert "Perimeter breach detected" and open its action menu
    const row = page.getByRole('row').filter({ hasText: 'Perimeter breach detected' }).first()
    await row.getByRole('button').last().click()

    // Click "Close alert"
    await page.getByText('Close alert').click()

    // Verify status updated
    await expect(row.getByText('Closed')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx playwright test alerts.spec.ts`
Expected: Both tests PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/alerts.spec.ts
git commit -m "test: alert and incident lifecycle E2E tests (SEC-92)"
```

---

## Chunk 3: Incidents & Dispatch Tests

### Task 5: incidents.spec.ts

**Files:**
- Create: `primex/e2e/incidents.spec.ts`

**Important:** The `/incidents` page is restricted to `super_admin` and `company_manager` only (see `incidents/page.tsx` line 20). Dispatcher is redirected away. Tests must use `super_admin`.

The incidents page (`incidents-client.tsx`) shows a DataTable with columns: Incident, Site, Severity, Status, Guard, Started. Action menu has "View" and "Close".

- [ ] **Step 1: Write incident lifecycle tests**

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Incident Lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin')
  })

  test('view incidents list with seed data', async ({ page }) => {
    await page.goto('/incidents')
    await expect(page.getByRole('heading', { name: /Incidents/ })).toBeVisible()
    // Seed data should have at least one incident row
    await expect(page.getByRole('row').nth(1)).toBeVisible()
  })

  test('close an incident via action menu', async ({ page }) => {
    await page.goto('/incidents')

    // Find an open seed incident
    const row = page.getByRole('row').filter({ hasText: 'Open' }).first()
    await row.getByRole('button').last().click()
    await page.getByText('Close').click()

    // Verify status changed
    await expect(row.getByText('Closed')).toBeVisible()
  })

  test('status change persists after reload', async ({ page }) => {
    await page.goto('/incidents')
    await page.reload()
    await expect(page.getByRole('heading', { name: /Incidents/ })).toBeVisible()
    // Page should still load correctly after reload
    await expect(page.getByRole('row').nth(1)).toBeVisible()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx playwright test incidents.spec.ts`
Expected: All 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/incidents.spec.ts
git commit -m "test: incident lifecycle E2E tests (SEC-92)"
```

---

### Task 6: dispatch.spec.ts

**Files:**
- Create: `primex/e2e/dispatch.spec.ts`

The dispatcher client (`dispatcher-client.tsx`) has section nav buttons: "Alert queue", "Incidents", "Dispatch board", "Guards on duty", "Activity log". The dispatch board (`dispatch.tsx`) has 4 columns: Open, Dispatched, In Progress, Resolved. The queue (`queue.tsx`) auto-selects the first alert and shows a detail panel with "Convert to incident" button that opens the AssignGuardModal.

The AssignGuardModal (`assign-guard-modal.tsx`) shows selectable guard cards (buttons with guard names). Footer has "Cancel" and "Send dispatch". Success shows "Dispatched." and "Done".

- [ ] **Step 1: Write dispatch tests**

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Dispatch Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'dispatcher')
  })

  test('dispatch board columns render in correct order', async ({ page }) => {
    await page.getByRole('button', { name: /Dispatch board/ }).click()
    await expect(page.getByText('Dispatch board')).toBeVisible()

    // Verify 4 columns render
    const columns = page.locator('h3')
    await expect(columns.filter({ hasText: 'Open' }).first()).toBeVisible()
    await expect(columns.filter({ hasText: 'Dispatched' }).first()).toBeVisible()
    await expect(columns.filter({ hasText: 'In Progress' }).first()).toBeVisible()
    await expect(columns.filter({ hasText: 'Resolved' }).first()).toBeVisible()
  })

  test('assign guard via queue', async ({ page }) => {
    // Alert queue is the default section — first alert is auto-selected
    await page.getByRole('button', { name: /Alert queue/ }).click()

    // Wait for the detail panel to load (auto-selected first alert)
    await expect(page.getByRole('button', { name: /Convert to incident/ })).toBeVisible()

    // Click "Convert to incident" to open assign guard modal
    await page.getByRole('button', { name: /Convert to incident/ }).click()

    // Select the first available guard in the modal
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Dispatch a responder')).toBeVisible()
    const guardButton = dialog.getByRole('button').filter({ hasText: /Marcus|Tom|Damien/ }).first()
    await guardButton.click()

    // Send dispatch
    await dialog.getByRole('button', { name: /Send dispatch/ }).click()

    // Verify success
    await expect(dialog.getByText('Dispatched.')).toBeVisible()
    await dialog.getByRole('button', { name: /Done/ }).click()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx playwright test dispatch.spec.ts`
Expected: Both tests PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/dispatch.spec.ts
git commit -m "test: dispatch board and queue E2E tests (SEC-92)"
```

---

## Chunk 4: Management & Guard Tests

### Task 7: management.spec.ts

**Files:**
- Create: `primex/e2e/management.spec.ts`

Key modals and selectors (all use native `<select>` — target with `dialog.locator('select').nth(N)`):
- **Add Site Modal**: Company (select 0), site name (placeholder "e.g. Apex Westfield"), type (select 1), address (placeholder "e.g. 123 Main St, Sydney NSW"), risk (select 2). Submit: "Create site & invite client". Success: "Site created."
- **Add Camera Modal**: Company (select 0), site (select 1), name (placeholder "e.g. CAM-09"), location (placeholder "e.g. Loading Dock North"), status (select 2). Submit: "Add camera". Success: "Camera added."
- **Invite Company Modal**: Name (placeholder "e.g. Apex Retail Group"), type (select 0), contact name (placeholder "Full name"), email (placeholder "name@company.com"), plan (select 1). Submit: "Send invitation". Success: "Invite sent."
- **Company Details Modal**: When opened via "Edit company" action menu, opens directly in edit mode — no extra "Edit" button click needed. Save: "Save changes". Success: "Saved."

- [ ] **Step 1: Write management CRUD tests**

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const SITE_NAME = `E2E Test Site ${Date.now()}`
const CAMERA_NAME = `E2E-CAM-${Date.now()}`
const COMPANY_NAME = `E2E Corp ${Date.now()}`

test.describe('Management CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin')
  })

  test('create site and toggle status', async ({ page }) => {
    await page.goto('/sites')
    await page.getByRole('button', { name: /Add site/ }).click()

    const dialog = page.getByRole('dialog')
    // Select company
    await dialog.locator('select').nth(0).selectOption({ label: 'Apex Retail Group' })
    // Fill site name
    await dialog.getByPlaceholder('e.g. Apex Westfield').fill(SITE_NAME)
    // Select type
    await dialog.locator('select').nth(1).selectOption('Retail')
    // Fill address
    await dialog.getByPlaceholder('e.g. 123 Main St').fill('456 Test Ave, Sydney NSW')
    // Select risk
    await dialog.locator('select').nth(2).selectOption('Low')

    // Submit
    await dialog.getByRole('button', { name: /Create site/ }).click()
    await expect(dialog.getByText('Site created.')).toBeVisible()
    await dialog.getByRole('button', { name: /Done/ }).click()

    // Verify in list
    await expect(page.getByText(SITE_NAME)).toBeVisible()

    // Toggle status via action menu
    const row = page.getByRole('row').filter({ hasText: SITE_NAME })
    await row.getByRole('button').last().click()
    await page.getByText(/Deactivate site/).click()

    // Confirm in toggle modal
    const confirmDialog = page.getByRole('dialog')
    await confirmDialog.getByRole('button', { name: /Deactivate|Confirm/ }).click()
  })

  test('create camera and edit name', async ({ page }) => {
    await page.goto('/cameras')
    await page.getByRole('button', { name: /Add camera/ }).click()

    const dialog = page.getByRole('dialog')
    // Select company
    await dialog.locator('select').nth(0).selectOption({ label: 'Apex Retail Group' })
    // Select site
    await dialog.locator('select').nth(1).selectOption({ label: /Apex Retail/ })
    // Fill camera name
    await dialog.getByPlaceholder('e.g. CAM-09').fill(CAMERA_NAME)
    // Fill location
    await dialog.getByPlaceholder('e.g. Loading Dock North').fill('E2E Test Location')
    // Select status
    await dialog.locator('select').nth(2).selectOption('Online')

    // Submit
    await dialog.getByRole('button', { name: /Add camera/ }).click()
    await expect(dialog.getByText('Camera added.')).toBeVisible()
    await dialog.getByRole('button', { name: /Done/ }).click()

    // Verify in grid
    await expect(page.getByText(CAMERA_NAME)).toBeVisible()

    // Edit camera via action menu
    const tile = page.locator('div').filter({ hasText: CAMERA_NAME }).first()
    await tile.getByRole('button').last().click()
    await page.getByText('Edit camera').click()

    // Edit the name in the edit modal
    const editDialog = page.getByRole('dialog')
    const nameInput = editDialog.getByPlaceholder('e.g. CAM-09')
    await nameInput.clear()
    await nameInput.fill(`${CAMERA_NAME}-EDITED`)
    await editDialog.getByRole('button', { name: /Save changes/ }).click()
    await expect(editDialog.getByText('Camera updated.')).toBeVisible()
  })

  test('create company and update details', async ({ page }) => {
    await page.goto('/companies')
    await page.getByRole('button', { name: /Invite company/ }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('e.g. Apex Retail Group').fill(COMPANY_NAME)
    await dialog.locator('select').nth(0).selectOption('Retail')
    await dialog.getByPlaceholder('Full name').fill('E2E Test Contact')
    await dialog.getByPlaceholder('name@company.com').fill(`e2e-${Date.now()}@test.com`)
    await dialog.locator('select').nth(1).selectOption('Starter')

    await dialog.getByRole('button', { name: /Send invitation/ }).click()
    await expect(dialog.getByText('Invite sent.')).toBeVisible()
    await dialog.getByRole('button', { name: /Done/ }).click()

    // Verify in list
    await expect(page.getByText(COMPANY_NAME)).toBeVisible()

    // Open edit modal via action menu (opens directly in edit mode)
    const row = page.getByRole('row').filter({ hasText: COMPANY_NAME })
    await row.getByRole('button').last().click()
    await page.getByText('Edit company').click()

    // Edit name — modal opens directly in edit mode, no extra button needed
    const editDialog = page.getByRole('dialog')
    const nameInput = editDialog.locator('input').first()
    await nameInput.clear()
    await nameInput.fill(`${COMPANY_NAME} Updated`)
    await editDialog.getByRole('button', { name: /Save changes/ }).click()
    await expect(editDialog.getByText('Saved.')).toBeVisible()
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx playwright test management.spec.ts`
Expected: All 3 tests PASS

- [ ] **Step 3: Commit**

```bash
git add e2e/management.spec.ts
git commit -m "test: management CRUD E2E tests (SEC-92)"
```

---

### Task 8: guard.spec.ts

**Files:**
- Create: `primex/e2e/guard.spec.ts`

The guard client (`guard-client.tsx`) shows assigned incidents. The guard status flow uses dynamic button text:
- "Accept dispatch" (Assigned → Accepted)
- "Mark en route" (Accepted → En Route)
- "Check in (arrived)" (En Route → Arrived)
- "Mark resolved" (Arrived → Resolved)

Success shows "Incident resolved." with a CheckCircle icon.

Note: The guard (marcus@) may not have assigned incidents in seed data. The test skips gracefully if no assignments exist.

- [ ] **Step 1: Write guard flow tests**

```typescript
import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Guard Mobile Flow', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'guard')
  })

  test('guard dashboard loads with no sidebar', async ({ page }) => {
    // Verify greeting
    await expect(page.getByText(/Hi Marcus/)).toBeVisible()

    // Verify no sidebar navigation (guard has no sidebar)
    await expect(page.locator('nav')).toHaveCount(0)
  })

  test('guard status flow to resolved', async ({ page }) => {
    // Check if there are assigned incidents
    const hasIncident = await page.getByText(/assignment/).isVisible().catch(() => false)
    if (!hasIncident) {
      test.skip()
      return
    }

    // Click on the first incident card
    const incidentCard = page.getByText(/Dispatched/).first()
    await incidentCard.click()

    // Walk through status progression, waiting for each button to appear
    const statusFlow: [RegExp, RegExp][] = [
      [/Accept dispatch/, /Mark en route/],
      [/Mark en route/, /Check in/],
      [/Check in/, /Mark resolved/],
    ]

    for (const [current, next] of statusFlow) {
      const button = page.getByRole('button', { name: current })
      if (await button.isVisible().catch(() => false)) {
        await button.click()
        await expect(page.getByRole('button', { name: next })).toBeVisible()
      }
    }

    // Final step — mark resolved
    const resolveButton = page.getByRole('button', { name: /Mark resolved/ })
    if (await resolveButton.isVisible().catch(() => false)) {
      await resolveButton.click()
      await expect(page.getByText('Incident resolved.')).toBeVisible()
    }
  })
})
```

- [ ] **Step 2: Run tests**

Run: `npx playwright test guard.spec.ts`
Expected: Both tests PASS (second may skip if no assigned incidents)

- [ ] **Step 3: Commit**

```bash
git add e2e/guard.spec.ts
git commit -m "test: guard mobile flow E2E tests (SEC-92)"
```

---

## Chunk 5: Final verification

### Task 9: Run full suite and finalize

- [ ] **Step 1: Run the complete test suite**

Run: `npx playwright test`
Expected: All tests across 6 spec files PASS

- [ ] **Step 2: Run the build to ensure no regressions**

Run: `npm run build`
Expected: Build succeeds

- [ ] **Step 3: Final commit with any fixes**

If any tests needed adjustment, commit the fixes:
```bash
git add -A
git commit -m "test: finalize Playwright E2E test suite (SEC-92)"
```

- [ ] **Step 4: Push and close Linear issue**

```bash
git push
```
Mark SEC-92 as Done in Linear.
