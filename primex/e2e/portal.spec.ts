import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

/**
 * The client portal at `/portal`. Brett is a Nexus Logistics client mapped to both
 * Nexus sites through `client_sites` (migration 013) — per-site scoping, not just
 * per-company. Everything Apex, Orion and Pinnacle owns must be invisible to him.
 */

const VISIBLE_TO_BRETT = ['Nexus Warehouse A', 'Nexus Warehouse B']
const HIDDEN_FROM_BRETT = [
  'Apex Retail — Westfield',
  'Apex Retail — Bondi',
  'Orion Clinic — Parramatta',
  'Pinnacle HQ',
]

test.describe('Client portal', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'client')
  })

  test('every nav section renders', async ({ page }) => {
    const sections: { nav: string; expect: RegExp }[] = [
      { nav: 'My business', expect: /Your business at a glance/ },
      { nav: 'Recent alerts', expect: /Recent alerts at your business/ },
      { nav: 'Incident log', expect: /Incident log/ },
      { nav: 'My reports', expect: /My reports/ },
      { nav: 'Get help', expect: /Call dispatch|Email support/ },
    ]

    for (const section of sections) {
      await page.getByRole('button', { name: section.nav }).first().click()
      await expect(
        page.getByText(section.expect).first(),
        `portal section "${section.nav}" rendered nothing recognisable`
      ).toBeVisible({ timeout: 15000 })
    }
  })

  test('portal data is confined to the client’s mapped sites', async ({ page }) => {
    // Sweep every section, then assert on the whole page's text at once — a site
    // from another tenant leaking into *any* section is the same defect.
    for (const nav of ['My business', 'Recent alerts', 'Incident log', 'My reports']) {
      await page.getByRole('button', { name: nav }).first().click()
      await page.waitForLoadState('networkidle')

      const body = await page.locator('body').innerText()
      for (const site of HIDDEN_FROM_BRETT) {
        expect(body, `"${site}" leaked into the client portal section "${nav}"`).not.toContain(site)
      }
    }
  })

  test('client sees at least one of their own sites', async ({ page }) => {
    await page.getByRole('button', { name: 'My business' }).first().click()
    const body = await page.locator('body').innerText()
    const seesOwnSite = VISIBLE_TO_BRETT.some((s) => body.includes(s))
    expect(seesOwnSite, `portal showed none of the client's mapped sites (${VISIBLE_TO_BRETT.join(', ')})`).toBe(true)
  })

  test('client cannot reach any staff or manager route', async ({ page }) => {
    for (const path of ['/dashboard', '/alerts', '/incidents', '/sites', '/cameras', '/companies', '/manager', '/dispatcher', '/audit']) {
      await page.goto(path)
      await expect(page, `${path} should bounce a client to /portal`).toHaveURL(/\/portal/)
    }
  })

  test('report-an-incident flow opens from Get help', async ({ page }) => {
    await page.getByRole('button', { name: 'Get help' }).first().click()
    // "Report an incident" is the section heading; the control is labelled differently.
    await page.getByRole('button', { name: 'New incident report' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
  })
})
