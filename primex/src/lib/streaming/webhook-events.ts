import type { CameraStatus } from '@/lib/types'

/**
 * Ant Media listener-hook `action` values — the `HOOK_ACTION_*` constants in
 * AMS's `AntMediaApplicationAdapter`. Spelled out here because reacting to these
 * strings is the webhook's entire job: a typo is not a crash, it is an event
 * that silently stops being handled (SEC-201).
 */
export const AMS_HOOK = {
  streamStarted: 'liveStreamStarted',
  streamEnded: 'liveStreamEnded',
  streamStatus: 'liveStreamStatus',
  vodReady: 'vodReady',
  publishTimeout: 'publishTimeoutError',
  encoderNotOpened: 'encoderNotOpenedError',
  endpointFailed: 'endpointFailed',
  idleExpired: 'idleTimeIsExpired',
} as const

/**
 * Per-viewer and per-subtrack hooks, deliberately dropped. AMS fires these once
 * per player, so a dispatcher wall of ten tiles is ten `playStarted` events —
 * recording them would bury the stream lifecycle under viewer churn, and
 * `stream_events` is on a 7-day pg_cron trim (migration 005), not infinite.
 *
 * Distinct from an *unrecognised* action, which we do record: that means AMS
 * grew a hook we haven't mapped yet, and silence there is how SEC-201 happened.
 */
const IGNORED_ACTIONS: ReadonlySet<string> = new Set([
  'playStarted',
  'playStopped',
  'subtrackAddedInTheMainTrack',
  'subtrackLeftTheMainTrack',
  'firstActiveTrackAddedInMainTrack',
  'noActiveSubtracksLeftInMainTrack',
])

export type StreamWebhookEffect = {
  /** `stream_events.event_type` to insert, or null to record nothing. */
  eventType: string | null
  /** New `cameras.status`, or null to leave the current value alone. */
  status: CameraStatus | null
  /** Bump `cameras.last_frame_at` — evidence the source is still delivering. */
  touchLastFrame: boolean
  /** False when AMS sent an action this handler has no mapping for. */
  recognised: boolean
}

const ignored: StreamWebhookEffect = {
  eventType: null,
  status: null,
  touchLastFrame: false,
  recognised: true,
}

/** AMS sends these as numbers, but a JSON hook body is never guaranteed. */
function count(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0
}

/** Same caution for the string fields — an empty string is as absent as null. */
function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Frames/packets AMS itself reports as dropped on a `liveStreamStatus` hook.
 *
 * This is the loss signal we would otherwise have to measure with a ping session
 * from a laptop: on an RTSP pull over a lossy site tunnel, ingestion drops rise
 * before the stream fails outright, so a non-zero count here is the early
 * warning that a gateway is degrading.
 */
export function streamDropCounts(payload: Record<string, unknown>): {
  ingestion: number
  encoding: number
  degraded: boolean
} {
  const ingestion = count(payload.dropPacketCountInIngestion)
  const encoding = count(payload.dropFrameCountInEncoding)
  return { ingestion, encoding, degraded: ingestion > 0 || encoding > 0 }
}

/** The `recordings` insert a `vodReady` hook produces, minus `camera_id`. */
export type VodRecordingRow = {
  file_url: string
  stream_id: string
  file_size: number | null
  duration_s: number | null
  started_at: string
  ended_at: string
  status: string
}

/**
 * Build the `recordings` row for a `vodReady` hook.
 *
 * `file_url` doubles as the idempotency key — migration 019 puts a unique index
 * on it so a redelivered hook conflicts instead of double-listing the recording
 * (SEC-179). That only holds if the same hook body always derives the same URL,
 * which is why the fallbacks below are ordered by how stable they are rather
 * than by how plausible the resulting URL looks:
 *
 * 1. `vodName` — the actual object AMS stored. The only fallback that yields a
 *    URL that plays.
 * 2. `vodId` — AMS's own identifier for the recording. The URL is a guess, but a
 *    redelivery guesses identically.
 * 3. `startTime` — stable across redeliveries only if AMS sends it, which is
 *    exactly what SEC-182 is open to verify against a captured payload.
 * 4. `receivedAt` — arrival time, and so the one case a redelivery *can* still
 *    duplicate. Reaching it means the body carried nothing identifying at all.
 */
