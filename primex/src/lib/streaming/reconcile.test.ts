import { describe, it, expect } from 'vitest'
import { correctionWarning, reconcileCameraStatuses, type CameraRow } from './reconcile'

const camera = (over: Partial<CameraRow> = {}): CameraRow => ({
  id: 'cam-uuid',
  stream_id: 'cam-01',
  status: 'Online',
  ...over,
})

describe('reconcileCameraStatuses', () => {
  it('corrects a camera stuck Online when the stream has stopped', () => {
    // The lost liveStreamEnded: the player spins forever and a dispatcher
    // believes the site is covered.
    const [correction] = reconcileCameraStatuses(
      [camera({ status: 'Online' })],
      [{ streamId: 'cam-01', status: 'finished' }],
    )
    expect(correction.to).toBe('Offline')
    expect(correction.reason).toContain('finished')
  })

  it('corrects a camera stuck Offline when the stream is broadcasting', () => {
    // The lost liveStreamStarted: a healthy camera is invisible, and the AI
    // worker skips it entirely because its supervisor filters on Online.
    const [correction] = reconcileCameraStatuses(
      [camera({ status: 'Offline' })],
      [{ streamId: 'cam-01', status: 'broadcasting' }],
    )
    expect(correction.to).toBe('Online')
  })

  it('returns nothing when the DB already agrees with Ant Media', () => {
    expect(
      reconcileCameraStatuses(
        [camera({ status: 'Online' })],
        [{ streamId: 'cam-01', status: 'broadcasting' }],
      ),
    ).toEqual([])
  })

  it.each(['preparing', 'created', 'finished', ''])(
    'treats the AMS status %s as Offline, not Online',
    (status) => {
      // `preparing` matters most: that is a stream source trying and failing to
      // connect, which is exactly the state a lossy site tunnel sits in
      // (SEC-197). Reading it as Online would report coverage that isn't there.
      const [correction] = reconcileCameraStatuses(
        [camera({ status: 'Online' })],
        [{ streamId: 'cam-01', status }],
      )
      expect(correction.to).toBe('Offline')
    },
  )

  it('takes a camera Offline when Ant Media has no such broadcast', () => {
    const [correction] = reconcileCameraStatuses([camera({ status: 'Online' })], [])
    expect(correction.to).toBe('Offline')
    expect(correction.reason).toContain('no broadcast')
  })

  it('leaves an already-Offline camera alone when the broadcast is missing', () => {
    // Nothing to fix, and writing anyway would churn stream_events every run.
    expect(reconcileCameraStatuses([camera({ status: 'Offline' })], [])).toEqual([])
  })

  it('never touches a camera in Maintenance', () => {
    // Maintenance is a human decision about a camera. A cron overwriting it
    // would silently undo an operator's action.
    expect(
      reconcileCameraStatuses(
        [camera({ status: 'Maintenance' })],
        [{ streamId: 'cam-01', status: 'broadcasting' }],
      ),
    ).toEqual([])
  })

  it('skips cameras with no stream_id', () => {
    expect(
      reconcileCameraStatuses(
        [camera({ stream_id: null, status: 'Online' })],
        [{ streamId: 'cam-01', status: 'finished' }],
      ),
    ).toEqual([])
  })

  it('corrects Unknown, which is a real starting state', () => {
    const [correction] = reconcileCameraStatuses(
      [camera({ status: 'Unknown' })],
      [{ streamId: 'cam-01', status: 'broadcasting' }],
    )
    expect(correction.from).toBe('Unknown')
    expect(correction.to).toBe('Online')
  })

  it('matches each camera to its own broadcast across a fleet', () => {
    const corrections = reconcileCameraStatuses(
      [
        camera({ id: 'a', stream_id: 'cam-01', status: 'Online' }),
        camera({ id: 'b', stream_id: 'cam-02', status: 'Offline' }),
        camera({ id: 'c', stream_id: 'cam-03', status: 'Online' }),
      ],
      [
        { streamId: 'cam-01', status: 'broadcasting' },
        { streamId: 'cam-02', status: 'broadcasting' },
        { streamId: 'cam-03', status: 'finished' },
      ],
    )
    expect(corrections.map((c) => [c.cameraId, c.to])).toEqual([
      ['b', 'Online'],
      ['c', 'Offline'],
    ])
  })

  it('ignores malformed broadcast entries rather than throwing', () => {
    // The list is JSON from another process; a missing streamId must not take
    // the whole reconciliation run down.
    const corrections = reconcileCameraStatuses(
      [camera({ status: 'Offline' })],
      [
        { status: 'broadcasting' },
        { streamId: 42, status: 'broadcasting' },
        { streamId: 'cam-01', status: 'broadcasting' },
      ] as never,
    )
    expect(corrections).toHaveLength(1)
    expect(corrections[0].to).toBe('Online')
  })
})

describe('correctionWarning', () => {
  it('explains an Offline correction', () => {
    const [correction] = reconcileCameraStatuses([camera({ status: 'Online' })], [])
    expect(correctionWarning(correction)).toBe(correction.reason)
  })

  it('clears the warning when a camera comes back', () => {
    const [correction] = reconcileCameraStatuses(
      [camera({ status: 'Offline' })],
      [{ streamId: 'cam-01', status: 'broadcasting' }],
    )
    expect(correctionWarning(correction)).toBeNull()
  })
})
