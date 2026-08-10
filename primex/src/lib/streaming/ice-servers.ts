import crypto from 'crypto'

/**
 * ICE server configuration for the WebRTC player (SEC-184).
 *
 * `CameraPlayer` built its `WebRTCAdaptor` with no `peerconnection_config` at
 * all, so it used the adaptor's default public STUN server and no relay. STUN
 * only tells a peer its own public address; it cannot carry media. Any viewer
 * behind symmetric NAT — or on a guard station or corporate network that blocks
 * outbound UDP — therefore never completes an ICE connection. They wait out the
 * 10s timeout and silently drop to HLS, which adds seconds of latency to a live
 * security feed, and (until SEC-183) frequently failed outright.
 *
 * **Credentials are minted per request, not configured into the client.** A TURN
 * username/password shipped in a `NEXT_PUBLIC_` variable is readable by anyone
 * who loads the page, and a relay is bandwidth someone pays for. coturn's
 * `use-auth-secret` scheme exists for this: the username is an expiry timestamp,
 * the credential is an HMAC of it under a secret the browser never sees, and the
 * pair stops working on its own.
 */

/** Shape the adaptor wants. Declared here rather than using the DOM's
 *  `RTCIceServer` so this stays usable from server code. */
export type IceServer = {
  urls: string[]
  username?: string
  credential?: string
}

function splitUrls(value: string | null | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean)
}

/**
 * coturn REST credentials: `username = <unix expiry>:<label>`, and the
 * credential is base64(HMAC-SHA1(secret, username)). The label is not identity —
 * coturn ignores it — but it makes a `turnadmin` session listing legible.
 */
export function turnCredentials(
  secret: string,
  ttlSeconds: number,
  label: string,
  nowMs: number,
): { username: string; credential: string } {
  const expiry = Math.floor(nowMs / 1000) + ttlSeconds
  const username = `${expiry}:${label}`
  const credential = crypto.createHmac('sha1', secret).update(username).digest('base64')
  return { username, credential }
}

/**
 * Build the ICE server list for one viewer.
 *
 * Returns an empty list when nothing is configured, which is meaningfully
 * different from a broken one: the adaptor then falls back to its own default
 * and behaves exactly as it does today, so an unconfigured deployment is not
 * made worse by this.
 */
export function buildIceServers(config: {
  stunUrls?: string | null
  turnUrls?: string | null
  turnSecret?: string | null
  turnUsername?: string | null
  turnCredential?: string | null
  turnTtlSeconds?: number
  label?: string
  nowMs: number
}): IceServer[] {
  const servers: IceServer[] = []

  const stun = splitUrls(config.stunUrls)
  if (stun.length > 0) servers.push({ urls: stun })

  const turn = splitUrls(config.turnUrls)
  if (turn.length === 0) return servers

  if (config.turnSecret) {
    const { username, credential } = turnCredentials(
      config.turnSecret,
      config.turnTtlSeconds ?? 3600,
      config.label ?? 'primex',
      config.nowMs,
    )
    servers.push({ urls: turn, username, credential })
    return servers
  }

  // Static credentials — supported because not every TURN deployment offers the
  // REST scheme, but they are long-lived and reach the browser verbatim, so the
  // ephemeral path above is the one to prefer.
  if (config.turnUsername && config.turnCredential) {
    servers.push({
      urls: turn,
      username: config.turnUsername,
      credential: config.turnCredential,
    })
    return servers
  }

  // TURN URLs with no way to authenticate is a misconfiguration, not a relay.
  // Dropping it keeps the STUN entry usable instead of handing the browser an
  // endpoint every candidate will fail against.
  console.warn(
    'TURN URLs are set but no credentials are — set ANTMEDIA_TURN_SECRET (preferred) or a static username/credential pair.',
  )
  return servers
}
