/**
 * Carry the Ant Media play token onto every HLS request (SEC-183).
 *
 * `getStreamToken()` returns `.../{streamId}.m3u8?token={tokenId}` and the player
 * hands that to `hls.loadSource()`. hls.js then resolves the segment URIs inside
 * the manifest *relative to the manifest URL*, and relative resolution keeps the
 * path while discarding the query string — so every `.ts` request goes out with
 * no token. With token control enabled on the app, which is the configuration
 * SEC-178 requires, AMS answers those 403 and the fallback that exists to rescue
 * a failed WebRTC connection fails too.
 *
 * The manifest arriving fine is what makes this hard to spot: playback starts,
 * then dies on the first segment.
 */

/**
 * Add `token` to `url` unless it already carries one.
 *
 * `base` is the manifest URL, needed because hls.js hands the loader absolute
 * URLs but a relative one is not worth crashing over.
 */
export function withStreamToken(url: string, token: string | null, base?: string): string {
  if (!token) return url

  let parsed: URL
  try {
    parsed = new URL(url, base)
  } catch {
    // Not resolvable to an absolute URL — hand it back untouched rather than
    // corrupting a request we don't understand.
    return url
  }

  // Never overwrite: the manifest URL already has the token, and re-appending
  // would produce `?token=a&token=b`, where AMS reads the first.
  if (parsed.searchParams.has('token')) return url

  parsed.searchParams.set('token', token)
  return parsed.toString()
}

/**
 * The same URL with any `token` stripped — a stable identity for a stream that
 * does not change when the token is refreshed (SEC-191).
 *
 * The player's effect keyed on `hlsUrl` and `token`, both of which change on
 * every refresh under Enterprise, so a healthy stream was torn down and rebuilt
 * roughly every 55 minutes. Keying on this instead means the effect re-runs only
 * when the stream genuinely changes.
 */
export function withoutStreamToken(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url)
    parsed.searchParams.delete('token')
    return parsed.toString()
  } catch {
    return url
  }
}
