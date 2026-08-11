import { describe, it, expect } from 'vitest'
import { MIN_ZONE_SIZE, isZoneType, normalizeZones, type AiZoneInput } from './ai-zones'

const box = (over: Partial<AiZoneInput> = {}): AiZoneInput => ({
  name: 'Main Entry',
  type: 'entry',
  coords: { x1: 0.1, y1: 0.1, x2: 0.5, y2: 0.6 },
  ...over,
})

describe('isZoneType', () => {
  it('accepts the two types the worker understands', () => {
    expect(isZoneType('entry')).toBe(true)
    expect(isZoneType('restricted')).toBe(true)
  })

  it('rejects anything else, including the retired door type', () => {
    expect(isZoneType('door')).toBe(false)
    expect(isZoneType('perimeter')).toBe(false)
    expect(isZoneType('')).toBe(false)
  })
})

describe('retired zone types (SEC-166)', () => {
  it('drops a saved door zone instead of rejecting the whole save', () => {
    // Door zones were drawable but inert, so dropping one changes no
    // behaviour — whereas throwing would block a user editing an unrelated
    // zone on a camera that happens to have a legacy door zone stored.
    const zones = normalizeZones([
      { name: 'Back door', type: 'door' as never, coords: { x1: 0.1, y1: 0.1, x2: 0.4, y2: 0.4 } },
      box({ name: 'Main Entry' }),
    ])

    expect(zones).toHaveLength(1)
    expect(zones[0].name).toBe('Main Entry')
  })

  it('still rejects a genuinely unknown type', () => {
    expect(() => normalizeZones([box({ type: 'perimeter' as never })])).toThrow(
      /unknown zone type/i,
    )
  })
})

describe('normalizeZones', () => {
  it('returns an empty array for empty input', () => {
    expect(normalizeZones([])).toEqual([])
    expect(normalizeZones(undefined)).toEqual([])
  })

  it('keeps a valid zone', () => {
    expect(normalizeZones([box()])).toEqual([
      { name: 'Main Entry', type: 'entry', coords: { x1: 0.1, y1: 0.1, x2: 0.5, y2: 0.6 } },
    ])
  })

  it('orders corners so x1<x2 and y1<y2', () => {
    // Drawn bottom-right to top-left. The worker's containment test assumes
    // ordered corners and would never match an inverted box.
    const [zone] = normalizeZones([box({ coords: { x1: 0.8, y1: 0.9, x2: 0.2, y2: 0.3 } })])
    expect(zone.coords).toEqual({ x1: 0.2, y1: 0.3, x2: 0.8, y2: 0.9 })
  })

  it('clamps coordinates dragged outside the frame', () => {
    const [zone] = normalizeZones([box({ coords: { x1: -0.4, y1: -0.2, x2: 1.7, y2: 1.3 } })])
    expect(zone.coords).toEqual({ x1: 0, y1: 0, x2: 1, y2: 1 })
  })

  it('rounds to 4dp to keep the stored JSON small', () => {
    const [zone] = normalizeZones([
      box({ coords: { x1: 0.123456789, y1: 0.2, x2: 0.987654321, y2: 0.9 } }),
    ])
    expect(zone.coords.x1).toBe(0.1235)
    expect(zone.coords.x2).toBe(0.9877)
  })

  it('trims whitespace from names', () => {
    expect(normalizeZones([box({ name: '  Loading Dock  ' })])[0].name).toBe('Loading Dock')
  })

  it('rejects a blank name', () => {
    expect(() => normalizeZones([box({ name: '   ' })])).toThrow(/needs a name/)
  })

  it('rejects an over-long name', () => {
    expect(() => normalizeZones([box({ name: 'x'.repeat(41) })])).toThrow(/too long/)
  })

  it('rejects duplicate names case-insensitively', () => {
    expect(() => normalizeZones([box({ name: 'Dock' }), box({ name: 'dock' })])).toThrow(
      /Duplicate zone name/,
    )
  })

  it('rejects an unknown zone type', () => {
    expect(() =>
      normalizeZones([box({ type: 'perimeter' as unknown as AiZoneInput['type'] })]),
    ).toThrow(/unknown zone type/)
  })

  it('rejects non-finite coordinates', () => {
    expect(() =>
      normalizeZones([box({ coords: { x1: NaN, y1: 0.1, x2: 0.5, y2: 0.6 } })]),
    ).toThrow(/invalid coordinates/)
  })

  it('rejects a zone too small to be a deliberate drag', () => {
    const tiny = MIN_ZONE_SIZE / 2
    expect(() =>
      normalizeZones([box({ coords: { x1: 0.5, y1: 0.5, x2: 0.5 + tiny, y2: 0.9 } })]),
    ).toThrow(/too small/)
  })

  it('accepts a zone exactly at the minimum size', () => {
    const zones = normalizeZones([
      box({ coords: { x1: 0.5, y1: 0.5, x2: 0.5 + MIN_ZONE_SIZE, y2: 0.5 + MIN_ZONE_SIZE } }),
    ])
    expect(zones).toHaveLength(1)
  })

  it('keeps multiple distinct zones', () => {
    const zones = normalizeZones([
      box({ name: 'Entry', type: 'entry' }),
      box({ name: 'Dock', type: 'restricted', coords: { x1: 0, y1: 0.7, x2: 1, y2: 1 } }),
    ])
    expect(zones.map((z) => z.name)).toEqual(['Entry', 'Dock'])
    expect(zones[1].type).toBe('restricted')
  })
})
