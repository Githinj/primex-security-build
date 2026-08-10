import { test, expect } from '@playwright/test'
import { ACCOUNTS, loginAs, landingPathFor, type Role } from './helpers/auth'
import { ROUTE_ACCESS } from './helpers/routes'

/**
 * The role × route access matrix.
 *
 * `src/middleware.ts` only checks that *someone* is signed in — it has no notion of
 * which role may see which route. The real gate is in each page's server component,
 * which redirects a disallowed role to `getRoleHomePath()`. That makes "wrong role
 * gets bounced home" the behaviour worth pinning: if a page ever loses its guard,
 * middleware will happily serve it and only this spec will notice.
 */

const ACTORS: Role[] = ['super_admin', 'dispatcher', 'guard', 'company_manager', 'client']

test.describe('Access control matrix', () => {
  for (const actor of ACTORS) {
    const account = ACCOUNTS[actor]

    test(`${actor} reaches exactly the routes its role allows`, async ({ page }) => {
      await loginAs(page, actor)

      const violations: string[] = []

      for (const route of ROUTE_ACCESS) {
        const landed = await landingPathFor(page, route.path)
        const allowed = route.allow.includes(account.role)

        if (allowed && landed !== route.path) {
          violations.push(`${route.path}: allowed for ${actor} but redirected to ${landed}`)
          continue
        }
        if (!allowed && landed === route.path) {
          violations.push(`${route.path}: LEAKED — ${actor} was served a page reserved for ${route.allow.join('/')}`)
          continue
        }
        if (!allowed && landed !== account.home) {
          violations.push(`${route.path}: ${actor} bounced to ${landed}, expected home ${account.home}`)
        }
      }

      expect(violations, `access-control violations for ${actor}:\n${violations.join('\n')}`).toEqual([])
    })
  }

  test('every unauthenticated protected route redirects to /login', async ({ page }) => {
    const leaks: string[] = []

    for (const route of ROUTE_ACCESS) {
      const landed = await landingPathFor(page, route.path)
      if (landed !== '/login') leaks.push(`${route.path} served to a signed-out visitor (landed on ${landed})`)
    }

    expect(leaks, leaks.join('\n')).toEqual([])
  })

  test('super_admin pages render their own heading, not a redirect target', async ({ page }) => {
    await loginAs(page, 'super_admin')

    for (const route of ROUTE_ACCESS) {
      if (!route.heading) continue
      await page.goto(route.path)
      await expect(
        page.getByRole('heading', { name: route.heading, level: 1 }),
        `${route.path} should render its own <h1>`
      ).toBeVisible()
    }
  })
})
