import { defineConfig } from '@playwright/test'
import { E2E_BASE_URL, E2E_PORT, e2eServerEnv } from './e2e/env'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  retries: 1,
  workers: 1,
  globalSetup: './e2e/global-setup.ts',
  // The suite drives `next dev`, which compiles each route the first time it is
  // requested. A spec that sweeps a dozen routes spends most of its budget on
  // compilation, not on the app, so the 30s default times out on the first pass
  // even when nothing is wrong.
  // 5 minutes: the access-control sweep visits every protected route for every
  // role, and each visit has to wait out a possible post-hydration redirect.
  timeout: 300000,
  expect: { timeout: 15000 },
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: E2E_BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { browserName: 'chromium' } },
  ],
  webServer: {
    // Deliberately not port 3000 and deliberately not reusing an existing server:
    // a dev server started by hand inherits `.env.local`, which points at the
    // remote Supabase project and holds live third-party credentials. The suite
    // must drive a server it started itself, with the env in `e2e/env.ts`.
    command: `npm run dev -- -p ${E2E_PORT}`,
    url: E2E_BASE_URL,
    reuseExistingServer: false,
    timeout: 120000,
    env: e2eServerEnv(),
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
