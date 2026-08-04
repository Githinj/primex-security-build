/**
 * Site business hours — shared shape and validation.
 *
 * The AI worker reads `site_business_hours.hours` straight out of Postgres and
 * looks days up by `dt.strftime("%a").lower()` (behavior_tracker.py), so these
 * keys are a contract with the Python side, not a display choice. A day absent
 * from the map means closed all day, which the worker treats as after-hours for
 * the full 24 hours.
 */

export const BUSINESS_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const

export type BusinessDay = (typeof BUSINESS_DAYS)[number]

export interface DayHours {
  open: string
  close: string
}

export type BusinessHoursMap = Partial<Record<BusinessDay, DayHours>>

export const DAY_LABELS: Record<BusinessDay, string> = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday',
}

export const DAY_SHORT: Record<BusinessDay, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/

export function isValidTime(value: string): boolean {
  return TIME_RE.test(value)
}

/**
 * Validate and canonicalise a business-hours map.
 *
 * Throws with a human-readable message rather than returning a result type, so
 * the server action and the modal can surface the same text. Days are emitted
 * in week order and unknown keys are dropped — the worker only ever looks up
 * the seven it knows.
 */
export function normalizeBusinessHours(input: BusinessHoursMap | undefined): BusinessHoursMap {
  const hours: BusinessHoursMap = {}

  for (const day of BUSINESS_DAYS) {
    const entry = input?.[day]
    if (!entry) continue // omitted = closed that day

    if (!isValidTime(entry.open) || !isValidTime(entry.close)) {
      throw new Error(`${DAY_LABELS[day]}: times must be in HH:MM format.`)
    }
    // Zero-padded HH:MM compares correctly as a string. The worker computes
    // after-hours as `now < open || now >= close`, which cannot express a range
    // crossing midnight — an inverted pair would silently mean "always closed".
    if (entry.open >= entry.close) {
      throw new Error(`${DAY_LABELS[day]}: closing time must be after opening time.`)
    }

    hours[day] = { open: entry.open, close: entry.close }
  }

  return hours
}
