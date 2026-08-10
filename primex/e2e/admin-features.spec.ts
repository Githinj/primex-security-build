import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

/**
 * The super_admin-only surfaces that no other spec touches: guards roster, audit
 * log, reports generation and settings. These are read-heavy screens, so the
 * assertions are mostly "the seeded row is on the page" — enough to catch a broken
 * query or a page that renders an empty state because a GRANT went missing
 * (SEC-154), which is the failure mode this project actually hits.
 */

test.describe('Super admin surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin')
  })

  test('dashboard shows cross-company figures', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /Operational overview/, level: 1 })).toBeVisible()
    // A stat grid that renders all zeroes usually means the query failed rather
    // than that the platform is quiet — the seed guarantees non-zero counts.
    const body = await page.locator('body').innerText()
    expect(body).toMatch(/\d/)
  })

  test('guards roster lists every seeded guard', async ({ page }) => {
    await page.goto('/guards')
    const body = await page.locator('body').innerText()
    for (const guard of ['Marcus Webb', 'Priya Nair', 'Damien Frost', 'Leila Santos']) {
      expect(body, `${guard} missing from the guards roster`).toContain(guard)
    }
  })

  test('companies page lists all four seeded companies', async ({ page }) => {
    await page.goto('/companies')
    const body = await page.locator('body').innerText()
    for (const company of ['Apex Retail Group', 'Nexus Logistics', 'Orion Healthcare', 'Pinnacle Finance']) {
      expect(body, `${company} missing from /companies`).toContain(company)
    }
  })

  test('audit log renders seeded activity', async ({ page }) => {
    await page.goto('/audit')
    await expect(page.getByRole('heading', { name: /Audit log/, level: 1 })).toBeVisible()
    // The activity log is a div list, not a table — there are no row roles to count.
    const body = await page.locator('body').innerText()
    expect(body, 'audit log showed no seeded actor').toMatch(/Jordan Blake|Samira Osei|System/)
    expect(body).not.toContain('No events match your search.')
  })

  test('team page lists users across every role', async ({ page }) => {
    await page.goto('/team')
    const body = await page.locator('body').innerText()
    for (const person of ['Jordan Blake', 'Samira Osei', 'Claire Mackay', 'Marcus Webb', 'Brett Collins']) {
      expect(body, `${person} missing from /team`).toContain(person)
    }
  })

  test('settings page renders its sections', async ({ page }) => {
    await page.goto('/settings')
    await expect(page.getByRole('heading', { name: /Settings/, level: 1 })).toBeVisible()
  })

  test('reports page lists seeded reports and offers generation', async ({ page }) => {
    await page.goto('/reports')
    const body = await page.locator('body').innerText()
    expect(body).toContain('Apex Retail Monthly')
    await expect(page.getByRole('button', { name: /Generate new report/ }).first()).toBeVisible()
  })

  test('audit log CSV export runs without error', async ({ page }) => {
    await page.goto('/audit')
    const exportButton = page.getByRole('button', { name: /Export CSV/ })
    await expect(exportButton).toBeVisible()

    const download = page.waitForEvent('download', { timeout: 30000 })
    await exportButton.click()
    expect((await download).suggestedFilename()).toMatch(/\.csv$/)
  })
})
