import { describe, it, expect } from 'vitest'
import { authenticateWebhook, clientIp, ipAllowed, secretMatches } from './webhook-auth'

const SECRET = 'a-long-random-capability-secret'

describe('secretMatches', () => {
  it('accepts the configured secret', () => {
    expect(secretMatches(SECRET, SECRET)).toBe(true)
  })

  it.each([
    ['a different secret', 'not-the-secret'],
    ['a prefix of it', SECRET.slice(0, -1)],
    ['it with a suffix', `${SECRET}x`],
    ['the empty string', ''],
    ['null', null],
    ['undefined', undefined],
  ])('rejects %s', (_label, presented) => {
    expect(secretMatches(presented, SECRET)).toBe(false)
  })

  it.each([
    ['undefined', undefined],
    ['null', null],
    ['the empty string', ''],
  ])('fails closed when the expectation is %s', (_label, expected) => {
    // An unconfigured deployment must reject every delivery. The old `!==`
    // against undefined got there by accident; a caller passing '' would have
    // matched an empty presented secret.
    expect(secretMatches('anything', expected)).toBe(false)
    expect(secretMatches('', expected)).toBe(false)
  })
})

describe('clientIp', () => {
  it('takes the originating client, not the proxy hops', () => {
    expect(clientIp('203.0.113.7, 70.41.3.18, 150.172.238.178')).toBe('203.0.113.7')
  })

  it('handles a single unpadded address', () => {
    expect(clientIp('203.0.113.7')).toBe('203.0.113.7')
  })

  it.each([
    ['a missing header', null],
    ['undefined', undefined],
    ['an empty header', ''],
    ['whitespace', '   '],
  ])('reports no address for %s', (_label, header) => {
    expect(clientIp(header)).toBeNull()
  })
})

describe('ipAllowed', () => {
  it.each([
    ['unset', undefined],
    ['null', null],
    ['empty', ''],
    ['only separators', ' , , '],
  ])('passes everything when the allowlist is %s', (_label, list) => {
    // Not configured is the state every current deployment is in — the secret
    // stands alone there, and turning this on must be opt-in.
    expect(ipAllowed('198.51.100.1', list)).toBe(true)
    expect(ipAllowed(null, list)).toBe(true)
  })

  it('admits an allowlisted address', () => {
    expect(ipAllowed('203.0.113.7', '203.0.113.7')).toBe(true)
  })

  it('admits any entry in a multi-address list, ignoring padding', () => {
    expect(ipAllowed('198.51.100.4', ' 203.0.113.7 , 198.51.100.4 ')).toBe(true)
  })

  it('rejects an address that is not on the list', () => {
    expect(ipAllowed('198.51.100.9', '203.0.113.7')).toBe(false)
  })

  it('matches on the client, not on a proxy hop', () => {
    // The allowlisted droplet must be the *origin*. Matching anywhere in the
    // chain would let anyone whose traffic happens to traverse it through.
    expect(ipAllowed('198.51.100.9, 203.0.113.7', '203.0.113.7')).toBe(false)
  })

  it('rejects a request with no address once the list is configured', () => {
    // A delivery that arrives without a forwarded-for did not come from the
    // droplet, so an unknown origin is a rejection rather than a pass.
    expect(ipAllowed(null, '203.0.113.7')).toBe(false)
  })
})

describe('authenticateWebhook', () => {
  const base = {
    headerSecret: null,
    querySecret: null,
    expectedSecret: SECRET,
    forwardedFor: null,
    allowList: null,
  }

  it('accepts the secret from the header', () => {
    expect(authenticateWebhook({ ...base, headerSecret: SECRET })).toEqual({ ok: true })
  })

  it('accepts the secret from the query string', () => {
    // AMS has nowhere else to put it: a listener hook is a bare URL, with no
    // custom headers and no signing. Dropping this channel would lock the
    // server out of its own webhook.
    expect(authenticateWebhook({ ...base, querySecret: SECRET })).toEqual({ ok: true })
  })

  it('prefers the header when both are present', () => {
    expect(
      authenticateWebhook({ ...base, headerSecret: SECRET, querySecret: 'stale' }),
    ).toEqual({ ok: true })
  })

  it('falls through to the query string when the header is empty', () => {
    expect(authenticateWebhook({ ...base, headerSecret: '', querySecret: SECRET })).toEqual({
      ok: true,
    })
  })

  it('fails closed when no secret is configured', () => {
    expect(
      authenticateWebhook({ ...base, expectedSecret: undefined, querySecret: 'anything' }),
    ).toEqual({ ok: false, reason: 'not-configured' })
  })

  it('rejects a wrong secret', () => {
    expect(authenticateWebhook({ ...base, querySecret: 'wrong' })).toEqual({
      ok: false,
      reason: 'bad-secret',
    })
  })

  it('rejects a delivery with no secret at all', () => {
    expect(authenticateWebhook(base)).toEqual({ ok: false, reason: 'bad-secret' })
  })

  it('rejects a correct secret from a non-allowlisted address', () => {
    // The whole point of the second factor: the hook URL leaks into logs, so a
    // correct secret from the wrong origin must still be refused.
    expect(
      authenticateWebhook({
        ...base,
        querySecret: SECRET,
        forwardedFor: '198.51.100.9',
        allowList: '203.0.113.7',
      }),
    ).toEqual({ ok: false, reason: 'forbidden-ip' })
  })

  it('accepts a correct secret from an allowlisted address', () => {
    expect(
      authenticateWebhook({
        ...base,
        querySecret: SECRET,
        forwardedFor: '203.0.113.7',
        allowList: '203.0.113.7',
      }),
    ).toEqual({ ok: true })
  })

  it('reports the address failure before the secret failure', () => {
    // Ordering is deliberate: an off-allowlist caller never reaches the compare,
    // so scanners don't get to exercise it. Both still return one uniform 401.
    expect(
      authenticateWebhook({
        ...base,
        querySecret: 'wrong',
        forwardedFor: '198.51.100.9',
        allowList: '203.0.113.7',
      }),
    ).toEqual({ ok: false, reason: 'forbidden-ip' })
  })

  it('reports missing configuration ahead of everything else', () => {
    expect(
      authenticateWebhook({
        ...base,
        expectedSecret: null,
        forwardedFor: '198.51.100.9',
        allowList: '203.0.113.7',
      }),
    ).toEqual({ ok: false, reason: 'not-configured' })
  })
})
