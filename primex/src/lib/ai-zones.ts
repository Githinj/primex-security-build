/**
 * Camera detection zones — shared shape and validation.
 *
 * Coordinates are **normalised 0–1 fractions of the frame**, not pixels. The AI
 * worker divides a detection's centre by the frame dimensions before testing
 * containment (`BehaviorTracker._normalize`), so a zone keeps covering the same
 * part of the scene when the camera changes resolution. A pixel rectangle drawn
 * against a 640x480 snapshot would silently cover the wrong region once the
 * stream published 1280x720.
 */

export const ZONE_TYPES = ['entry', 'restricted'] as const

export type ZoneType = (typeof ZONE_TYPES)[number]

/**
 * Types that were once offered and are no longer (SEC-166).
 *
 * `door` drove `door_event`, which could never fire: the worker runs stock
 * YOLOv8 on the COCO classes, and COCO has no door. The zone was drawable and
 * inert. Rather than reject saved data, `normalizeZones` drops these — silently,
 * because dropping something that never did anything changes no behaviour, and
 * refusing the save would block a user editing an unrelated zone.
 *
 * The `detection_event_type` enum value and the edge function's alert mapping
 * are left in place: re-adding them behind a real door sensor is cheap, while
 * removing a Postgres enum value is not.
 */
export const RETIRED_ZONE_TYPES = ['door'] as const

export interface ZoneCoords {
  x1: number
  y1: number
  x2: number
  y2: number
}

export interface AiZoneInput {
  name: string
  type: ZoneType
  coords: ZoneCoords
}

/** What each zone type actually drives in the worker's heuristics. */
export const ZONE_TYPE_HELP: Record<ZoneType, string> = {
  entry: 'Entry — a person crouching here for 30s raises a concealment alert.',
  restricted: 'Restricted — a vehicle detected here raises an alert.',
}

export const ZONE_TYPE_LABELS: Record<ZoneType, string> = {
  entry: 'Entry',
  restricted: 'Restricted',
}

/** Below this a zone is almost certainly a stray click, not an intended box. */
export const MIN_ZONE_SIZE = 0.02

export const MAX_ZONE_NAME_LENGTH = 40

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n))
}

/** Round to 4dp — sub-pixel precision on any realistic frame, and keeps the JSON small. */
function round(n: number): number {
  return Math.round(n * 10000) / 10000
}

export function isZoneType(value: string): value is ZoneType {
  return (ZONE_TYPES as readonly string[]).includes(value)
}

/** True for a type that was once offered and no longer is. */
export function isRetiredZoneType(value: string): boolean {
  return (RETIRED_ZONE_TYPES as readonly string[]).includes(value)
}

/**
 * Validate and canonicalise a set of zones.
 *
 * Throws with a human-readable message so the editor and the server action can
 * surface identical text. Corners are ordered and clamped, so a rectangle drawn
 * bottom-right to top-left still stores as x1<x2, y1<y2 — the containment test
 * in the worker assumes that ordering and would never match otherwise.
 */
export function normalizeZones(input: AiZoneInput[] | undefined): AiZoneInput[] {
  if (!input?.length) return []

  const seen = new Set<string>()
  const zones: AiZoneInput[] = []

  for (const zone of input) {
    // Retired types are dropped, not rejected — see RETIRED_ZONE_TYPES.
    if (isRetiredZoneType(zone.type)) continue

    const name = zone.name?.trim()
    if (!name) throw new Error('Every zone needs a name.')
    if (name.length > MAX_ZONE_NAME_LENGTH) {
      throw new Error(`"${name}" is too long — keep zone names under ${MAX_ZONE_NAME_LENGTH} characters.`)
    }

    const key = name.toLowerCase()
    if (seen.has(key)) throw new Error(`Duplicate zone name: "${name}".`)
    seen.add(key)

    if (!isZoneType(zone.type)) {
      throw new Error(`"${name}" has an unknown zone type.`)
    }

    const c = zone.coords
    if (
      !c ||
      [c.x1, c.y1, c.x2, c.y2].some((n) => typeof n !== 'number' || !Number.isFinite(n))
    ) {
      throw new Error(`"${name}" has invalid coordinates.`)
    }

    const x1 = clamp01(Math.min(c.x1, c.x2))
    const x2 = clamp01(Math.max(c.x1, c.x2))
    const y1 = clamp01(Math.min(c.y1, c.y2))
    const y2 = clamp01(Math.max(c.y1, c.y2))

    if (x2 - x1 < MIN_ZONE_SIZE || y2 - y1 < MIN_ZONE_SIZE) {
      throw new Error(`"${name}" is too small to be useful — draw a larger area.`)
    }

    zones.push({
      name,
      type: zone.type,
      coords: { x1: round(x1), y1: round(y1), x2: round(x2), y2: round(y2) },
    })
  }

  return zones
}
