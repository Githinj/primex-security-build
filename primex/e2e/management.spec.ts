import { test, expect } from '@playwright/test'
import { loginAs } from './helpers/auth'

const SITE_NAME = `E2E Test Site ${Date.now()}`
const CAMERA_NAME = `E2E-CAM-${Date.now()}`
const COMPANY_NAME = `E2E Corp ${Date.now()}`

test.describe('Management CRUD', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'super_admin')
  })

  test('create site and toggle status', async ({ page }) => {
    await page.goto('/sites')
    await page.getByRole('button', { name: /Add site/ }).click()

    const dialog = page.getByRole('dialog')
    // Select company
    await dialog.locator('select').nth(0).selectOption({ label: 'Apex Retail Group' })
    // Fill site name
    await dialog.getByPlaceholder('e.g. Apex Westfield').fill(SITE_NAME)
    // Select type
    await dialog.locator('select').nth(1).selectOption('Store')
    // Fill address
    await dialog.getByPlaceholder(/123 Main St/).fill('456 Test Ave, Sydney NSW')
    // Select risk
    await dialog.locator('select').nth(2).selectOption('Low')

    // Submit
    await dialog.getByRole('button', { name: /Create site/ }).click()
    await expect(dialog.getByText('Site created.')).toBeVisible()
    await dialog.getByRole('button', { name: /Done/ }).click()

    // Verify in list
    await expect(page.getByText(SITE_NAME)).toBeVisible()

    // Toggle status via action menu
    const row = page.getByRole('row').filter({ hasText: SITE_NAME })
    await row.getByRole('button').last().click()
    await page.getByText(/Deactivate site/).click()

    // Confirm in toggle modal
    const confirmDialog = page.getByRole('dialog')
    await confirmDialog.getByRole('button', { name: /Deactivate|Confirm/ }).click()
  })

  test('create camera and edit name', async ({ page }) => {
    await page.goto('/cameras')
    await page.getByRole('button', { name: /Add camera/ }).click()

    const dialog = page.getByRole('dialog')
    // Select company
    await dialog.locator('select').nth(0).selectOption({ label: 'Apex Retail Group' })
    // Select site — wait for options to populate after company selection, then pick first
    const siteSelect = dialog.locator('select').nth(1)
    await expect(siteSelect.locator('option')).not.toHaveCount(1)
    await siteSelect.selectOption({ index: 1 })
    // Fill camera name
    await dialog.getByPlaceholder('e.g. CAM-09').fill(CAMERA_NAME)
    // Fill location
    await dialog.getByPlaceholder('e.g. Loading Dock North').fill('E2E Test Location')
    // Select status
    await dialog.locator('select').nth(2).selectOption('Online')

    // Submit
    await dialog.getByRole('button', { name: /Add camera/ }).click()
    await expect(dialog.getByText('Camera added.')).toBeVisible()
    await dialog.getByRole('button', { name: /Done/ }).click()

    // Verify in grid
    await expect(page.getByText(CAMERA_NAME)).toBeVisible()

    // Edit camera via action menu
    const tile = page.locator('div').filter({ hasText: CAMERA_NAME }).first()
    await tile.getByRole('button').last().click()
    await page.getByText('Edit camera').click()

    // Edit the name in the edit modal
    const editDialog = page.getByRole('dialog')
    const nameInput = editDialog.getByPlaceholder('e.g. CAM-09')
    await nameInput.clear()
    await nameInput.fill(`${CAMERA_NAME}-EDITED`)
    await editDialog.getByRole('button', { name: /Save changes/ }).click()
    await expect(editDialog.getByText('Camera updated.')).toBeVisible()
  })

  test('create company and update details', async ({ page }) => {
    await page.goto('/companies')
    await page.getByRole('button', { name: /Invite company/ }).click()

    const dialog = page.getByRole('dialog')
    await dialog.getByPlaceholder('e.g. Apex Retail Group').fill(COMPANY_NAME)
    await dialog.locator('select').nth(0).selectOption('Retail')
    await dialog.getByPlaceholder('Full name').fill('E2E Test Contact')
    await dialog.getByPlaceholder('name@company.com').fill(`e2e-${Date.now()}@test.com`)
    await dialog.locator('select').nth(1).selectOption('Starter')

    await dialog.getByRole('button', { name: /Send invitation/ }).click()
    await expect(dialog.getByText('Invite sent.')).toBeVisible({ timeout: 15000 })
    await dialog.getByRole('button', { name: /Done/ }).click()

    // Verify in list
    await expect(page.getByText(COMPANY_NAME)).toBeVisible()

    // Open edit modal via action menu (opens directly in edit mode)
    const row = page.getByRole('row').filter({ hasText: COMPANY_NAME })
    await row.getByRole('button').last().click()
    await page.getByText('Edit company').click()

    // Edit name — modal opens directly in edit mode, no extra button needed
    const editDialog = page.getByRole('dialog')
    const nameInput = editDialog.locator('input').first()
    await nameInput.clear()
    await nameInput.fill(`${COMPANY_NAME} Updated`)
    await editDialog.getByRole('button', { name: /Save changes/ }).click()
    await expect(editDialog.getByText('Saved.')).toBeVisible()
  })
})
