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
