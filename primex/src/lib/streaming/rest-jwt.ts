import crypto from 'crypto'

/**
 * The per-request JWT Ant Media Enterprise's REST filter expects.
 *
 * `ANTMEDIA_API_KEY` is the shared HS256 signing secret (AMS `jwtSecretKey`),
 * not a token — sending it verbatim returns 403 "Invalid App JWT Token". AMS
 * checks only the signature and `exp`, so no other claims are set.
 *
 * **This format is implemented twice, in two languages** — here and in
 * `ai_worker/antmedia_jwt.py` — because the Python worker hits the same REST API
 * with the same secret. They were kept in step by comments in both files and
 * nothing else. A whitespace change on either side breaks Enterprise auth in
 * production, and the failure mode is a 403 that looks exactly like the IP
 * allowlist problem already documented in the deploy notes, so it would be
 * misdiagnosed (SEC-188).
 *
 * `fixtures/antmedia-rest-jwt.json` pins one (secret, exp) → token pair, and both
 * test suites assert against it. That single fixture is what makes the "keep the
 * two in step" comments enforceable rather than aspirational.
 *
 * Split out of `streaming.ts` so the expiry can be passed in: a `'use server'`
 * module can only export async functions, which makes a signer that computes its
 * own clock impossible to pin down in a test.
 */

export const REST_JWT_TTL_S = 60

const b64url = (value: string | Buffer): string =>
  Buffer.from(value as never, typeof value === 'string' ? 'utf8' : undefined).toString(
    'base64url',
  )

/** Sign a token that expires at `expSeconds` (unix seconds). */
export function signRestJwt(secret: string, expSeconds: number): string {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = b64url(JSON.stringify({ exp: expSeconds }))
  const signingInput = `${header}.${payload}`
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput, 'utf8')
    .digest('base64url')
  return `${signingInput}.${signature}`
}

/** Expiry for a token minted now. Separated so callers stay testable. */
export function restJwtExpiry(nowMs: number, ttlSeconds: number = REST_JWT_TTL_S): number {
  return Math.floor(nowMs / 1000) + ttlSeconds
}
