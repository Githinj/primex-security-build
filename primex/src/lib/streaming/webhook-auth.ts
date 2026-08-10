import { createHash, timingSafeEqual } from 'node:crypto'

/**
 * Authentication for `POST /api/webhooks/antmedia` — the app's only
 * unauthenticated, service-role-writing (RLS-bypassing) entry point.
 *
 * **Why the secret still rides in the URL.** SEC-187 asked for an HMAC over the
 * raw body plus a signed timestamp, the way the Stripe webhook works. Ant Media
 * cannot do that. A listener hook is configured as a bare `listenerHookURL` —
 * app-wide in `red5-web.properties` or per-broadcast on the Broadcast object —
 * and AMS exposes no facility for custom headers, a signing secret, or a
 * timestamp. Verified against the live server: `listenerHookURL` is the only
 * hook-related field on a broadcast. So the URL *is* the credential, and
 * deleting the query-string fallback — the issue's third bullet — would leave an
 * endpoint AMS can never authenticate against.
 *
 * What follows from that:
 *
 * * The secret will appear in AMS's logs, any proxy access log, and Vercel's
 *   request logs. That is inherent to a capability URL, so treat it as one:
 *   use a long random value and rotate it by editing the hook URL, not by
 *   hoping it stayed private.
 * * Replay is not preventable here — nothing in the body is signed or dated, so
 *   a captured request stays valid until the secret changes.
 * * `ANTMEDIA_WEBHOOK_ALLOWED_IPS` is the compensating control. The AMS droplet
 *   has a fixed address, so a leaked URL alone is not enough to write to this
 *   endpoint. It is a second factor, not a replacement for the secret.
 *
 * A reverse proxy in front of AMS that adds a real HMAC is the only way to get
 * body integrity, and that is infrastructure rather than app code.
 */

/** Fixed-length digests, so the comparison can't leak length either. */
function digest(value: string): Buffer {
  return createHash('sha256').update(value, 'utf8').digest()
}

/**
 * Constant-time secret comparison.
 *
 * Fails closed on an unset expectation: an unconfigured deployment must reject
 * every delivery rather than accept the empty string, which is what `!==`
 * against `undefined` did by accident rather than on purpose.
 */
export function secretMatches(
  presented: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!expected || !presented) return false
  return timingSafeEqual(digest(presented), digest(expected))
}

/**
 * First entry of `X-Forwarded-For` — on Vercel that is the originating client;
 * everything after it is proxy hops.
 */
export function clientIp(forwardedFor: string | null | undefined): string | null {
  const first = forwardedFor?.split(',')[0]?.trim()
  return first || null
}

/**
 * Exact-match IP allowlist, comma-separated.
 *
 * Unset means "not configured" and passes — the secret then stands alone, which
 * is the state every existing deployment is in. Configured-but-unmatched is a
 * rejection, including when the address is unknown: a request that arrives with
 * no forwarded-for is not from the droplet.
 */
export function ipAllowed(
  forwardedFor: string | null | undefined,
  allowList: string | null | undefined,
): boolean {
  const allowed = (allowList ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
  if (allowed.length === 0) return true

  const ip = clientIp(forwardedFor)
  return ip !== null && allowed.includes(ip)
}

export type WebhookAuthFailure = 'not-configured' | 'forbidden-ip' | 'bad-secret'

export type WebhookAuthResult = { ok: true } | { ok: false; reason: WebhookAuthFailure }

/**
 * Decide whether a delivery may write. The caller returns one uniform 401 for
 * every failure — the reason is for our logs, not for the sender, so a scanner
 * can't learn which factor it failed.
 */
export function authenticateWebhook(input: {
  headerSecret: string | null | undefined
  /** Where AMS actually puts it; see the note at the top of this file. */
  querySecret: string | null | undefined
  expectedSecret: string | null | undefined
  forwardedFor: string | null | undefined
  allowList: string | null | undefined
}): WebhookAuthResult {
  if (!input.expectedSecret) return { ok: false, reason: 'not-configured' }
  if (!ipAllowed(input.forwardedFor, input.allowList)) {
    return { ok: false, reason: 'forbidden-ip' }
  }

  // Header first: AMS won't send one, but anything we put in front of it can,
  // and that is the channel that keeps the secret out of access logs.
  const presented = input.headerSecret || input.querySecret
  if (!secretMatches(presented, input.expectedSecret)) {
    return { ok: false, reason: 'bad-secret' }
  }

  return { ok: true }
}
