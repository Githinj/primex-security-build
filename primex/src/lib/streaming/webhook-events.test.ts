import { describe, it, expect } from 'vitest'
import {
  AMS_HOOK,
  MAX_STORED_BODY,
  parseHookBody,
  streamDropCounts,
  streamWebhookEffect,
  vodRecordingRow,
  webhookDelivery,
} from './webhook-events'

describe('streamWebhookEffect', () => {
  it('brings a camera Online and stamps last_frame_at when a stream starts', () => {
    expect(streamWebhookEffect(AMS_HOOK.streamStarted)).toEqual({
      eventType: 'stream_started',
      status: 'Online',
      warning: null,
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

  describe('cameras.warning', () => {
    it.each([
      [AMS_HOOK.publishTimeout, 'stopped sending video'],
      [AMS_HOOK.encoderNotOpened, 'could not open an encoder'],
      [AMS_HOOK.endpointFailed, 'endpoint rejected'],
      [AMS_HOOK.idleExpired, 'idle timeout'],
      [AMS_HOOK.serverShutdown, 'shut down'],
    ])('says why the camera went dark on %s', (action, fragment) => {
      // Status alone can't distinguish "the tunnel dropped" from "AMS stopped an
      // idle stream" from "the encoder never started" — all three read as
      // Offline, and only the warning tells anyone which to go fix.
      expect(streamWebhookEffect(action).warning).toContain(fragment)
    })

    it('clears the warning when a stream starts', () => {
      expect(streamWebhookEffect(AMS_HOOK.streamStarted).warning).toBeNull()
    })

    it('clears the warning on a clean stop', () => {
      // A clean stop is not a fault. Leaving a stale error next to an Offline
      // badge would send someone chasing an outage that already ended.
      expect(streamWebhookEffect(AMS_HOOK.streamEnded).warning).toBeNull()
    })

    it('warns with the drop counts while a stream is degrading', () => {
      const effect = streamWebhookEffect(AMS_HOOK.streamStatus, {
        dropPacketCountInIngestion: 42,
        dropFrameCountInEncoding: 7,
      })
      expect(effect.warning).toContain('42 ingest packet(s)')
      expect(effect.warning).toContain('7 encode frame(s)')
    })

    it('clears the warning on a clean heartbeat', () => {
      expect(streamWebhookEffect(AMS_HOOK.streamStatus, {}).warning).toBeNull()
    })

    it.each([
      ['vodReady', AMS_HOOK.vodReady],
      ['an ignored per-viewer hook', 'playStarted'],
      ['an unmapped action', 'someHookAmsAddedLater'],
    ])('leaves the warning alone for %s', (_label, action) => {
      // undefined, not null: none of these say anything about camera health, so
      // clearing an active warning on one would hide a real fault.
      expect(streamWebhookEffect(action).warning).toBeUndefined()
    })
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

  it('counts numeric strings, because form-encoded hooks send everything as text', () => {
    // Reversed deliberately (SEC-202): this used to assert that '12' read as
    // zero, on the assumption the body was JSON. AMS posts
    // application/x-www-form-urlencoded, so every value arrives as a string and
    // the old rule would have zeroed out the drop counters on every real
    // delivery — silently disabling the degradation detection.
    const counts = streamDropCounts({
      dropPacketCountInIngestion: '12',
      dropFrameCountInEncoding: '3',
    })
    expect(counts).toEqual({ ingestion: 12, encoding: 3, degraded: true })
  })

  it.each([
    ['a non-numeric string', 'lots'],
    ['an empty string', ''],
    ['whitespace', '   '],
    ['null', null],
    ['undefined', undefined],
    ['NaN', Number.NaN],
    ['a negative count', -5],
    ['a negative numeric string', '-5'],
  ])('coerces %s to zero rather than reporting a false degradation', (_label, value) => {
    // A hook body comes from another process; a counter that isn't a real
    // positive number must not read as loss and page someone about a healthy
    // stream.
    const counts = streamDropCounts({ dropPacketCountInIngestion: value })
    expect(counts.ingestion).toBe(0)
    expect(counts.degraded).toBe(false)
  })
})

describe('parseHookBody', () => {
  const FORM = 'application/x-www-form-urlencoded'

  it('parses the form-encoded body AMS actually sends', () => {
    // The delivery shape the route used to answer with a 400 (SEC-202).
    expect(
      parseHookBody(`${FORM};charset=UTF-8`, 'id=cam-01&action=liveStreamStarted&streamName=Front+Gate'),
    ).toEqual({ id: 'cam-01', action: 'liveStreamStarted', streamName: 'Front Gate' })
  })

  it('parses a JSON body', () => {
    expect(
      parseHookBody('application/json', '{"id":"cam-01","action":"liveStreamEnded"}'),
    ).toEqual({ id: 'cam-01', action: 'liveStreamEnded' })
  })

  it('decodes percent-encoded and plus-encoded form values', () => {
    expect(parseHookBody(FORM, 'vodName=front+gate%2F2026.mp4')).toEqual({
      vodName: 'front gate/2026.mp4',
    })
  })

  it('reads JSON that arrives mislabelled as form-encoded', () => {
    // The declared type is a hint, not a promise — accepting both means this
    // stays correct whichever way the server behaves, and if a future AMS
    // switches encodings.
    expect(parseHookBody(FORM, '{"id":"cam-01","action":"vodReady"}')).toEqual({
      id: 'cam-01',
      action: 'vodReady',
    })
  })

  it('reads form data that arrives with no content-type at all', () => {
    expect(parseHookBody(null, 'id=cam-01&action=vodReady')).toEqual({
      id: 'cam-01',
      action: 'vodReady',
    })
  })

  it('does not mangle a JSON body into a single garbage form key', () => {
    // URLSearchParams never throws, so '{"a":1}' would otherwise parse as one
    // key named '{"a":1}' and the action would come back undefined.
    const parsed = parseHookBody(FORM, '{"action":"liveStreamStarted"}')
    expect(parsed).toEqual({ action: 'liveStreamStarted' })
  })

  it.each([
    ['an empty body', ''],
    ['whitespace only', '   '],
    ['a bare token', 'not-a-body'],
    ['a JSON array', '[1,2,3]'],
    ['JSON null', 'null'],
  ])('rejects %s', (_label, raw) => {
    expect(parseHookBody('application/json', raw)).toBeNull()
  })
})

describe('vodRecordingRow', () => {
  const SPACES = 'https://primex.sgp1.digitaloceanspaces.com'
  const options = { spacesEndpoint: SPACES, receivedAt: '2026-08-10T12:00:00.000Z' }

  const fullPayload = {
    action: AMS_HOOK.vodReady,
    streamId: 'cam-front-gate',
    vodName: 'cam-front-gate_2026-08-10_09-00-00.mp4',
    vodId: 'vod-77',
    duration: 900_000,
    fileSize: 48_000_000,
    startTime: '2026-08-10T09:00:00.000Z',
    endTime: '2026-08-10T09:15:00.000Z',
  }

  it('maps a complete AMS payload onto the recordings row', () => {
    expect(vodRecordingRow('cam-front-gate', fullPayload, options)).toEqual({
      file_url: `${SPACES}/recordings/cam-front-gate_2026-08-10_09-00-00.mp4`,
      stream_id: 'cam-front-gate',
      file_size: 48_000_000,
      // AMS counts milliseconds, the column holds seconds.
      duration_s: 900,
      started_at: '2026-08-10T09:00:00.000Z',
      ended_at: '2026-08-10T09:15:00.000Z',
      status: 'complete',
    })
  })

  describe('idempotency key (SEC-179)', () => {
    it('derives the same file_url from a redelivered hook', () => {
      // The unique index in migration 019 only rejects the duplicate if both
      // deliveries resolve to the same key. Different arrival times, same row.
      const first = vodRecordingRow('cam-front-gate', fullPayload, options)
      const second = vodRecordingRow('cam-front-gate', fullPayload, {
        spacesEndpoint: SPACES,
        receivedAt: '2026-08-10T12:04:31.000Z',
      })
      expect(second.file_url).toBe(first.file_url)
    })

    it('falls back to vodId, not arrival time, when vodName is missing', () => {
      // Whether AMS sends vodName is still unverified (SEC-182). If it does not,
      // the URL is a guess either way — but a guess built from vodId is one a
      // retry storm reproduces, and one built from now() is not.
      const row = vodRecordingRow(
        'cam-front-gate',
        { ...fullPayload, vodName: undefined },
        options,
      )
      expect(row.file_url).toBe(`${SPACES}/recordings/cam-front-gate_vod-77.mp4`)
    })

    it('falls back to startTime when neither vodName nor vodId is present', () => {
      const row = vodRecordingRow(
        'cam-front-gate',
        { ...fullPayload, vodName: undefined, vodId: undefined },
        options,
      )
      expect(row.file_url).toBe(
        `${SPACES}/recordings/cam-front-gate_2026-08-10T09:00:00.000Z.mp4`,
      )
    })

    it.each([
      ['empty strings', { vodName: '', vodId: '' }],
      ['nulls', { vodName: null, vodId: null }],
    ])('treats %s as absent rather than keying on them', (_label, blanks) => {
      // `${''}` is a perfectly valid string to concatenate, so an empty vodName
      // would otherwise key every recording on the same URL and collapse them
      // all into one row.
      const row = vodRecordingRow('cam-front-gate', { ...fullPayload, ...blanks }, options)
      expect(row.file_url).toBe(
        `${SPACES}/recordings/cam-front-gate_2026-08-10T09:00:00.000Z.mp4`,
      )
    })
  })

  it('leaves absent metadata null instead of storing a zero', () => {
    // A zero-second, zero-byte recording reads as a real (broken) file; null
    // reads as "AMS did not tell us", which is the truth.
    const row = vodRecordingRow('cam-front-gate', { vodName: 'clip.mp4' }, options)
    expect(row.file_size).toBeNull()
    expect(row.duration_s).toBeNull()
  })

  it('times an undated recording at arrival rather than the epoch', () => {
    const row = vodRecordingRow('cam-front-gate', { vodName: 'clip.mp4' }, options)
    expect(row.started_at).toBe(options.receivedAt)
    expect(row.ended_at).toBe(options.receivedAt)
  })
})

describe('webhookDelivery (SEC-202)', () => {
  it('records the content type verbatim — that is the whole open question', () => {
    const raw = 'id=cam-01&action=liveStreamStarted'
    const body = parseHookBody('application/x-www-form-urlencoded', raw)
    const row = webhookDelivery('application/x-www-form-urlencoded', raw, body, 'parsed')

    expect(row.content_type).toBe('application/x-www-form-urlencoded')
    expect(row.action).toBe('liveStreamStarted')
    expect(row.stream_id).toBe('cam-01')
  })

  it('records the key set, which is what settles streamId vs id vs streamName', () => {
    const raw = 'id=cam-01&action=liveStreamStarted&streamName=Front+Door'
    const body = parseHookBody('application/x-www-form-urlencoded', raw)
    const row = webhookDelivery('application/x-www-form-urlencoded', raw, body, 'parsed')

    expect(row.body_keys).toEqual(['action', 'id', 'streamName'])
  })

  it('prefers streamId over id when both are present', () => {
    const row = webhookDelivery(
      'application/json',
      '{}',
      { streamId: 'from-streamId', id: 'from-id' },
      'parsed',
    )
    expect(row.stream_id).toBe('from-streamId')
  })

  it('never resolves a stream id from streamName', () => {
    // streamName is the human-readable broadcast name. Treating it as a key
    // would match the wrong camera, or none.
    const row = webhookDelivery('application/json', '{}', { streamName: 'Front Door' }, 'parsed')
    expect(row.stream_id).toBeNull()
  })

  it('keeps the raw body when the parse failed — the one case where bytes matter', () => {
    const raw = '<?xml version="1.0"?><hook/>'
    const row = webhookDelivery('text/xml', raw, null, 'unparseable')

    expect(row.raw_body).toBe(raw)
    expect(row.body_keys).toEqual([])
    expect(row.action).toBeNull()
    expect(row.outcome).toBe('unparseable')
  })

  it('truncates a pathological body rather than storing it whole', () => {
    const raw = 'x'.repeat(MAX_STORED_BODY + 500)
    const row = webhookDelivery('application/json', raw, null, 'unparseable')
    expect(row.raw_body).toHaveLength(MAX_STORED_BODY)
  })

  it('handles a missing content-type header', () => {
    const row = webhookDelivery(null, '{}', {}, 'parsed')
    expect(row.content_type).toBeNull()
  })

  it('ignores non-string action and id values instead of coercing them', () => {
    const row = webhookDelivery('application/json', '{}', { action: 42, id: false }, 'parsed')
    expect(row.action).toBeNull()
    expect(row.stream_id).toBeNull()
  })
})
