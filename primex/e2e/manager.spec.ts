import { test, expect } from '@playwright/test'
import { ACCOUNTS, loginAs } from './helpers/auth'

/**
 * The company_manager workspace at `/manager` — a single-page shell whose left nav
 * swaps sections client-side rather than navigating. Claire manages Apex Retail
 * Group; the seed gives Apex two sites, four cameras and several alerts/incidents,
 * and gives Nexus Logistics its own set that she must never see.
 */

const APEX_SITES = ['Apex Retail — Westfield', 'Apex Retail — Bondi']
const NEXUS_SITES = ['Nexus Warehouse A', 'Nexus Warehouse B']

test.describe('Company manager workspace', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'company_manager')
  })

  test('shell shows the manager’s own company', async ({ page }) => {
    await expect(page.getByText(ACCOUNTS.company_manager.company!, { exact: true }).first()).toBeVisible()
  })

  test('every nav section renders', async ({ page }) => {
    const sections: { nav: string; expect: RegExp }[] = [
      { nav: 'Dashboard', expect: /Active incidents|Active sites/ },
      { nav: 'My sites', expect: /Apex Retail/ },
      { nav: 'Cameras', expect: /CAM-0/ },
      { nav: 'Alerts', expect: /Severity|Status/ },
      { nav: 'Incidents', expect: /Incident|Resolved|Open/ },
      { nav: 'Team', expect: /Company Manager|Guard/ },
      { nav: 'Reports', expect: /Recent reports|Incidents this month/ },
    ]

    for (const section of sections) {
      await page.getByRole('button', { name: new RegExp(`^${section.nav}`) }).first().click()
      await expect(
        page.getByText(section.expect).first(),
        `manager section "${section.nav}" rendered nothing recognisable`
      ).toBeVisible({ timeout: 15000 })
    }
  })

  test('sites section is scoped to the manager’s own company', async ({ page }) => {
    await page.getByRole('button', { name: /^My sites/ }).first().click()

    for (const site of APEX_SITES) {
      await expect(page.getByText(site).first()).toBeVisible()
    }
    for (const site of NEXUS_SITES) {
      await expect(
        page.getByText(site),
        `${site} belongs to another company and must not appear`
      ).toHaveCount(0)
    }
  })

  test('manager sees only own-company rows on the shared /sites page', async ({ page }) => {
    await page.goto('/sites')
    await expect(page.getByRole('heading', { name: 'Sites', level: 1 })).toBeVisible()

    await expect(page.getByRole('row').filter({ hasText: 'Apex Retail — Westfield' })).toHaveCount(1)
    for (const site of [...NEXUS_SITES, 'Orion Clinic — Parramatta', 'Pinnacle HQ']) {
      await expect(
        page.getByRole('row').filter({ hasText: site }),
        `${site} leaked onto the manager's /sites list`
      ).toHaveCount(0)
    }
  })

  test('manager cannot reach the super-admin-only pages', async ({ page }) => {
    for (const path of ['/companies', '/guards', '/audit', '/dashboard']) {
      await page.goto(path)
      await expect(page, `${path} should bounce a manager home`).toHaveURL(/\/manager/)
    }
  })
})
