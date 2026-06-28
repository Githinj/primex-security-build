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
    // Wait for sites to load after company selection, then pick first site
    const siteSelect = dialog.locator('select').nth(1)
    await siteSelect.waitFor({ state: 'attached' })
    await expect(siteSelect.locator('option')).not.toHaveCount(1) // wait for options beyond placeholder
    const siteOptions = await siteSelect.locator('option:not([value=""])').all()
    if (siteOptions.length > 0) await siteSelect.selectOption({ index: 1 })
    await dialog.locator('select').nth(3).selectOption({ label: 'Warning' })
    await dialog.getByPlaceholder(/Brief description of the alert/).fill(ALERT_TITLE)
    await dialog.getByPlaceholder(/Additional context/).fill('Automated E2E test alert')

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
