import { describe, it, expect, vi, afterEach } from 'vitest'
import { severityTone, incidentTone, cameraTone, cn, formatRelativeTime } from './utils'

describe('severityTone', () => {
  it('maps each severity to a tone', () => {
    expect(severityTone('Critical')).toBe('red')
    expect(severityTone('Warning')).toBe('amber')
    expect(severityTone('Info')).toBe('blue')
  })
})

describe('incidentTone', () => {
  it('greens resolved/closed', () => {
    expect(incidentTone('Resolved')).toBe('green')
    expect(incidentTone('Closed')).toBe('green')
  })
  it('ambers active states', () => {
    expect(incidentTone('In Progress')).toBe('amber')
    expect(incidentTone('Dispatched')).toBe('amber')
  })
  it('greys everything else', () => {
    expect(incidentTone('Open')).toBe('gray')
  })
})

describe('cameraTone', () => {
  it('maps statuses to tones', () => {
    expect(cameraTone('Online')).toBe('green')
    expect(cameraTone('Offline')).toBe('red')
    expect(cameraTone('Maintenance')).toBe('amber')
    expect(cameraTone('Unknown')).toBe('gray')
  })
})

describe('cn', () => {
  it('joins truthy classes and drops falsey ones', () => {
    expect(cn('a', false, undefined, 'b')).toBe('a b')
    expect(cn()).toBe('')
  })
})

describe('formatRelativeTime', () => {
  const NOW = new Date('2026-08-11T12:00:00.000Z')

  function at(msAgo: number): string {
    return new Date(NOW.getTime() - msAgo).toISOString()
  }

  afterEach(() => {
    vi.useRealTimers()
  })

  function freeze() {
    vi.useFakeTimers()
    vi.setSystemTime(NOW)
  }

  it('reads under a minute as "Just now"', () => {
    freeze()
    expect(formatRelativeTime(at(0))).toBe('Just now')
    expect(formatRelativeTime(at(59_000))).toBe('Just now')
  })

  it('steps up through minutes, hours and days', () => {
    freeze()
    expect(formatRelativeTime(at(60_000))).toBe('1m ago')
    expect(formatRelativeTime(at(59 * 60_000))).toBe('59m ago')
    expect(formatRelativeTime(at(60 * 60_000))).toBe('1h ago')
    expect(formatRelativeTime(at(23 * 3_600_000))).toBe('23h ago')
    expect(formatRelativeTime(at(24 * 3_600_000))).toBe('1d ago')
    expect(formatRelativeTime(at(9 * 24 * 3_600_000))).toBe('9d ago')
  })

  // Rows are stamped by Postgres and rendered against the browser's clock, so a
  // few seconds of skew puts created_at in the future. "-1m ago" looks broken.
  it('does not render a future timestamp as a negative age', () => {
    freeze()
    expect(formatRelativeTime(at(-30_000))).toBe('Just now')
    expect(formatRelativeTime(at(-5 * 60_000))).toBe('Just now')
  })

  it('returns a dash rather than NaN for an unparseable date', () => {
    freeze()
    expect(formatRelativeTime('not a date')).toBe('—')
    expect(formatRelativeTime('')).toBe('—')
  })
})
