import { describe, it, expect } from 'vitest'
import { CONFIG_BOUNDS, validateAiWorkerConfig, type AiWorkerConfigInput } from './ai-worker-config'

const valid = (over: Partial<AiWorkerConfigInput> = {}): AiWorkerConfigInput => ({
  confidence_threshold: 0.7,
  snapshot_interval_s: 2,
  cooldown_s: 60,
  dwell_threshold_s: 300,
  ...over,
})

describe('validateAiWorkerConfig', () => {
  it('passes the shipped defaults through unchanged', () => {
    expect(validateAiWorkerConfig(valid())).toEqual(valid())
  })

  it('accepts the exact bounds', () => {
    for (const key of Object.keys(CONFIG_BOUNDS) as (keyof AiWorkerConfigInput)[]) {
      const { min, max } = CONFIG_BOUNDS[key]
      expect(() => validateAiWorkerConfig(valid({ [key]: min }))).not.toThrow()
      expect(() => validateAiWorkerConfig(valid({ [key]: max }))).not.toThrow()
    }
  })

  it('rejects a confidence of 0 — it would alert on every box the model draws', () => {
    expect(() => validateAiWorkerConfig(valid({ confidence_threshold: 0 }))).toThrow(
      /Confidence threshold must be between/,
    )
  })

  it('rejects a confidence of 1 — nothing would ever fire', () => {
    expect(() => validateAiWorkerConfig(valid({ confidence_threshold: 1 }))).toThrow(
      /Confidence threshold must be between/,
    )
  })

  it('rejects a sub-second snapshot interval', () => {
    // Below 1s the serialized inference queue backs up silently.
    expect(() => validateAiWorkerConfig(valid({ snapshot_interval_s: 0 }))).toThrow(
      /Snapshot interval must be between/,
    )
  })

  it('rejects fractional seconds where the worker expects whole ones', () => {
    expect(() => validateAiWorkerConfig(valid({ snapshot_interval_s: 2.5 }))).toThrow(
      /whole number of seconds/,
    )
  })

  it('allows a fractional confidence, which is not a whole number by nature', () => {
    expect(() => validateAiWorkerConfig(valid({ confidence_threshold: 0.55 }))).not.toThrow()
  })

  it('rejects NaN and non-numbers rather than writing them to the row', () => {
    expect(() => validateAiWorkerConfig(valid({ cooldown_s: NaN }))).toThrow(/must be a number/)
    expect(() =>
      validateAiWorkerConfig(valid({ cooldown_s: '60' as unknown as number })),
    ).toThrow(/must be a number/)
  })

  it('returns only the known keys, so a crafted payload cannot write extra columns', () => {
    const out = validateAiWorkerConfig({
      ...valid(),
      id: 2,
      updated_at: 'whenever',
    } as AiWorkerConfigInput & Record<string, unknown>)

    expect(Object.keys(out).sort()).toEqual([
      'confidence_threshold',
      'cooldown_s',
      'dwell_threshold_s',
      'snapshot_interval_s',
    ])
  })
})
