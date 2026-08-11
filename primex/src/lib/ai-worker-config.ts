/**
 * Bounds and validation for the `ai_worker_config` singleton.
 *
 * These knobs are not cosmetic — they are the worker's throughput and alert
 * volume. Every bound below exists because the value outside it breaks
 * something concrete, not to be tidy:
 *
 * - `snapshot_interval_s` divides the worker's camera ceiling. Inference is
 *   serialized through one model (`docs/ai-worker-deploy.md`), so the ceiling is
 *   roughly `interval ÷ inference_latency` cameras. Halving this halves how many
 *   cameras one droplet can serve, and the queue backs up silently.
 * - `confidence_threshold` at 0 alerts on every box the model draws; at 1
 *   nothing ever fires. Both are indistinguishable from a broken worker.
 * - `cooldown_s` is the only thing between one lingering person and an alert
 *   per snapshot interval for as long as they stand there.
 *
 * Kept pure and separate from the server action so the editor and the action
 * reject identical values with identical text.
 */

export interface AiWorkerConfigInput {
  confidence_threshold: number
  snapshot_interval_s: number
  cooldown_s: number
  dwell_threshold_s: number
}

interface Bound {
  min: number
  max: number
  label: string
  integer: boolean
}

export const CONFIG_BOUNDS: Record<keyof AiWorkerConfigInput, Bound> = {
  confidence_threshold: { min: 0.1, max: 0.95, label: 'Confidence threshold', integer: false },
  snapshot_interval_s: { min: 1, max: 60, label: 'Snapshot interval', integer: true },
  cooldown_s: { min: 10, max: 3600, label: 'Alert cooldown', integer: true },
  dwell_threshold_s: { min: 30, max: 3600, label: 'Lingering threshold', integer: true },
}

export const CONFIG_HELP: Record<keyof AiWorkerConfigInput, string> = {
  confidence_threshold:
    'Detections below this score are discarded. Lower catches more and cries wolf more.',
  snapshot_interval_s:
    'Seconds between frames per camera. Lower reacts faster but cuts how many cameras one worker can serve.',
  cooldown_s: 'Minimum gap between two alerts of the same type on the same camera.',
  dwell_threshold_s: 'How long a person must stay in frame before it counts as lingering.',
}

/**
 * Validate a config edit. Throws with human-readable text on the first problem,
 * matching how `normalizeZones` reports — the settings form surfaces the message
 * verbatim.
 */
export function validateAiWorkerConfig(input: AiWorkerConfigInput): AiWorkerConfigInput {
  const out = {} as AiWorkerConfigInput

  for (const key of Object.keys(CONFIG_BOUNDS) as (keyof AiWorkerConfigInput)[]) {
    const bound = CONFIG_BOUNDS[key]
    const value = input[key]

    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new Error(`${bound.label} must be a number.`)
    }
    if (bound.integer && !Number.isInteger(value)) {
      throw new Error(`${bound.label} must be a whole number of seconds.`)
    }
    if (value < bound.min || value > bound.max) {
      throw new Error(`${bound.label} must be between ${bound.min} and ${bound.max}.`)
    }

    out[key] = value
  }

  return out
}
