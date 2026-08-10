/**
 * Environment the E2E suite runs the app under.
 *
 * `.env.local` on a developer machine points at the *remote* Supabase project and
 * carries live Resend / Stripe / DigitalOcean / Ant Media credentials. The E2E
 * suite resets the database and exercises create/delete flows, so it must never
 * inherit that file. Everything below is passed to the dev server via Playwright's
 * `webServer.env`, which lands in `process.env` before Next.js loads `.env.local` —
 * and Next.js never overrides a variable that is already set.
 *
 * The Supabase keys are the fixed demo keys every `supabase start` produces
 * locally; they are not secrets. Override with E2E_SUPABASE_* if your local stack
 * was configured with different ones.
 */

export const E2E_PORT = Number(process.env.E2E_PORT ?? 3100)
export const E2E_BASE_URL = `http://localhost:${E2E_PORT}`

export const E2E_SUPABASE_URL =
  process.env.E2E_SUPABASE_URL ?? 'http://127.0.0.1:54321'

const E2E_SUPABASE_ANON_KEY =
  process.env.E2E_SUPABASE_ANON_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const E2E_SUPABASE_SERVICE_ROLE_KEY =
  process.env.E2E_SUPABASE_SERVICE_ROLE_KEY ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

/**
 * Integrations that reach the outside world. Every one of these degrades to a
 * logged no-op when unset (see `isEmailConfigured()`, `isPushConfigured()`,
 * `isBillingConfigured()`), which is exactly what the suite wants: an invite test
 * must not send real mail, and a camera test must not provision a broadcast on the
 * production Ant Media server.
 */
const NEUTRALISED_INTEGRATIONS = [
  'RESEND_API_KEY',
  'NOTIFICATIONS_FROM_EMAIL',
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_STARTER',
  'STRIPE_PRICE_PROFESSIONAL',
  'ANTMEDIA_URL',
  'ANTMEDIA_WS_URL',
  'ANTMEDIA_RTMP_URL',
  'ANTMEDIA_API_KEY',
  'ANTMEDIA_WEBHOOK_SECRET',
  'DO_SPACES_KEY',
  'DO_SPACES_SECRET',
  'DO_SPACES_ENDPOINT',
  'DO_SPACES_RECORDINGS_BUCKET',
  'NEXT_PUBLIC_VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'TEST_LOGIN_SECRET',
] as const

export function e2eServerEnv(): Record<string, string> {
  const env: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: E2E_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: E2E_SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: E2E_SUPABASE_SERVICE_ROLE_KEY,
    NEXT_PUBLIC_SITE_URL: E2E_BASE_URL,
    NODE_ENV: 'development',
  }
  for (const key of NEUTRALISED_INTEGRATIONS) env[key] = ''
  return env
}

/**
 * Fails closed if the suite is about to run against anything but a local stack.
 * `global-setup` drops the database, so this is the last line of defence between
 * `npm run test:e2e` and someone's production data.
 */
export function assertLocalSupabase() {
  let host: string
  try {
    host = new URL(E2E_SUPABASE_URL).hostname
  } catch {
    throw new Error(`[e2e] E2E_SUPABASE_URL is not a valid URL: ${E2E_SUPABASE_URL}`)
  }

  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1'
  if (!isLocal) {
    throw new Error(
      `[e2e] Refusing to run: the suite resets the database, but E2E_SUPABASE_URL ` +
        `points at "${host}". It must be a local Supabase stack.`
    )
  }
}
