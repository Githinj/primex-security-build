import { type Page } from '@playwright/test'
import * as fs from 'fs'
import * as path from 'path'

/** Every seeded account is created with this password (`supabase/seed.sql`). */
export const TEST_PASSWORD = 'testpass123'

export interface Account {
  email: string
  /** Where `getRoleHomePath()` sends this account after login. */
  home: string
  /** Display name, as rendered in the app shell. */
  name: string
  role: 'super_admin' | 'dispatcher' | 'guard' | 'company_manager' | 'client'
  /** Owning company, or null for Primex staff who are not scoped to one. */
  company: string | null
}

/**
 * The seeded test accounts, keyed by the handle specs use with `loginAs()`.
 *
 * The five bare role names are the canonical account for that role. The suffixed
 * handles are second accounts that exist to make scoping observable — you cannot
 * prove a manager is confined to their own company with only one manager.
 *
 * `home` duplicates `getRoleHomePath()` in `src/lib/auth/role-redirect.ts` on
 * purpose: a test fixture that imports the thing it is testing cannot catch a
 * regression in it. Adding a role means updating both, plus `src/middleware.ts`.
 */
export const ACCOUNTS = {
  super_admin: {
    email: 'jordan@primexsecurity.com.au',
    home: '/dashboard',
    name: 'Jordan Blake',
    role: 'super_admin',
    company: null,
  },
  dispatcher: {
    email: 'samira@primexsecurity.com.au',
    home: '/dispatcher',
    name: 'Samira Osei',
    role: 'dispatcher',
    company: null,
  },
  dispatcher_alt: {
    email: 'tom@primexsecurity.com.au',
    home: '/dispatcher',
    name: 'Tom Nguyen',
    role: 'dispatcher',
    company: null,
  },
  guard: {
    email: 'marcus@primexsecurity.com.au',
    home: '/guard',
    name: 'Marcus Webb',
    role: 'guard',
    company: 'Apex Retail Group',
  },
  guard_unassigned: {
    // Seeded 'Available' with no incident of their own — the empty-state case.
    email: 'priya@primexsecurity.com.au',
    home: '/guard',
    name: 'Priya Nair',
    role: 'guard',
    company: 'Nexus Logistics',
  },
  company_manager: {
    email: 'claire@apexretail.com.au',
    home: '/manager',
    name: 'Claire Mackay',
    role: 'company_manager',
    company: 'Apex Retail Group',
  },
  company_manager_alt: {
    email: 'nadia@nexuslogistics.com.au',
    home: '/manager',
    name: 'Nadia Okonkwo',
    role: 'company_manager',
    company: 'Nexus Logistics',
  },
  client: {
    // Scoped to Nexus sites b003/b004 via `client_sites` (migration 013).
    email: 'brett@nexuslogistics.com.au',
    home: '/portal',
    name: 'Brett Collins',
    role: 'client',
    company: 'Nexus Logistics',
  },
} as const satisfies Record<string, Account>

export type Role = keyof typeof ACCOUNTS

const AUTH_DIR = path.join(__dirname, '..', '.auth')

function storageStatePath(role: Role): string {
  return path.join(AUTH_DIR, `${role}.json`)
}

/**
 * Log in as a seeded account. Caches storage state per account so only the first
 * spec to use one pays for the UI login; a stale cache falls back to a fresh login.
 */
export async function loginAs(page: Page, role: Role) {
  const user = ACCOUNTS[role]
  const statePath = storageStatePath(role)

  if (fs.existsSync(statePath)) {
    await page.context().addCookies(
      JSON.parse(fs.readFileSync(statePath, 'utf-8')).cookies ?? []
    )
    const cached = await page.goto(user.home)
    const bounced = await serverRedirectTarget(cached)
    if (!page.url().includes('/login') && !bounced?.includes('/login')) return
    // Cache was minted against an older database — start over.
    await page.context().clearCookies()
  }

  await loginThroughUi(page, user.email, TEST_PASSWORD)
  await page.waitForURL(`**${user.home}`)

  if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true })
  await page.context().storageState({ path: statePath })
}

