import { describe, it, expect } from 'vitest'
import { assertMayAssignStreamId } from './stream-id-guard'

describe('assertMayAssignStreamId', () => {
  it('lets super_admin assign a stream id', () => {
    expect(() =>
      assertMayAssignStreamId({ role: 'super_admin' }, { stream_id: 'cam-01' }),
    ).not.toThrow()
  })

  it('lets super_admin clear a stream id', () => {
    expect(() =>
      assertMayAssignStreamId({ role: 'super_admin' }, { stream_id: null }),
    ).not.toThrow()
  })

  it('rejects a company_manager assigning a stream id', () => {
    // The SEC-176 attack: point your own camera at another tenant's stream id,
    // then call getStreamToken() on it.
    expect(() =>
      assertMayAssignStreamId({ role: 'company_manager' }, { stream_id: 'other-tenant-cam' }),
    ).toThrow(/super admin/i)
  })

  it('rejects a company_manager clearing a stream id', () => {
    // Clearing is still a write to the field, and releasing an id another camera
    // can then claim is exactly the sequence the unique index is guarding.
    expect(() =>
      assertMayAssignStreamId({ role: 'company_manager' }, { stream_id: null }),
    ).toThrow()
  })

  it('rejects an explicitly-undefined stream_id key from a company_manager', () => {
    // `{ stream_id: undefined }` reaches Supabase as a no-op, but accepting the
    // key at all means the check depends on the value rather than the intent.
    expect(() =>
      assertMayAssignStreamId({ role: 'company_manager' }, { stream_id: undefined }),
    ).toThrow()
  })

  it('allows a company_manager editing everything except stream_id', () => {
    expect(() => assertMayAssignStreamId({ role: 'company_manager' }, {})).not.toThrow()
  })

  it('rejects any other role', () => {
    for (const role of ['dispatcher', 'guard', 'client', '']) {
      expect(() =>
        assertMayAssignStreamId({ role }, { stream_id: 'cam-01' }),
      ).toThrow()
    }
  })
})
