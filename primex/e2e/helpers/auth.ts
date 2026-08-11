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
    let bouncedTo: string | null = null
    try {
      bouncedTo = cached ? redirectTargetIn(await cached.text()) : null
    } catch {
      // Unlike `landingPathFor`, losing the body here is harmless — the worst case
      // is one redundant UI login, not a misreported access-control verdict.
      bouncedTo = null
    }
    if (!page.url().includes('/login') && !bouncedTo?.includes('/login')) return
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
  const attempts = 3
  const reasons: string[] = []

  for (let attempt = 1; attempt <= attempts; attempt++) {
    const probe = await probeRoute(page, target)
    if (probe.kind === 'redirect') return await settleOn(page, probe.to)
    if (probe.kind === 'served') return probe.path
    reasons.push(`attempt ${attempt}: ${probe.why}`)
  }

  // Only reachable when every attempt lost the response body AND the page never
  // moved — i.e. the environment misbehaved repeatedly. Still not reported as a
  // leak, because we never actually established that the page was served.
  throw new Error(
    `[e2e] could not determine where ${target} lands after ${attempts} attempts:\n  ` +
      reasons.join('\n  ')
  )
}

type Probe =
  | { kind: 'redirect'; to: string }
  | { kind: 'served'; path: string }
  | { kind: 'unreadable'; why: string }

/**
 * One navigation, and what it tells us.
 *
 * The invariant that matters: **`served` is only ever returned from a response body
 * we actually read.** Every other path can conclude `redirect` (positive evidence)
 * or `unreadable` (retry), never `served` — because "we failed to look" must not
 * become "the page was served", which the caller reads as an access-control leak.
 */
async function probeRoute(page: Page, target: string): Promise<Probe> {
  let response: Awaited<ReturnType<Page['goto']>> = null
  try {
    response = await page.goto(target)
  } catch (err) {
    // The redirect document's `<meta http-equiv="refresh" content="1;url=…">` fires
    // about a second in and can abort the navigation `goto` is still waiting on.
    // An aborted navigation is evidence the gate fired, not a reason to fail.
    if (String(err).includes('ERR_ABORTED')) {
      // fall through: the checks below find where it went
    } else if (isTransientNavigationError(err)) {
      // The browser never got to ask the question — a suspended or dropped
      // connection says nothing about the route, so retry rather than guess.
      return { kind: 'unreadable', why: `navigation failed transiently: ${String(err).split('\n')[0]}` }
    } else {
      throw err
    }
  }

  if (response) {
    let body: string | null = null
    try {
      body = await response.text()
    } catch (err) {
      // Playwright reads the body over CDP, and a superseded navigation can evict
      // the resource before we ask — "No resource with given identifier found".
      // Transient and worth retrying; anything else is a real fault.
      if (!isBodyUnavailable(err)) throw err
    }

    if (body !== null) {
      const to = redirectTargetIn(body)
      return to ? { kind: 'redirect', to } : { kind: 'served', path: await settledPath(page) }
    }
  }

  // No readable body. The same payload also lands in the DOM as a meta refresh,
  // which survives until the client router makes the hop.
  const fromMeta = await page
    .locator('meta#__next-page-redirect')
    .first()
    .getAttribute('content', { timeout: 1000 })
    .catch(() => null)
  const metaTarget = fromMeta?.split('url=')[1]
  if (metaTarget) return { kind: 'redirect', to: metaTarget }

  // Last resort: where did the browser actually end up? Moving off the requested
  // path proves a gate fired and names the destination. Staying put proves nothing
  // — the hop may simply not have started — so that case retries rather than
  // guessing "served".
  const settled = await settledPath(page)
  if (settled !== target) return { kind: 'redirect', to: settled }

  return {
    kind: 'unreadable',
    why: `response body was unavailable and the page never left ${target}`,
  }
}

/**
 * Network-stack failures that say nothing about the route — a laptop suspending
 * I/O, a dropped connection, a machine under enough load to time the socket out.
 * Retrying is honest here; concluding anything from them would not be.
 */
function isTransientNavigationError(err: unknown): boolean {
  const message = String(err)
  return [
    'ERR_NETWORK_IO_SUSPENDED',
    'ERR_NETWORK_CHANGED',
    'ERR_CONNECTION_RESET',
    'ERR_CONNECTION_CLOSED',
    'ERR_CONNECTION_REFUSED',
    'ERR_EMPTY_RESPONSE',
    'ERR_INTERNET_DISCONNECTED',
  ].some((code) => message.includes(code))
}

/** True for the CDP condition where a superseded navigation's body is gone. */
function isBodyUnavailable(err: unknown): boolean {
  const message = String(err)
  return (
    message.includes('No resource with given identifier found') ||
    message.includes('Network.getResponseBody')
  )
}

/** The path the browser rests on once the URL stops changing. */
async function settledPath(page: Page): Promise<string> {
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
 * Where a server component's `redirect()` is sending us, read out of the document,
 * or null if no gate fired.
 *
 * A role gate does NOT answer with a 3xx. Next returns HTTP 200 whose body carries
 * `NEXT_REDIRECT;replace;/dashboard;307;` in the RSC payload, plus a
 * `<meta http-equiv="refresh" content="1;url=…">` fallback for clients without JS;
 * the actual hop is made by the client router after hydration. So `page.goto()`
 * resolves with `page.url()` still on the requested path — for up to a second or
 * more — and a naive URL read reports every working redirect as a leak.
 *
 * Reading the verdict out of the payload instead is exact and needs no waiting: the
 * destination is right there.
 */
function redirectTargetIn(body: string): string | null {
  return (
    body.match(/NEXT_REDIRECT;[^;"]*;([^;"]+);/)?.[1] ??
    body.match(/id="__next-page-redirect"[^>]*content="[^;]*;url=([^"]+)"/)?.[1] ??
    null
  )
}
