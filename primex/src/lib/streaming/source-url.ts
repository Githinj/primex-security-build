/**
 * Validation for operator-supplied RTSP pull sources (SEC-193).
 *
 * `createStreamSource()` hands a URL to Ant Media and tells it to connect out and
 * republish whatever answers as a viewable WebRTC/HLS stream. That is a
 * request-forgery primitive with a *visible output channel*, and it reaches the
 * droplet's network — which the app itself cannot reach — so the `super_admin`
 * role check is guarding a different boundary than the one at risk.
 *
 * **Why private ranges are not simply blocked.** The issue asked to reject
 * RFC1918 outright. That would break the product's main deployment: site cameras
 * are pulled across a WireGuard/Tailscale tunnel (SEC-197/199), so their
 * addresses are `192.168.x.x`, `10.x.x.x`, or Tailscale's `100.64/10` by design.
 * Blocking those would take every real customer site offline to close a
 * hypothetical.
 *
 * So the split is by what can never be a camera:
 *
 * * **Always denied** — loopback, link-local (which is where the cloud metadata
 *   endpoint `169.254.169.254` lives, the actual prize here), the unspecified
 *   address, and multicast. No camera is ever at one of these, and the metadata
 *   endpoint is the one target that turns this into credential theft.
 * * **Private ranges** — allowed, because that is where the cameras are, unless
 *   `ANTMEDIA_SOURCE_ALLOWED_CIDRS` is set, in which case they must match it.
 *   That gives a deployment which knows its tunnel subnets a way to lock this
 *   down to exactly them.
 *
 * **What this does not fix:** AMS resolves the hostname itself, so a name that
 * answers publicly here and privately there (DNS rebinding) is still possible.
 * Closing that needs an IP literal or an egress policy on the droplet.
 */

export type HostCategory =
  | 'loopback'
  | 'link-local'
  | 'unspecified'
  | 'multicast'
  | 'private'
  | 'public'

/** Categories that are never a camera and are always refused. */
const ALWAYS_DENIED: ReadonlySet<HostCategory> = new Set([
  'loopback',
  'link-local',
  'unspecified',
  'multicast',
])

function ipv4Octets(ip: string): number[] | null {
  const parts = ip.split('.')
  if (parts.length !== 4) return null
  const octets = parts.map((part) => (/^\d{1,3}$/.test(part) ? Number(part) : Number.NaN))
  return octets.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) ? octets : null
}

/** IPv4 dotted quad → unsigned 32-bit, or null when it isn't one. */
export function ipv4ToInt(ip: string): number | null {
  const octets = ipv4Octets(ip)
  if (!octets) return null
  return ((octets[0] << 24) >>> 0) + (octets[1] << 16) + (octets[2] << 8) + octets[3]
}

/**
 * Classify an address literal. Unrecognised input is treated as `public` — this
 * is not the place to reject malformed input, and calling something unknown
 * "private" would silently widen what the allowlist has to cover.
 */
export function categorizeIp(ip: string): HostCategory {
  const address = ip.trim().toLowerCase().replace(/^\[|\]$/g, '')

  const octets = ipv4Octets(address)
  if (octets) {
    const [a, b] = octets
    if (a === 0) return 'unspecified'
    if (a === 127) return 'loopback'
    if (a === 169 && b === 254) return 'link-local' // includes 169.254.169.254
    if (a >= 224 && a <= 239) return 'multicast'
    if (a === 10) return 'private'
    if (a === 172 && b >= 16 && b <= 31) return 'private'
    if (a === 192 && b === 168) return 'private'
    if (a === 100 && b >= 64 && b <= 127) return 'private' // CGNAT — Tailscale
    return 'public'
  }

  // IPv6. Only the well-known prefixes matter here; anything else is public.
  if (address === '::' ) return 'unspecified'
  if (address === '::1') return 'loopback'
  if (address.startsWith('fe80:')) return 'link-local'
  if (address.startsWith('ff')) return 'multicast'
  // fc00::/7 — unique local, the IPv6 analogue of RFC1918.
  if (/^f[cd]/.test(address)) return 'private'
  // IPv4-mapped (::ffff:10.0.0.1) — classify by the embedded address.
  const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (mapped) return categorizeIp(mapped[1])
  return 'public'
}

