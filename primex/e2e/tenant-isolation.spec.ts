import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

/**
 * Company boundary checks.
 *
 * Two managers on two different companies, asked the same questions. RLS is what
 * enforces the split, and RLS failures are quiet — a broken policy returns rows
 * rather than an error, so nothing short of "the other tenant's data is absent"
 * catches it. Each check is run from both sides so a policy that happens to be
 * right for one company and wrong for the other cannot hide.
 */

const TENANTS = {
  company_manager: {
    company: 'Apex Retail Group',
    own: ['Apex Retail — Westfield', 'Apex Retail — Bondi'],
    foreign: ['Nexus Warehouse A', 'Nexus Warehouse B', 'Orion Clinic — Parramatta', 'Pinnacle HQ'],
    ownCameras: ['CAM-01', 'CAM-04'],
    foreignCameras: ['CAM-05', 'CAM-07', 'CAM-08'],
  },
  company_manager_alt: {
    company: 'Nexus Logistics',
    own: ['Nexus Warehouse A', 'Nexus Warehouse B'],
    foreign: ['Apex Retail — Westfield', 'Apex Retail — Bondi', 'Orion Clinic — Parramatta', 'Pinnacle HQ'],
    ownCameras: ['CAM-05', 'CAM-06'],
    foreignCameras: ['CAM-01', 'CAM-04', 'CAM-07', 'CAM-08'],
  },
} as const

for (const [role, tenant] of Object.entries(TENANTS)) {
  test.describe(`Tenant isolation — ${tenant.company}`, () => {
    test.beforeEach(async ({ page }) => {
      await loginAs(page, role as keyof typeof TENANTS)
    })

    test('sites list contains own sites and no foreign ones', async ({ page }) => {
      await page.goto('/sites')
      const body = await page.locator('body').innerText()

      for (const site of tenant.own) {
        expect(body, `${tenant.company} cannot see its own site ${site}`).toContain(site)
      }
      for (const site of tenant.foreign) {
        expect(body, `${site} leaked to ${tenant.company} on /sites`).not.toContain(site)
      }
    })

    test('cameras list is scoped to own sites', async ({ page }) => {
      await page.goto('/cameras')
      await page.waitForLoadState('networkidle')
      const body = await page.locator('body').innerText()

      for (const cam of tenant.ownCameras) {
        expect(body, `${tenant.company} cannot see its own camera ${cam}`).toContain(cam)
      }
      for (const cam of tenant.foreignCameras) {
        expect(body, `${cam} leaked to ${tenant.company} on /cameras`).not.toContain(cam)
      }
    })

    test('team list contains no members of another company', async ({ page }) => {
      await page.goto('/team')
      await page.waitForLoadState('networkidle')
      const body = await page.locator('body').innerText()

      // Primex staff (super_admin/dispatcher) carry no company_id, so the only
      // safe assertion is the reverse: nobody from the *other* tenant appears.
      const foreignMembers =
        role === 'company_manager'
          ? ['Nadia Okonkwo', 'Brett Collins', 'Priya Nair']
          : ['Claire Mackay', 'Marcus Webb', 'Damien Frost']

      for (const person of foreignMembers) {
        expect(body, `${person} leaked into ${tenant.company}'s team list`).not.toContain(person)
      }
    })

    test('incidents list carries no foreign site', async ({ page }) => {
      await page.goto('/incidents')
      await page.waitForLoadState('networkidle')
      const body = await page.locator('body').innerText()

      for (const site of tenant.foreign) {
        expect(body, `an incident at ${site} leaked to ${tenant.company}`).not.toContain(site)
      }
    })

    test('reports list carries no other company’s report', async ({ page }) => {
      await page.goto('/reports')
      await page.waitForLoadState('networkidle')
      const body = await page.locator('body').innerText()

      const foreignReports =
        role === 'company_manager'
          ? ['Nexus Logistics Monthly', 'Orion Healthcare Onboarding Audit']
          : ['Apex Retail Monthly', 'Orion Healthcare Onboarding Audit']

      for (const report of foreignReports) {
        expect(body, `report "${report}" leaked to ${tenant.company}`).not.toContain(report)
      }
    })
  })
}
