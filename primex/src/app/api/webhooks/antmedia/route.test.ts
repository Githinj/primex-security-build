import { describe, it, expect, vi, beforeEach } from 'vitest'

/**
 * Tests for the webhook route itself (SEC-188).
 *
 * This is the app's only unauthenticated, service-role-writing entry point — it
 * bypasses RLS by design — and it had no coverage at all. The pure mapper is
 * tested in lib/streaming; what is asserted here is the wiring: that a bad
 * secret writes nothing, that an unknown stream is skipped rather than
 * exploding, that a duplicate vodReady produces no second row, and that a
 * form-encoded body (which is what Ant Media actually sends) is understood.
 */

type Row = Record<string, unknown>

// What the fake client did, so each test can assert on writes rather than on
// the shape of the mock.
const db = {
  cameras: [] as Row[],
  recordings: [] as Row[],
  existingRecordingUrls: new Set<string>(),
  cameraUpdates: [] as { match: Row; values: Row }[],
  streamEvents: [] as Row[],
  recordingUpserts: [] as Row[],
  webhookDeliveries: [] as Row[],
}

function resetDb() {
  db.cameras = [{ id: 'camera-uuid', stream_id: 'cam-01', status: 'Online' }]
  db.recordings = []
  db.existingRecordingUrls = new Set()
  db.cameraUpdates = []
  db.streamEvents = []
  db.recordingUpserts = []
  db.webhookDeliveries = []
}

/**
 * Minimal PostgREST-shaped builder. Every filter is recorded and the terminal
 * awaits resolve from the recorded state, which keeps the fake honest about
 * *which* rows a query would have touched.
 */
function makeBuilder(table: string) {
  const filters: Row = {}
  let op: 'select' | 'update' | 'insert' | 'upsert' = 'select'
  let values: Row | Row[] = {}
  let ignoreDuplicates = false

  const result = () => {
    if (table === 'cameras' && op === 'select') {
      let rows = db.cameras
      if (filters.stream_id) rows = rows.filter((r) => r.stream_id === filters.stream_id)
      if (filters.status) rows = rows.filter((r) => r.status === filters.status)
      if (filters.streamIdNotNull) rows = rows.filter((r) => r.stream_id != null)
      return { data: rows, error: null }
    }
    if (table === 'cameras' && op === 'update') {
      db.cameraUpdates.push({ match: { ...filters }, values: values as Row })
      return { data: null, error: null }
    }
    if (table === 'recordings' && op === 'upsert') {
      const row = values as Row
      db.recordingUpserts.push(row)
      const url = row.file_url as string
      if (ignoreDuplicates && db.existingRecordingUrls.has(url)) {
        // ON CONFLICT DO NOTHING: no row returned means this delivery lost.
        return { data: [], error: null }
      }
      db.existingRecordingUrls.add(url)
      db.recordings.push(row)
      return { data: [{ id: 'recording-uuid' }], error: null }
    }
    if (table === 'stream_events' && op === 'insert') {
      const rows = Array.isArray(values) ? values : [values]
      db.streamEvents.push(...rows)
      return { data: rows, error: null }
    }
    if (table === 'webhook_deliveries' && op === 'insert') {
      const rows = Array.isArray(values) ? values : [values]
      db.webhookDeliveries.push(...rows)
      return { data: rows, error: null }
    }
    return { data: [], error: null }
  }

  const builder: Record<string, unknown> = {
    select() {
      return builder
    },
    eq(column: string, value: unknown) {
      filters[column] = value
      return builder
    },
    in(column: string, value: unknown) {
      filters[column] = value
      return builder
    },
    not(column: string) {
      if (column === 'stream_id') filters.streamIdNotNull = true
      return builder
    },
    update(next: Row) {
      op = 'update'
      values = next
      return builder
    },
    insert(next: Row | Row[]) {
      op = 'insert'
      values = next
      return builder
    },
    upsert(next: Row, options?: { ignoreDuplicates?: boolean }) {
      op = 'upsert'
      values = next
      ignoreDuplicates = Boolean(options?.ignoreDuplicates)
      return builder
    },
    single() {
      const { data, error } = result() as { data: Row[]; error: unknown }
      return Promise.resolve({ data: data?.[0] ?? null, error })
    },
    maybeSingle() {
      const { data, error } = result() as { data: Row[]; error: unknown }
      return Promise.resolve({ data: data?.[0] ?? null, error })
    },
    then(resolve: (value: unknown) => unknown) {
      return Promise.resolve(result()).then(resolve)
    },
  }

  return builder
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => makeBuilder(table) }),
}))

const SECRET = 'test-webhook-secret'

vi.stubEnv('ANTMEDIA_WEBHOOK_SECRET', SECRET)
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://project.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
vi.stubEnv('DO_SPACES_RECORDINGS_BUCKET', 'primex')
vi.stubEnv('DO_SPACES_ENDPOINT', 'sgp1.digitaloceanspaces.com')

