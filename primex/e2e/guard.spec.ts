import { test, expect, type Page } from '@playwright/test'
import { loginAs } from './helpers/auth'

/**
 * The guard mobile flow: `assigned → accepted → enroute → arrived → resolved`.
 *
 * The lifecycle is the reason `incidents.guard_stage` exists (migration 012) — the
 * `incident_status` enum collapses Accepted/En Route/Arrived into one "In Progress"
 * value, so the finer stage rides in its own column and `lib/guard-lifecycle.ts`
 * maps between the two. This spec is what proves that round-trip actually works
 * through the UI, so every transition has to be executed and asserted, never
 * skipped past.
 */

/** Stage labels as the status pill renders them, in lifecycle order. */
const STAGES = ['Assigned', 'Accepted', 'En Route', 'Arrived', 'Resolved'] as const
type Stage = (typeof STAGES)[number]

/** The button that advances *out of* each stage. Resolved is terminal. */
const ADVANCE_FROM: Record<Exclude<Stage, 'Resolved'>, string> = {
  Assigned: 'Accept dispatch',
  Accepted: 'Mark en route',
  'En Route': 'Check in (arrived)',
  Arrived: 'Mark resolved',
}

/**
 * Which stage the open incident is at, read from the one advance button on screen.
 *
 * Deliberately throws rather than returning a default: "no lifecycle control is
 * visible" means the detail view is broken, and a spec that quietly treated that as
 * a stage would report success for a screen the guard cannot act on.
 */
async function currentStage(page: Page): Promise<Stage> {
  // Advancing runs through a transition, and for a moment the old button is gone
  // while neither the next one nor the resolved panel has mounted. Settle on one of
  // them before reading, or this reports a broken screen for a working one.
  await expect(
    page
      .getByRole('button', { name: /Accept dispatch|Mark en route|Check in \(arrived\)|Mark resolved/ })
      .or(page.getByText('Incident resolved.'))
      .first()
  ).toBeVisible()

  for (const [stage, label] of Object.entries(ADVANCE_FROM)) {
    if (await page.getByRole('button', { name: label }).isVisible()) return stage as Stage
  }
  if (await page.getByText('Incident resolved.').isVisible()) return 'Resolved'
  throw new Error('Guard detail view showed neither an advance button nor the resolved panel')
}

/**
 * Walk the open incident from wherever it stands to resolved, asserting each
 * transition. Returns the stage it started from so the caller can check the walk
 * did real work. The sequence comes from the lifecycle order, never from whichever
 * buttons happen to be on screen — that is what stops this passing vacuously.
 */
async function advanceToResolved(page: Page): Promise<Stage> {
  const startStage = await currentStage(page)
  const startIndex = STAGES.indexOf(startStage)

  for (let i = startIndex; i < STAGES.length - 1; i++) {
    const from = STAGES[i] as Exclude<Stage, 'Resolved'>
    const to = STAGES[i + 1]

    await page.getByRole('button', { name: ADVANCE_FROM[from] }).click()

    if (to === 'Resolved') {
      await expect(page.getByText('Incident resolved.')).toBeVisible()
    } else {
      await expect(statusCard(page)).toContainText(to)
      await expect(
        page.getByRole('button', { name: ADVANCE_FROM[to as Exclude<Stage, 'Resolved'>] })
      ).toBeVisible()
    }
  }

  return startStage
}

/** The "Your status" card, scoped so the pill can't be confused with a severity pill. */
function statusCard(page: Page) {
  return page.locator('div', { has: page.getByText('Your status', { exact: true }) }).last()
}

/**
 * Open an assignment card and return the incident's title.
 *
 * `which` exists so two tests can each drive a card of their own: the seed gives
 * Marcus two incidents, and a test that resolved one would otherwise leave the next
 * test nothing to advance.
 */
async function openAssignment(page: Page, which: 'first' | 'last'): Promise<string> {
  await expect(
    page.getByText('No active assignments.'),
    'the seed assigns Marcus two incidents — an empty queue means the fixture or the query broke'
  ).toHaveCount(0)

  const cards = page.locator('button').filter({ hasText: 'Open >' })
  await expect(cards.first()).toBeVisible()
  await (which === 'first' ? cards.first() : cards.last()).click()

  // Wait on the breadcrumb, not the status card: a resolved incident opens straight
  // into the confirmation panel, which has no status card at all. The breadcrumb is
  // the one element both detail views share.
  const breadcrumb = page.locator('nav').filter({ hasText: 'Assignments' })
  await expect(breadcrumb).toBeVisible()

  // Its last segment is the incident title — the only place the detail view spells
  // it out in full.
  const title = (await breadcrumb.locator('span').last().innerText()).trim()
  expect(title.length, 'could not read the incident title from the breadcrumb').toBeGreaterThan(0)
  return title
}

test.describe('Guard Mobile Flow', () => {
  test.use({ viewport: { width: 375, height: 812 } })

  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'guard')
  })

  test('guard dashboard loads with no sidebar', async ({ page }) => {
    await expect(page.getByText(/Hi Marcus/)).toBeVisible()
    await expect(page.getByText(/\d+ assignments?/)).toBeVisible()

    // The guard shell has no nav items — the sidebar exists but is empty.
    await expect(page.locator('nav a')).toHaveCount(0)
  })

  test('guard advances an assignment through every stage to resolved', async ({ page }) => {
    const title = await openAssignment(page, 'first')

    const startStage = await currentStage(page)
    expect(
      startStage,
      `"${title}" is already resolved, so this run would assert no transition at all`
    ).not.toBe('Resolved')
    await expect(statusCard(page)).toContainText(startStage)

    await advanceToResolved(page)

    expect(await currentStage(page)).toBe('Resolved')
  })

  test('a resolved assignment stays resolved after a reload', async ({ page }) => {
    // The *last* card, so this test drives an assignment the previous one did not
    // already resolve. With a single assignment the two coincide and this still
    // asserts what it claims to — the incident comes back resolved after a reload.
    const title = await openAssignment(page, 'last')

    // Drive it to resolved first: the previous test's writes are not something this
    // one may assume, since specs must not depend on each other's ordering.
    await advanceToResolved(page)
    await expect(page.getByText('Incident resolved.')).toBeVisible()

    // The client never refetches after advancing, so only a reload proves the write
    // reached Postgres rather than just React state.
    await page.reload()
    await page.locator('button').filter({ hasText: title }).first().click()

    await expect(
      page.getByText('Incident resolved.'),
      `"${title}" came back unresolved — the status write did not persist`
    ).toBeVisible()
  })
})
