import { execSync } from 'child_process'
import { rmSync } from 'fs'
import * as path from 'path'
import { assertLocalSupabase, E2E_BASE_URL, E2E_SUPABASE_URL } from './env'
import { ROUTE_ACCESS } from './helpers/routes'

export default async function globalSetup() {
  // Must come first — everything below this line is destructive.
  assertLocalSupabase()
  console.log(`[global-setup] Target Supabase: ${E2E_SUPABASE_URL}`)

  // Cached auth cookies are minted against the previous database. `db reset`
  // invalidates them, and a stale cache costs every spec a failed navigation
  // before it falls back to a UI login.
  rmSync(path.join(__dirname, '.auth'), { recursive: true, force: true })

  // Escape hatch for iterating on a single spec: `db reset` costs minutes. Never
  // set this for a full run — the CRUD specs leave rows behind that the read-only
  // specs then count.
  if (process.env.E2E_SKIP_RESET !== '1') {
    resetDatabase()
  } else {
    console.log('[global-setup] E2E_SKIP_RESET=1 — leaving the database as it is.')
  }

  await warmRoutes()
}

function resetDatabase() {
  const maxRetries = 3
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[global-setup] Resetting Supabase database (attempt ${attempt}/${maxRetries})...`)
      execSync('npx supabase db reset', { stdio: 'inherit', cwd: path.join(__dirname, '..') })
      console.log('[global-setup] Database reset complete.')
      return
    } catch (err) {
      if (attempt === maxRetries) throw err
      console.log(`[global-setup] Reset failed, retrying in 5s...`)
      // `sleep` is not a command on Windows, where this repo is primarily developed.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5000)
    }
  }
}

/**
 * Request every protected route once, as a signed-in super_admin, before any spec
 * runs.
 *
 * `next dev` compiles a route the first time it is requested, and that first
 * response is not the finished document — it can come back without the page's
 * `NEXT_REDIRECT` payload or with an empty body. Specs that read the response to
 * decide whether a role gate fired then see "no redirect" and report a working
 * guard as an access-control leak. Warming the compiler here makes the first
 * request a spec makes the *second* request the server has seen.
 */
async function warmRoutes() {
  const ready = await waitForServer()
  if (!ready) {
    console.warn('[global-setup] Dev server never answered — skipping route warmup.')
    return
  }

  const login = await fetch(`${E2E_BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'jordan@primexsecurity.com.au',
      password: 'testpass123',
    }),
  })

  if (!login.ok) {
    console.warn(`[global-setup] Warmup login failed (${login.status}) — skipping route warmup.`)
    return
  }

  const cookie = login.headers
    .getSetCookie()
    .map((c) => c.split(';')[0])
    .join('; ')

  console.log(`[global-setup] Warming ${ROUTE_ACCESS.length} routes...`)
  for (const route of ROUTE_ACCESS) {
    try {
      // Read the body: the compile finishes when the response is fully consumed.
      await fetch(`${E2E_BASE_URL}${route.path}`, { headers: { cookie } }).then((r) => r.text())
    } catch (err) {
      console.warn(`[global-setup] Warmup of ${route.path} failed: ${String(err)}`)
    }
  }
  console.log('[global-setup] Route warmup complete.')
}

async function waitForServer(): Promise<boolean> {
  for (let i = 0; i < 60; i++) {
    try {
      await fetch(`${E2E_BASE_URL}/login`)
      return true
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
  }
  return false
}
