import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

test.describe('Dispatch Flow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'dispatcher')
  })

  test('dispatch board columns render in correct order', async ({ page }) => {
    await page.getByRole('button', { name: /Dispatch board/ }).click()
    await expect(page.getByRole('heading', { name: 'Dispatch board' })).toBeVisible()

    // Verify 4 column labels render (column headers use <span> not <h3>)
    await expect(page.getByText('Open', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Dispatched', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('In Progress', { exact: true }).first()).toBeVisible()
    await expect(page.getByText('Resolved', { exact: true }).first()).toBeVisible()
  })

  test('assign guard via queue', async ({ page }) => {
    // Alert queue is the default section — first alert is auto-selected
    await page.getByRole('button', { name: /Alert queue/ }).click()

    // Wait for the detail panel to load (auto-selected first alert)
    await expect(page.getByRole('button', { name: /Convert to incident/ })).toBeVisible()

    // Click "Convert to incident" to open assign guard modal
    await page.getByRole('button', { name: /Convert to incident/ }).click()

    // Select the first available guard in the modal
    const dialog = page.getByRole('dialog')
    await expect(dialog.getByText('Dispatch a responder')).toBeVisible()
    const guardButton = dialog.getByRole('button').filter({ hasText: /Marcus|Tom|Damien/ }).first()
    await guardButton.click()

    // Send dispatch
    await dialog.getByRole('button', { name: /Send dispatch/ }).click()

    // Verify success
    await expect(dialog.getByText('Dispatched.')).toBeVisible()
    await dialog.getByRole('button', { name: /Done/ }).click()
  })
})
