import { type Page } from '@playwright/test'
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
    // If redirected, cache is stale — clear cookies and fall through to UI login
    await page.context().clearCookies()
  }

  // UI login flow
  await page.goto('/login')
  await page.waitForURL('**/login')
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
