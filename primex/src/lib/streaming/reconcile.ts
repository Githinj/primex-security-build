import type { CameraStatus } from '@/lib/types'

/**
 * Reconciling `cameras.status` against Ant Media (SEC-180).
 *
 * The webhook is the column's only writer, and webhooks are at-most-once in
 * practice — a cold-start timeout, a 500, an AMS restart or a dropped packet and
 * the event is simply gone. The camera then sits wrong forever: `Online` with a
 * player that spins while a dispatcher believes the site is covered, or `Offline`
 * while a healthy camera stays invisible. For a security product, "the camera
 * went dark and nobody was told" is the failure that matters most, and nothing
 * closed that loop.
 *
 * This module is the pure half — given what the DB thinks and what AMS says,
 * decide what to correct. The route does the I/O.
 */

/**
 * Broadcast statuses AMS reports. Only `broadcasting` means video is flowing;
 * `preparing` in particular is a stream source that is trying and failing to
 * connect, which is precisely the state a lossy site tunnel sits in (SEC-197)
 * and must not read as Online.
 */
export const AMS_BROADCASTING = 'broadcasting'

export type AmsBroadcast = {
  streamId?: unknown
  status?: unknown
}

export type CameraRow = {
  id: string
  stream_id: string | null
  status: CameraStatus
}

export type StatusCorrection = {
  cameraId: string
  streamId: string
  from: CameraStatus
  to: CameraStatus
  /** Why, for the stream_events row and the log — this is the audit trail. */
  reason: string
}

/**
 * Compare DB state against the AMS broadcast list and return only what needs
 * changing.
 *
 * Cameras in `Maintenance` are left alone: that is a human decision about a
 * camera, and a cron overwriting it would silently undo an operator's action.
 * The same goes for any camera with no `stream_id` — nothing to compare against.
 */
export function reconcileCameraStatuses(
  cameras: readonly CameraRow[],
  broadcasts: readonly AmsBroadcast[],
): StatusCorrection[] {
  const amsStatus = new Map<string, string>()
  for (const broadcast of broadcasts) {
    if (typeof broadcast.streamId === 'string' && broadcast.streamId) {
      amsStatus.set(
        broadcast.streamId,
        typeof broadcast.status === 'string' ? broadcast.status : '',
      )
    }
  }

  const corrections: StatusCorrection[] = []

  for (const camera of cameras) {
    if (!camera.stream_id) continue
    if (camera.status === 'Maintenance') continue

    const status = amsStatus.get(camera.stream_id)

    // The broadcast is gone from AMS entirely — deleted, or never created. A
    // camera cannot be Online without one, and saying so is more useful than
    // leaving a dispatcher looking at a stale green dot.
    if (status === undefined) {
      if (camera.status === 'Online') {
        corrections.push({
          cameraId: camera.id,
          streamId: camera.stream_id,
          from: camera.status,
          to: 'Offline',
          reason: 'Ant Media has no broadcast with this stream ID.',
        })
      }
      continue
    }

    const shouldBe: CameraStatus = status === AMS_BROADCASTING ? 'Online' : 'Offline'
    if (camera.status === shouldBe) continue

    corrections.push({
      cameraId: camera.id,
      streamId: camera.stream_id,
      from: camera.status,
      to: shouldBe,
      reason:
        shouldBe === 'Online'
          ? 'Ant Media is broadcasting this stream — a start event was missed.'
          : `Ant Media reports this stream as "${status || 'unknown'}" — a stop event was missed.`,
    })
  }

  return corrections
}

/** Warning text for a corrected camera; null clears it when it comes back. */
export function correctionWarning(correction: StatusCorrection): string | null {
  return correction.to === 'Online' ? null : correction.reason
}
