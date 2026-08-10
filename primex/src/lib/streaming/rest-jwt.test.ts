import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { REST_JWT_TTL_S, restJwtExpiry, signRestJwt } from './rest-jwt'

const golden = JSON.parse(
  readFileSync(join(process.cwd(), 'fixtures', 'antmedia-rest-jwt.json'), 'utf8'),
) as { secret: string; exp: number; token: string }

describe('signRestJwt', () => {
  it('matches the golden fixture the Python worker also asserts', () => {
    // The point of this test (SEC-188). The same format is implemented in
    // ai_worker/antmedia_jwt.py, and the two were kept in step by comments
    // alone. If either drifts by one byte — a space in the JSON, base64 padding,
    // a claim added — Enterprise auth breaks in production with a 403 that looks
    // exactly like the documented IP-allowlist problem, so it gets misdiagnosed.
    //
    // If this fails, do NOT recompute the fixture to make it pass. Find which
    // side changed.
    expect(signRestJwt(golden.secret, golden.exp)).toBe(golden.token)
  })

  it('produces three base64url segments with no padding', () => {
    const parts = signRestJwt('secret', 1_760_000_060).split('.')
    expect(parts).toHaveLength(3)
    for (const part of parts) {
      // base64url, not base64: `+` and `/` would be mangled in a header value,
      // and `=` padding is not part of the JWT compact form.
      expect(part).toMatch(/^[A-Za-z0-9_-]+$/)
    }
  })

  it('encodes exactly the two claims AMS checks', () => {
    const [header, payload] = signRestJwt('secret', 1_760_000_060).split('.')
    const decode = (part: string) => JSON.parse(Buffer.from(part, 'base64url').toString())
    expect(decode(header)).toEqual({ alg: 'HS256', typ: 'JWT' })
    // Nothing else: an extra claim changes the payload and so the signature,
    // and would have to be added on the Python side in the same order.
    expect(decode(payload)).toEqual({ exp: 1_760_000_060 })
  })

  it('changes the signature when the secret changes', () => {
    expect(signRestJwt('a', golden.exp)).not.toBe(signRestJwt('b', golden.exp))
  })

  it('changes the token when the expiry changes', () => {
    expect(signRestJwt(golden.secret, golden.exp)).not.toBe(
      signRestJwt(golden.secret, golden.exp + 1),
    )
  })
})

describe('restJwtExpiry', () => {
  it('converts milliseconds to unix seconds and adds the TTL', () => {
    // The bug this shape prevents: passing milliseconds where AMS wants seconds
    // yields a date around the year 58,000 — a token that never expires. That
    // exact mistake was already made once with play tokens.
    expect(restJwtExpiry(1_760_000_000_000, 60)).toBe(1_760_000_060)
  })

  it('defaults to the shared 60-second TTL', () => {
    expect(restJwtExpiry(1_760_000_000_000)).toBe(1_760_000_000 + REST_JWT_TTL_S)
  })

  it('floors rather than rounds, so a token is never issued pre-dated', () => {
    expect(restJwtExpiry(1_760_000_000_999, 60)).toBe(1_760_000_060)
  })
})