const { POST } = await import('./route')
const { NextRequest } = await import('next/server')

function post(
  body: string,
  {
    contentType = 'application/json',
    secret = SECRET,
    query = true,
  }: { contentType?: string; secret?: string | null; query?: boolean } = {},
) {
  const url = new URL('https://primex.example/api/webhooks/antmedia')
  if (secret && query) url.searchParams.set('secret', secret)

  const headers: Record<string, string> = { 'content-type': contentType }
  if (secret && !query) headers['X-Antmedia-Secret'] = secret

  return POST(new NextRequest(url, { method: 'POST', headers, body }))
}

const json = (obj: Record<string, unknown>) => JSON.stringify(obj)

beforeEach(() => {
  resetDb()
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  vi.spyOn(console, 'error').mockImplementation(() => {})
})

describe('POST /api/webhooks/antmedia', () => {
  describe('authentication', () => {
    it('rejects a wrong secret and writes nothing', async () => {
      const res = await post(json({ action: 'liveStreamStarted', streamId: 'cam-01' }), {
        secret: 'wrong',
      })
      expect(res.status).toBe(401)
      expect(db.cameraUpdates).toHaveLength(0)
      expect(db.streamEvents).toHaveLength(0)
    })

    it('rejects a missing secret', async () => {
      const res = await post(json({ action: 'liveStreamStarted', streamId: 'cam-01' }), {
        secret: null,
      })
      expect(res.status).toBe(401)
    })

    it('accepts the secret from the header as well as the query string', async () => {
      const res = await post(json({ action: 'liveStreamStarted', streamId: 'cam-01' }), {
        query: false,
      })
      expect(res.status).toBe(200)
    })
  })

  describe('body parsing', () => {
    it('understands the form-encoded body Ant Media actually sends', async () => {
      // The SEC-202 defect: this used to 400, and AMS retries non-200s.
      const res = await post('id=cam-01&action=liveStreamStarted&streamName=Front+Gate', {
        contentType: 'application/x-www-form-urlencoded',
      })
      expect(res.status).toBe(200)
      expect(db.cameraUpdates[0].values.status).toBe('Online')
    })

    it('captures what a real delivery looked like, which is SEC-202 AC3 and AC4', async () => {
      // The acceptance criteria ask for the observed Content-Type and the field
      // names AMS actually sends. Recording them per delivery means the first
      // real one answers both, rather than needing someone tailing Vercel logs
      // at the moment a stream starts.
      await post('id=cam-01&action=liveStreamStarted&streamName=Front+Gate', {
        contentType: 'application/x-www-form-urlencoded',
      })

      expect(db.webhookDeliveries).toHaveLength(1)
      expect(db.webhookDeliveries[0]).toMatchObject({
        content_type: 'application/x-www-form-urlencoded',
        action: 'liveStreamStarted',
        stream_id: 'cam-01',
        outcome: 'parsed',
        camera_id: 'camera-uuid',
      })
      // Settles streamId-vs-id-vs-streamName from one sample.
      expect(db.webhookDeliveries[0].body_keys).toEqual(['action', 'id', 'streamName'])
    })

    it('records a delivery for a stream it does not know', async () => {
      // Previously this vanished into a console.warn — which is exactly how a
      // misconfigured stream id stayed invisible.
      const res = await post(json({ action: 'liveStreamStarted', streamId: 'not-a-camera' }))

      expect(res.status).toBe(200)
      expect(db.webhookDeliveries).toHaveLength(1)
      expect(db.webhookDeliveries[0]).toMatchObject({
        outcome: 'unknown_stream',
        stream_id: 'not-a-camera',
      })
    })

    it('200s on a body it cannot parse — and records it instead of writing state', async () => {
      // Deliberately not a 400 (SEC-202). AMS retries any non-2xx from 2.8.3
      // onward, and a body we could not parse once will not parse on the tenth
      // attempt — a 400 here is a retry storm against an unparseable payload.
      // The delivery is captured instead, which is the actionable half.
      const res = await post('not a body at all')
      expect(res.status).toBe(200)
      expect(db.streamEvents).toHaveLength(0)
      expect(db.cameraUpdates).toHaveLength(0)

      expect(db.webhookDeliveries).toHaveLength(1)
      expect(db.webhookDeliveries[0]).toMatchObject({
        outcome: 'unparseable',
        raw_body: 'not a body at all',
        content_type: 'application/json',
      })
    })

    it('400s when the action is missing', async () => {
      const res = await post(json({ streamId: 'cam-01' }))
      expect(res.status).toBe(400)
    })
  })

  describe('camera resolution', () => {
    it('skips an unknown stream id with a 200 rather than erroring', async () => {
      // A 200 matters: AMS retries anything else, and a stream we do not track
      // would retry-storm forever.
      const res = await post(json({ action: 'liveStreamStarted', streamId: 'not-ours' }))
      expect(res.status).toBe(200)
      expect(await res.json()).toMatchObject({ skipped: true })
      expect(db.cameraUpdates).toHaveLength(0)
    })
  })

  describe('lifecycle events', () => {
    it('takes the camera Online and clears its warning on start', async () => {
      await post(json({ action: 'liveStreamStarted', streamId: 'cam-01' }))
      expect(db.cameraUpdates[0].values).toMatchObject({ status: 'Online', warning: null })
      expect(db.streamEvents[0]).toMatchObject({ event_type: 'stream_started' })
    })

    it('records an error hook and takes the camera Offline', async () => {
      await post(json({ action: 'publishTimeoutError', streamId: 'cam-01' }))
      expect(db.cameraUpdates[0].values.status).toBe('Offline')
      expect(db.cameraUpdates[0].values.warning).toBeTruthy()
      expect(db.streamEvents[0]).toMatchObject({ event_type: 'stream_error' })
    })

    it('records an unmapped action instead of dropping it', async () => {
      await post(json({ action: 'someHookAmsAddedLater', streamId: 'cam-01' }))
      expect(db.streamEvents[0]).toMatchObject({ event_type: 'stream_unhandled' })
    })

    it('writes nothing for a per-viewer hook', async () => {
      await post(json({ action: 'playStarted', streamId: 'cam-01' }))
      expect(db.streamEvents).toHaveLength(0)
      expect(db.cameraUpdates).toHaveLength(0)
    })
  })

  describe('serverShutdown', () => {
    it('takes every Online camera down without needing a stream id', async () => {
      // It carries no streamId, so before SEC-181 it died at the 400.
      db.cameras = [
        { id: 'a', stream_id: 'cam-01', status: 'Online' },
        { id: 'b', stream_id: 'cam-02', status: 'Online' },
        { id: 'c', stream_id: 'cam-03', status: 'Offline' },
      ]
      const res = await post(json({ action: 'serverShutdown' }))

      expect(res.status).toBe(200)
      expect(await res.json()).toMatchObject({ affected: 2 })
      expect(db.cameraUpdates[0].values.status).toBe('Offline')
      expect(db.streamEvents.map((e) => e.event_type)).toEqual([
        'server_shutdown',
        'server_shutdown',
      ])
    })

    it('is a no-op when nothing is Online', async () => {
      db.cameras = [{ id: 'c', stream_id: 'cam-03', status: 'Offline' }]
      const res = await post(json({ action: 'serverShutdown' }))
      expect(await res.json()).toMatchObject({ affected: 0 })
      expect(db.cameraUpdates).toHaveLength(0)
    })
  })

  describe('vodReady', () => {
    const vod = {
      action: 'vodReady',
      streamId: 'cam-01',
      vodName: 'cam-01_2026-08-10.mp4',
      vodId: 'vod-77',
      startTime: '2026-08-10T09:00:00.000Z',
      endTime: '2026-08-10T09:15:00.000Z',
      duration: 900000,
      fileSize: 48000000,
    }

    it('stores the recording and logs the event', async () => {
      await post(json(vod))
      expect(db.recordings).toHaveLength(1)
      expect(db.recordings[0]).toMatchObject({
        camera_id: 'camera-uuid',
        duration_s: 900,
        started_at: '2026-08-10T09:00:00.000Z',
      })
      expect(db.streamEvents[0]).toMatchObject({ event_type: 'recording_saved' })
    })

    it('adds no second row and no second event on redelivery', async () => {
      // SEC-179: the DB constraint arbitrates, and the route must respect the
      // "you lost" answer for the event log too, not just the recording.
      await post(json(vod))
      await post(json(vod))

      expect(db.recordings).toHaveLength(1)
      expect(db.streamEvents).toHaveLength(1)
    })

    it('reports the duplicate rather than silently succeeding', async () => {
      await post(json(vod))
      const res = await post(json(vod))
      expect(await res.json()).toMatchObject({ duplicate: true })
    })

    it('builds the file URL from the configured bucket', async () => {
      await post(json(vod))
      expect(db.recordings[0].file_url).toBe(
        'https://primex.sgp1.digitaloceanspaces.com/recordings/cam-01_2026-08-10.mp4',
      )
    })

    it('reads numeric fields that arrive as strings under form encoding', async () => {
      await post(
        'id=cam-01&action=vodReady&vodName=clip.mp4&duration=900000&fileSize=48000000',
        { contentType: 'application/x-www-form-urlencoded' },
      )
      expect(db.recordings[0]).toMatchObject({ duration_s: 900, file_size: 48000000 })
    })
  })
})