export function vodRecordingRow(
  streamId: string,
  payload: Record<string, unknown>,
  options: { spacesEndpoint: string; receivedAt: string },
): VodRecordingRow {
  const startTime = text(payload.startTime) ?? options.receivedAt
  const objectName =
    text(payload.vodName) ??
    `${streamId}_${text(payload.vodId) ?? startTime}.mp4`

  const duration = count(payload.duration)
  const fileSize = count(payload.fileSize)

  return {
    file_url: `${options.spacesEndpoint}/recordings/${objectName}`,
    stream_id: streamId,
    file_size: fileSize || null,
    // AMS reports duration in milliseconds; the column is seconds.
    duration_s: duration ? Math.round(duration / 1000) : null,
    started_at: startTime,
    ended_at: text(payload.endTime) ?? options.receivedAt,
    status: 'complete',
  }
}

/**
 * Decide what one Ant Media hook should do to camera state and the event log.
 *
 * Pure so the mapping is testable without a webhook request or a database — the
 * route does the I/O, this decides what the I/O should be.
 */
export function streamWebhookEffect(
  action: string,
  payload: Record<string, unknown> = {},
): StreamWebhookEffect {
  if (IGNORED_ACTIONS.has(action)) return ignored

  switch (action) {
    case AMS_HOOK.streamStarted:
      return {
        eventType: 'stream_started',
        status: 'Online',
        touchLastFrame: true,
        recognised: true,
      }

    case AMS_HOOK.streamEnded:
      return {
        eventType: 'stream_stopped',
        status: 'Offline',
        touchLastFrame: false,
        recognised: true,
      }

    case AMS_HOOK.vodReady:
      return {
        eventType: 'recording_saved',
        status: null,
        touchLastFrame: false,
        recognised: true,
      }

    // A periodic heartbeat for a *running* stream, so it doubles as a repair for
    // a missed liveStreamStarted: a camera that flapped and recovered goes back
    // Online here rather than sitting Offline until someone reloads. Only worth
    // an event row when AMS is reporting actual loss — it fires on a timer, and
    // logging every beat would swamp the table.
    case AMS_HOOK.streamStatus:
      return {
        eventType: streamDropCounts(payload).degraded ? 'stream_degraded' : null,
        status: 'Online',
        touchLastFrame: true,
        recognised: true,
      }

    // The source stopped delivering data for longer than AMS's publish timeout.
    // On the RTSP-pull sites this is the gateway dropping the tunnel, and it is
    // the one error that definitely means the camera is no longer live.
    case AMS_HOOK.publishTimeout:
      return {
        eventType: 'stream_error',
        status: 'Offline',
        touchLastFrame: false,
        recognised: true,
      }

    // Both are real failures worth surfacing, but neither proves the source is
    // down: encoderNotOpenedError is the adaptive-bitrate encoder failing to
    // start, and endpointFailed is a *re-publish target* rejecting us. Flipping
    // the camera Offline on either would report a false outage while the feed is
    // still arriving.
    case AMS_HOOK.encoderNotOpened:
    case AMS_HOOK.endpointFailed:
      return {
        eventType: 'stream_error',
        status: null,
        touchLastFrame: false,
        recognised: true,
      }

    // AMS stopped the stream itself for being idle. Not an error, but the camera
    // is genuinely not live any more.
    case AMS_HOOK.idleExpired:
      return {
        eventType: 'stream_stopped',
        status: 'Offline',
        touchLastFrame: false,
        recognised: true,
      }

    default:
      return {
        eventType: 'stream_unhandled',
        status: null,
        touchLastFrame: false,
        recognised: false,
      }
  }
}
