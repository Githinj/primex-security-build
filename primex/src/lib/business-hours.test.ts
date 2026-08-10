import { describe, it, expect } from 'vitest'
import {
  BUSINESS_DAYS,
  isValidTime,
  normalizeBusinessHours,
  type BusinessHoursMap,
} from './business-hours'

describe('isValidTime', () => {
  it('accepts zero-padded 24-hour times', () => {
    expect(isValidTime('00:00')).toBe(true)
    expect(isValidTime('09:30')).toBe(true)
    expect(isValidTime('23:59')).toBe(true)
  })

  it('rejects out-of-range and malformed values', () => {
    expect(isValidTime('24:00')).toBe(false)
    expect(isValidTime('12:60')).toBe(false)
    expect(isValidTime('9:00')).toBe(false) // not zero-padded — breaks string ordering
    expect(isValidTime('')).toBe(false)
    expect(isValidTime('nine')).toBe(false)
  })
})

describe('normalizeBusinessHours', () => {
  it('returns an empty map for undefined input', () => {
    expect(normalizeBusinessHours(undefined)).toEqual({})
  })

  it('keeps valid days', () => {
    const hours = normalizeBusinessHours({ mon: { open: '08:00', close: '18:00' } })
    expect(hours).toEqual({ mon: { open: '08:00', close: '18:00' } })
  })

  it('drops omitted days rather than inventing defaults', () => {
    // An absent day is meaningful: the worker reads it as closed all day.
    const hours = normalizeBusinessHours({ mon: { open: '08:00', close: '18:00' } })
    expect(Object.keys(hours)).toEqual(['mon'])
    expect(hours.sun).toBeUndefined()
  })

  it('emits days in week order regardless of input order', () => {
    const hours = normalizeBusinessHours({
      sun: { open: '10:00', close: '14:00' },
      mon: { open: '08:00', close: '18:00' },
      wed: { open: '08:00', close: '18:00' },
    })
    expect(Object.keys(hours)).toEqual(['mon', 'wed', 'sun'])
  })

  it('drops keys the worker does not understand', () => {
    const hours = normalizeBusinessHours({
      mon: { open: '08:00', close: '18:00' },
      monday: { open: '08:00', close: '18:00' },
    } as unknown as BusinessHoursMap)
    expect(Object.keys(hours)).toEqual(['mon'])
  })

  it('rejects a malformed time', () => {
    expect(() => normalizeBusinessHours({ tue: { open: '8:00', close: '18:00' } }))
      .toThrow(/Tuesday: times must be in HH:MM format/)
  })

  it('rejects a closing time before the opening time', () => {
    expect(() => normalizeBusinessHours({ wed: { open: '18:00', close: '08:00' } }))
      .toThrow(/Wednesday: closing time must be after opening time/)
  })

  it('rejects an overnight range, which the worker cannot express', () => {
    // 22:00–06:00 would make `now < open || now >= close` true nearly always,
    // silently marking the site after-hours around the clock.
    expect(() => normalizeBusinessHours({ fri: { open: '22:00', close: '06:00' } }))
      .toThrow(/closing time must be after opening time/)
  })

  it('rejects equal open and close', () => {
    expect(() => normalizeBusinessHours({ sat: { open: '09:00', close: '09:00' } }))
      .toThrow(/closing time must be after opening time/)
  })

  it('accepts a full 24-hour day as 00:00 to 23:59', () => {
    const hours = normalizeBusinessHours({ sun: { open: '00:00', close: '23:59' } })
    expect(hours.sun).toEqual({ open: '00:00', close: '23:59' })
  })

  it('accepts every day set', () => {
    const input: BusinessHoursMap = {}
    for (const day of BUSINESS_DAYS) input[day] = { open: '09:00', close: '17:00' }
    expect(Object.keys(normalizeBusinessHours(input))).toEqual([...BUSINESS_DAYS])
  })
})
