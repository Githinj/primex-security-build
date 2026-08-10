import { describe, it, expect, vi, afterEach } from 'vitest'
import crypto from 'crypto'
import { buildIceServers, turnCredentials } from './ice-servers'

const NOW = 1_760_000_000_000 // fixed clock; credentials embed an expiry

afterEach(() => {
  vi.restoreAllMocks()
})

describe('turnCredentials', () => {
  it('builds the coturn use-auth-secret pair', () => {
    const { username, credential } = turnCredentials('s3cret', 3600, 'cam-01', NOW)

    const expectedExpiry = Math.floor(NOW / 1000) + 3600
    expect(username).toBe(`${expectedExpiry}:cam-01`)
    // coturn recomputes exactly this and compares — get the algorithm or the
    // encoding wrong and every relay allocation is refused.
    expect(credential).toBe(
      crypto.createHmac('sha1', 's3cret').update(username).digest('base64'),
    )
  })

  it('expires: the username carries a timestamp that moves with the clock', () => {
    const early = turnCredentials('s3cret', 60, 'cam-01', NOW)
    const later = turnCredentials('s3cret', 60, 'cam-01', NOW + 60_000)
    expect(early.username).not.toBe(later.username)
    expect(early.credential).not.toBe(later.credential)
  })

  it('is deterministic for the same inputs', () => {
    expect(turnCredentials('s3cret', 60, 'cam-01', NOW)).toEqual(
      turnCredentials('s3cret', 60, 'cam-01', NOW),
    )
  })
})

describe('buildIceServers', () => {
  it('returns nothing when nothing is configured', () => {
    // Empty is meaningfully different from broken: the adaptor keeps its own
    // default, so an unconfigured deployment behaves exactly as it does today.
    expect(buildIceServers({ nowMs: NOW })).toEqual([])
  })

  it('returns STUN alone when only STUN is set', () => {
    expect(buildIceServers({ stunUrls: 'stun:stun.example:3478', nowMs: NOW })).toEqual([
      { urls: ['stun:stun.example:3478'] },
    ])
  })

  it('splits and trims a comma-separated list', () => {
    expect(
      buildIceServers({ stunUrls: ' stun:a:3478 , stun:b:3478 ', nowMs: NOW })[0].urls,
    ).toEqual(['stun:a:3478', 'stun:b:3478'])
  })

  it('mints ephemeral TURN credentials from the secret', () => {
    const servers = buildIceServers({
      stunUrls: 'stun:stun.example:3478',
      turnUrls: 'turn:turn.example:3478?transport=udp,turns:turn.example:5349?transport=tcp',
      turnSecret: 's3cret',
      turnTtlSeconds: 3600,
      label: 'cam-01',
      nowMs: NOW,
    })

    expect(servers).toHaveLength(2)
    expect(servers[1].urls).toHaveLength(2)
    expect(servers[1].username).toBe(`${Math.floor(NOW / 1000) + 3600}:cam-01`)
    expect(servers[1].credential).toBeTruthy()
  })

  it('never puts the TURN secret itself in the result', () => {
    // The result is serialized to the browser. The secret must not travel; only
    // an HMAC of a timestamp does.
    const serialized = JSON.stringify(
      buildIceServers({
        turnUrls: 'turn:turn.example:3478',
        turnSecret: 'super-secret-value',
        nowMs: NOW,
      }),
    )
    expect(serialized).not.toContain('super-secret-value')
  })

  it('prefers the ephemeral secret over a static pair when both are set', () => {
    const servers = buildIceServers({
      turnUrls: 'turn:turn.example:3478',
      turnSecret: 's3cret',
      turnUsername: 'static-user',
      turnCredential: 'static-pass',
      nowMs: NOW,
    })
    expect(servers[0].username).not.toBe('static-user')
  })

  it('falls back to a static pair when there is no secret', () => {
    // Not every TURN deployment offers the REST scheme.
    const servers = buildIceServers({
      turnUrls: 'turn:turn.example:3478',
      turnUsername: 'static-user',
      turnCredential: 'static-pass',
      nowMs: NOW,
    })
    expect(servers[0]).toEqual({
      urls: ['turn:turn.example:3478'],
      username: 'static-user',
      credential: 'static-pass',
    })
  })

  it('drops TURN entirely when it has no credentials, keeping STUN usable', () => {
    // TURN URLs with no way to authenticate is a misconfiguration. Emitting it
    // would hand the browser an endpoint every candidate fails against, and the
    // ICE failure would look like the network problem this is meant to fix.
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const servers = buildIceServers({
      stunUrls: 'stun:stun.example:3478',
      turnUrls: 'turn:turn.example:3478',
      nowMs: NOW,
    })
    expect(servers).toEqual([{ urls: ['stun:stun.example:3478'] }])
    expect(warn).toHaveBeenCalled()
  })

  it('requires both halves of a static pair', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(
      buildIceServers({
        turnUrls: 'turn:turn.example:3478',
        turnUsername: 'static-user',
        nowMs: NOW,
      }),
    ).toEqual([])
    expect(warn).toHaveBeenCalled()
  })
})
