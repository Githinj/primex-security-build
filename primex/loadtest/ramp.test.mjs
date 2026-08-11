import { describe, it, expect } from 'vitest'
import {
  planRamp,
  percentile,
  evaluateStep,
  abortReason,
  findKnee,
  recommendedCap,
  DEFAULT_THRESHOLDS,
} from './ramp.mjs'

describe('planRamp', () => {
  it('walks linearly from start to max', () => {
    expect(planRamp({ start: 5, step: 5, max: 20, holdMs: 1000 }).map((s) => s.viewers)).toEqual([
      5, 10, 15, 20,
    ])
  })

  it('stops before overshooting max', () => {
    expect(planRamp({ start: 5, step: 10, max: 20 }).map((s) => s.viewers)).toEqual([5, 15])
  })

  it('rejects a schedule that would never progress', () => {
    expect(() => planRamp({ start: 0 })).toThrow()
    expect(() => planRamp({ step: 0 })).toThrow()
    expect(() => planRamp({ start: 10, max: 5 })).toThrow()
  })
})

describe('percentile', () => {
  it('takes the nearest rank', () => {
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 95)).toBe(10)
    expect(percentile([1, 2, 3, 4], 50)).toBe(2)
  })

  it('returns null for no samples rather than NaN', () => {
    expect(percentile([], 95)).toBeNull()
  })

  it('does not mutate the caller array', () => {
    const values = [3, 1, 2]
    percentile(values, 50)
    expect(values).toEqual([3, 1, 2])
  })
})

describe('evaluateStep', () => {
  const good = { targetViewers: 10, connected: 10, ttffMs: [900, 1100], serverViewerCount: 10 }

  it('passes a healthy step', () => {
    expect(evaluateStep(good).ok).toBe(true)
  })

  it('fails when too few viewers connect', () => {
    const result = evaluateStep({ ...good, connected: 8 })
    expect(result.ok).toBe(false)
    expect(result.failures[0]).toContain('connect rate')
  })

  it('fails when first frame passes the absolute unusable ceiling', () => {
    const result = evaluateStep({ ...good, ttffMs: [1000, 25_000] })
    expect(result.ok).toBe(false)
    expect(result.failures.some((f) => f.includes('unusable'))).toBe(true)
  })

  // The regression that made the first real run abort at 8006ms against an
  // 8000ms limit: several seconds of every measurement are fixed setup cost, so
  // a healthy step must not fail merely for being slow in absolute terms.
  it('passes a step that is slow in absolute terms but matches its baseline', () => {
    expect(evaluateStep({ ...good, ttffMs: [8000, 8006] }, DEFAULT_THRESHOLDS, 7800).ok).toBe(true)
  })

  it('fails a step that is much slower than the baseline', () => {
    const result = evaluateStep({ ...good, ttffMs: [6000, 18_000] }, DEFAULT_THRESHOLDS, 6000)
    expect(result.ok).toBe(false)
    expect(result.failures.some((f) => f.includes('baseline'))).toBe(true)
  })

  it('cannot compare the first step against a baseline it has not set yet', () => {
    expect(evaluateStep({ ...good, ttffMs: [9000] }, DEFAULT_THRESHOLDS, null).ok).toBe(true)
  })

  it('fails when the server counts fewer viewers than connected', () => {
    const result = evaluateStep({ ...good, serverViewerCount: 5 })
    expect(result.ok).toBe(false)
    expect(result.failures.some((f) => f.includes('server counts'))).toBe(true)
  })

  // A stats read that failed is missing information, not evidence of shedding.
  it('does not score a missing server count as a failure', () => {
    expect(evaluateStep({ ...good, serverViewerCount: null }).ok).toBe(true)
  })
})

describe('abortReason', () => {
  const healthy = {
    targetViewers: 10,
    connected: 10,
    ttffMs: [800],
    serverViewerCount: 10,
    guardStreamsHealthy: true,
  }

  it('keeps going while everything holds', () => {
    expect(abortReason(healthy)).toBeNull()
  })

  // The rule that matters: this runs against the box carrying live cameras.
  it('aborts when a production camera drops, even if the test step passed', () => {
    const reason = abortReason({ ...healthy, guardStreamsHealthy: false })
    expect(reason).toContain('production camera')
  })

  it('aborts on a failed step', () => {
    expect(abortReason({ ...healthy, connected: 3 })).toContain('failed')
  })

  it('reports the camera drop ahead of any threshold failure', () => {
    const reason = abortReason({ ...healthy, connected: 0, guardStreamsHealthy: false })
    expect(reason).toContain('production camera')
  })
})

describe('findKnee', () => {
  const ok = { evaluation: { ok: true, failures: [] } }
  const bad = { evaluation: { ok: false, failures: ['connect rate 40%'] } }

  it('reports the last good step and the one that broke', () => {
    expect(
      findKnee([
        { viewers: 5, ...ok },
        { viewers: 10, ...ok },
        { viewers: 15, ...bad },
      ]),
    ).toEqual({ lastGood: 10, brokeAt: 15, reachedCeiling: false })
  })

  // Running out of ramp without failing is a real outcome: the ceiling is above
  // what we tested. It must not be reported as if we found it.
  it('flags a run that never broke', () => {
    const knee = findKnee([
      { viewers: 5, ...ok },
      { viewers: 10, ...ok },
    ])
    expect(knee).toEqual({ lastGood: 10, brokeAt: null, reachedCeiling: true })
  })

  it('handles failing on the very first step', () => {
    expect(findKnee([{ viewers: 5, ...bad }])).toEqual({
      lastGood: null,
      brokeAt: 5,
      reachedCeiling: false,
    })
  })
})

describe('recommendedCap', () => {
  it('leaves headroom below the measured ceiling', () => {
    expect(recommendedCap(100)).toBe(70)
    expect(recommendedCap(45)).toBe(31)
  })

  // A cap of 0 means "refuse everyone" to AMS, which is worse than no cap.
  it('never recommends zero', () => {
    expect(recommendedCap(1)).toBe(1)
  })

  it('has nothing to recommend when nothing passed', () => {
    expect(recommendedCap(null)).toBeNull()
  })
})

describe('DEFAULT_THRESHOLDS', () => {
  it('is exported so a run can record what it was judged against', () => {
    expect(DEFAULT_THRESHOLDS.minConnectRate).toBeGreaterThan(0)
    expect(DEFAULT_THRESHOLDS.maxTtffP95Ms).toBeGreaterThan(0)
  })
})
