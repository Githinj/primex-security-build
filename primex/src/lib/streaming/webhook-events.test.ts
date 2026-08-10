import { describe, it, expect } from 'vitest'
import { AMS_HOOK, streamDropCounts, streamWebhookEffect } from './webhook-events'

describe('streamWebhookEffect', () => {
  it('brings a camera Online and stamps last_frame_at when a stream starts', () => {
    expect(streamWebhookEffect(AMS_HOOK.streamStarted)).toEqual({
      eventType: 'stream_started',
      status: 'Online',
      touchLastFrame: true,
      recognised: true,
    })
  })

  it('takes a camera Offline when the stream ends', () => {
    const effect = streamWebhookEffect(AMS_HOOK.streamEnded)
    expect(effect.status).toBe('Offline')
    expect(effect.eventType).toBe('stream_stopped')
    // The feed is gone; leaving last_frame_at untouched keeps it as the honest
    // "last time we saw video" rather than "last time AMS spoke to us".
    expect(effect.touchLastFrame).toBe(false)
  })

  it('records recording_saved for vodReady without touching camera status', () => {
    const effect = streamWebhookEffect(AMS_HOOK.vodReady)
    expect(effect.eventType).toBe('recording_saved')
    expect(effect.status).toBeNull()
  })

  describe('error hooks', () => {
    it('takes the camera Offline on publishTimeoutError', () => {
      // The source stopped delivering — on the RTSP-pull sites this is the
      // gateway dropping the tunnel, and it is a real outage.
      const effect = streamWebhookEffect(AMS_HOOK.publishTimeout)
      expect(effect.eventType).toBe('stream_error')
      expect(effect.status).toBe('Offline')
    })

    it.each([AMS_HOOK.encoderNotOpened, AMS_HOOK.endpointFailed])(
      'records %s as an error but leaves camera status alone',
      (action) => {
        // Neither proves the source is down: one is the ABR encoder failing to
        // start, the other a re-publish target rejecting us. Flipping to Offline
        // would report a false outage while video is still arriving.
        const effect = streamWebhookEffect(action)
        expect(effect.eventType).toBe('stream_error')
        expect(effect.status).toBeNull()
      },
    )

    it('no longer discards error hooks — the regression SEC-201 fixed', () => {
      const errorActions = [
        AMS_HOOK.publishTimeout,
        AMS_HOOK.encoderNotOpened,
        AMS_HOOK.endpointFailed,
      ]
      for (const action of errorActions) {
        expect(streamWebhookEffect(action).eventType).not.toBeNull()
      }
    })
  })

  describe('liveStreamStatus heartbeat', () => {
    it('is silent in the event log when AMS reports no drops', () => {
      // Fires on a timer. Recording every beat would swamp a table that only
      // keeps 7 days of history.
      const effect = streamWebhookEffect(AMS_HOOK.streamStatus, {
        dropPacketCountInIngestion: 0,
        dropFrameCountInEncoding: 0,
      })
      expect(effect.eventType).toBeNull()
      expect(effect.touchLastFrame).toBe(true)
    })

    it('records stream_degraded once AMS reports dropped ingest packets', () => {
      const effect = streamWebhookEffect(AMS_HOOK.streamStatus, {
        dropPacketCountInIngestion: 42,
      })
      expect(effect.eventType).toBe('stream_degraded')
    })

    it('records stream_degraded on dropped encode frames alone', () => {
      const effect = streamWebhookEffect(AMS_HOOK.streamStatus, {
        dropFrameCountInEncoding: 7,
      })
      expect(effect.eventType).toBe('stream_degraded')
    })

    it('repairs a camera left Offline by a missed start event', () => {
      // The flap this whole issue is about: broadcasting → finished →
      // broadcasting. If the recovery's liveStreamStarted is lost, the next
      // heartbeat is what puts the camera back Online instead of it sitting
      // Offline until someone reloads.
      expect(streamWebhookEffect(AMS_HOOK.streamStatus, {}).status).toBe('Online')
    })
  })

  it('takes the camera Offline when AMS stops an idle stream', () => {
    const effect = streamWebhookEffect(AMS_HOOK.idleExpired)
    expect(effect.status).toBe('Offline')
    expect(effect.eventType).toBe('stream_stopped')
  })

  describe('noise control', () => {
    it.each([
      'playStarted',
      'playStopped',
      'subtrackAddedInTheMainTrack',
      'subtrackLeftTheMainTrack',
      'firstActiveTrackAddedInMainTrack',
      'noActiveSubtracksLeftInMainTrack',
    ])('drops the per-viewer/per-subtrack hook %s', (action) => {
      // One event per player: ten dispatcher tiles would be ten rows per open.
      expect(streamWebhookEffect(action)).toEqual({
        eventType: null,
        status: null,
        touchLastFrame: false,
        recognised: true,
      })
    })

    it('records an unmapped action instead of silently dropping it', () => {
      // An action we ignore on purpose and an action we have never seen must not
      // look the same — the second means AMS grew a hook and we should notice.
      const effect = streamWebhookEffect('someHookAmsAddedLater')
      expect(effect.recognised).toBe(false)
      expect(effect.eventType).toBe('stream_unhandled')
      expect(effect.status).toBeNull()
    })
  })
})

describe('streamDropCounts', () => {
  it('reads both AMS drop counters', () => {
    expect(
      streamDropCounts({ dropPacketCountInIngestion: 12, dropFrameCountInEncoding: 3 }),
    ).toEqual({ ingestion: 12, encoding: 3, degraded: true })
  })

  it('treats a clean status hook as not degraded', () => {
    expect(streamDropCounts({}).degraded).toBe(false)
  })

  it.each([
    ['a string', '12'],
    ['null', null],
    ['undefined', undefined],
    ['NaN', Number.NaN],
    ['a negative count', -5],
  ])('coerces %s to zero rather than reporting a false degradation', (_label, value) => {
    // A hook body is JSON from another process; a non-numeric counter must not
    // read as loss and page someone about a healthy stream.
    const counts = streamDropCounts({ dropPacketCountInIngestion: value })
    expect(counts.ingestion).toBe(0)
    expect(counts.degraded).toBe(false)
  })
})
