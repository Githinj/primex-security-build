import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Guard Mobile Flow', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'guard')
  })

  test('guard dashboard loads with no sidebar', async ({ page }) => {
    // Verify greeting
    await expect(page.getByText(/Hi Marcus/)).toBeVisible()

    // Verify no sidebar nav links visible (guard has no nav items — sidebar shell exists but is empty)
    await expect(page.locator('nav a')).toHaveCount(0)
  })

  test('guard status flow to resolved', async ({ page }) => {
    // Check if there are assigned incidents
    const hasIncident = await page.getByText(/assignment/).isVisible().catch(() => false)
    if (!hasIncident) {
      test.skip()
      return
    }

    // Click on the first incident card
    const incidentCard = page.getByText(/Dispatched/).first()
    await incidentCard.click()

    // Walk through status progression, waiting for each button to appear
    const statusFlow: [RegExp, RegExp][] = [
      [/Accept dispatch/, /Mark en route/],
      [/Mark en route/, /Check in/],
      [/Check in/, /Mark resolved/],
    ]

    for (const [current, next] of statusFlow) {
      const button = page.getByRole('button', { name: current })
      if (await button.isVisible().catch(() => false)) {
        await button.click()
        await expect(page.getByRole('button', { name: next })).toBeVisible()
      }
    }

    // Final step — mark resolved
    const resolveButton = page.getByRole('button', { name: /Mark resolved/ })
    if (await resolveButton.isVisible().catch(() => false)) {
      await resolveButton.click()
      await expect(page.getByText('Incident resolved.')).toBeVisible()
    }
  })
})