/** Does `ip` fall inside `cidr` (IPv4 only; IPv6 entries match exactly). */
export function ipMatchesCidr(ip: string, cidr: string): boolean {
  const entry = cidr.trim()
  if (!entry) return false

  const [network, bitsRaw] = entry.split('/')
  const target = ipv4ToInt(ip)
  const base = ipv4ToInt(network)

  if (target === null || base === null) {
    // Not IPv4 on one side or the other — fall back to an exact literal match so
    // an IPv6 tunnel address can still be allowlisted.
    return ip.trim().toLowerCase() === network.trim().toLowerCase() && !bitsRaw
  }

  if (bitsRaw === undefined) return target === base

  const bits = Number(bitsRaw)
  if (!Number.isInteger(bits) || bits < 0 || bits > 32) return false
  if (bits === 0) return true

  const mask = (0xffffffff << (32 - bits)) >>> 0
  return (target & mask) >>> 0 === (base & mask) >>> 0
}

/** True when the host is an address literal rather than a name needing DNS. */
export function isIpLiteral(host: string): boolean {
  const address = host.trim().replace(/^\[|\]$/g, '')
  if (ipv4ToInt(address) !== null) return true
  // Any colon means IPv6 — a hostname can't contain one.
  return address.includes(':')
}

export type SourceHostVerdict =
  | { allowed: true }
  | { allowed: false; category: HostCategory; reason: string }

/**
 * Decide whether Ant Media may be pointed at this resolved address.
 *
 * `allowedCidrs` is the comma-separated `ANTMEDIA_SOURCE_ALLOWED_CIDRS`. Unset
 * means private addresses pass, since that is where site cameras live.
 */
export function checkSourceAddress(
  ip: string,
  allowedCidrs?: string | null,
): SourceHostVerdict {
  const category = categorizeIp(ip)

  if (ALWAYS_DENIED.has(category)) {
    return {
      allowed: false,
      category,
      reason: `${ip} is a ${category} address — no camera lives there, and pointing Ant Media at it would let it read the droplet's own network.`,
    }
  }

  const allowed = (allowedCidrs ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)

  // An allowlist constrains private targets only. A public camera is reachable
  // from anywhere and gains nothing from being enumerated here.
  if (category === 'private' && allowed.length > 0) {
    const permitted = allowed.some((cidr) => ipMatchesCidr(ip, cidr))
    if (!permitted) {
      return {
        allowed: false,
        category,
        reason: `${ip} is a private address outside ANTMEDIA_SOURCE_ALLOWED_CIDRS.`,
      }
    }
  }

  return { allowed: true }
}

export type ParsedSourceUrl =
  | { ok: true; hostname: string; url: URL }
  | { ok: false; error: string }

/**
 * Parse and sanity-check the RTSP URL before anything is resolved.
 *
 * The scheme test the action used to do on its own (`/^rtsps?:\/\//i`) passes
 * strings that are not URLs at all, so parse properly and pull the hostname out
 * rather than substring-matching it later.
 */
export function parseSourceUrl(raw: string): ParsedSourceUrl {
  const trimmed = raw.trim()
  if (!/^rtsps?:\/\//i.test(trimmed)) {
    return { ok: false, error: 'Source URL must be an rtsp:// or rtsps:// address.' }
  }

  let url: URL
  try {
    url = new URL(trimmed)
  } catch {
    return { ok: false, error: 'Source URL is not a valid URL.' }
  }

  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  if (!hostname) return { ok: false, error: 'Source URL has no host.' }

  return { ok: true, hostname, url }
}