/** The raw sign-in flow, without the caching — for tests *of* login itself. */
export async function loginThroughUi(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByPlaceholder('you@example.com').fill(email)
  await page.getByPlaceholder('Enter your password').fill(password)
  await page.getByRole('button', { name: /Continue/ }).click()
}

export async function logout(page: Page) {
  await page.context().clearCookies()
}

export function getHomePath(role: Role): string {
  return ACCOUNTS[role].home
}

/**
 * Navigate to `path` and report where the app actually left us. Used by the
 * access-matrix spec, where a redirect is the expected outcome half the time.
 */
export async function landingPathFor(page: Page, target: string): Promise<string> {
  let response: Awaited<ReturnType<Page['goto']>> = null
  try {
    response = await page.goto(target)
  } catch (err) {
    // The redirect document's `<meta http-equiv="refresh" content="1;url=…">` fires
    // about a second in and can abort the navigation `goto` is still waiting on.
    // An aborted navigation is evidence the gate fired, not a reason to fail.
    if (!String(err).includes('ERR_ABORTED')) throw err
  }

  const fromBody = await serverRedirectTarget(response)
  if (fromBody) return await settleOn(page, fromBody)

  // Same payload, read from the live DOM — covers the case where the response body
  // came back before Next had finished writing the redirect into it.
  const fromMeta = await page
    .locator('meta#__next-page-redirect')
    .first()
    .getAttribute('content', { timeout: 1000 })
    .catch(() => null)
  const metaTarget = fromMeta?.split('url=')[1]
  if (metaTarget) return await settleOn(page, metaTarget)

  // Nothing says "redirect", so the page really does look served. Confirm by
  // letting the URL go quiet — a false "leak" here is the worst failure this
  // helper can produce, so it is worth a couple of seconds to be sure.
  await page.waitForLoadState('domcontentloaded').catch(() => {})
  await page.waitForLoadState('networkidle').catch(() => {})
  let last = new URL(page.url()).pathname
  for (let stable = 0; stable < 4; ) {
    await page.waitForTimeout(250)
    const now = new URL(page.url()).pathname
    if (now === last) stable++
    else {
      last = now
      stable = 0
    }
  }
  return last
}

/**
 * Let the client router finish the hop before handing the answer back.
 *
 * The verdict is already known from the payload, so this is not about finding it —
 * it is about not leaving a navigation in flight. A caller that loops over routes
 * fires the next `goto()` immediately, and an unfinished hop from the previous
 * route surfaces as that route's path being reported for this one.
 */
async function settleOn(page: Page, target: string): Promise<string> {
  await page.waitForURL(`**${target}`, { timeout: 15000 }).catch(() => {})
  return target
}

/**
 * Where a server component's `redirect()` is sending us, or null if none fired.
 *
 * A role gate does NOT answer with a 3xx. Next returns HTTP 200 whose body carries
 * `NEXT_REDIRECT;replace;/dashboard;307;` in the RSC payload, plus a
 * `<meta http-equiv="refresh" content="1;url=…">` fallback for clients without JS;
 * the actual hop is made by the client router after hydration. So `page.goto()`
 * resolves with `page.url()` still on the requested path — for up to a second or
 * more — and a naive URL read reports every working redirect as a leak.
 *
 * Reading the verdict out of the response body instead is exact and needs no
 * waiting: the destination is right there in the payload.
 */
async function serverRedirectTarget(
  response: Awaited<ReturnType<Page['goto']>>
): Promise<string | null> {
  if (!response) return null
  let body: string
  try {
    body = await response.text()
  } catch (err) {
    // Never fall through to "no redirect" here. The caller reads that as "the page
    // was served", i.e. an access-control leak — and an unreadable body is an
    // environment problem, not a security finding.
    throw new Error(
      `[e2e] could not read the navigation response for ${response.url()}: ${String(err)}`
    )
  }
  return (
    body.match(/NEXT_REDIRECT;[^;"]*;([^;"]+);/)?.[1] ??
    body.match(/id="__next-page-redirect"[^>]*content="[^;]*;url=([^"]+)"/)?.[1] ??
    null
  )
}
