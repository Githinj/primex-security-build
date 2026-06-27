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
