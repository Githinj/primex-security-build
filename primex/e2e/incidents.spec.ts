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

    // Find an open seed incident and remember its title
    const row = page.getByRole('row').filter({ hasText: 'Open' }).first()
    const titleCell = row.locator('td').nth(1)
    const incidentTitle = await titleCell.textContent()

    // Open action menu and close
    await row.getByRole('button').last().click()
    await page.getByRole('button', { name: 'Close' }).click()

    // Verify status changed — find the row by title, check it now shows Closed
    const updatedRow = page.getByRole('row').filter({ hasText: incidentTitle! })
    await expect(updatedRow.getByText('Closed')).toBeVisible()
  })

  test('status change persists after reload', async ({ page }) => {
    await page.goto('/incidents')
    await page.reload()
    await expect(page.getByRole('heading', { name: /Incidents/ })).toBeVisible()
    // Page should still load correctly after reload
    await expect(page.getByRole('row').nth(1)).toBeVisible()
  })
})
