import { describe, it, expect } from 'vitest'
import { withStreamToken, withoutStreamToken } from './hls-token'

const MANIFEST = 'https://ams.example:5443/WebRTCAppEE/streams/cam-01.m3u8?token=abc123'

describe('withStreamToken', () => {
  it('adds the token to a segment URL that has none', () => {
    // The whole defect: hls.js resolves segment URIs relative to the manifest,
    // which keeps the path and drops the query string, so every .ts went out
    // tokenless and AMS answered 403 (SEC-183).
    expect(
      withStreamToken('https://ams.example:5443/WebRTCAppEE/streams/cam-01000.ts', 'abc123'),
    ).toBe('https://ams.example:5443/WebRTCAppEE/streams/cam-01000.ts?token=abc123')
  })

  it('resolves a relative segment URI against the manifest', () => {
    expect(withStreamToken('cam-01000.ts', 'abc123', MANIFEST)).toBe(
      'https://ams.example:5443/WebRTCAppEE/streams/cam-01000.ts?token=abc123',
    )
  })

  it('leaves an existing token alone', () => {
    // Re-appending yields ?token=a&token=b, and AMS reads the first — so a
    // refreshed token would be silently ignored in favour of the stale one.
    expect(withStreamToken(MANIFEST, 'newtoken')).toBe(MANIFEST)
  })

  it('preserves other query parameters', () => {
    const url = withStreamToken('https://ams.example/streams/x.ts?foo=bar', 'abc123')
    expect(new URL(url).searchParams.get('foo')).toBe('bar')
    expect(new URL(url).searchParams.get('token')).toBe('abc123')
  })

  it('percent-encodes a token with URL metacharacters', () => {
    const url = withStreamToken('https://ams.example/streams/x.ts', 'a+b/c=d')
    expect(new URL(url).searchParams.get('token')).toBe('a+b/c=d')
  })

  it.each([
    ['null', null],
    ['empty', ''],
  ])('returns the URL untouched when the token is %s', (_label, token) => {
    // Community Edition has no token API, so tokenless URLs are the normal case
    // there and must not gain a `?token=` of nothing.
    const url = 'https://ams.example/streams/x.ts'
    expect(withStreamToken(url, token)).toBe(url)
  })

  it('hands back an unparseable URL rather than corrupting it', () => {
    expect(withStreamToken('::not a url::', 'abc123')).toBe('::not a url::')
  })
})

describe('withoutStreamToken', () => {
  it('strips the token so the URL is stable across refreshes', () => {
    // This is the stream's identity for the player effect. If it changed on
    // refresh, a healthy stream would be torn down every ~55 minutes (SEC-191).
    expect(withoutStreamToken(MANIFEST)).toBe(
      'https://ams.example:5443/WebRTCAppEE/streams/cam-01.m3u8',
    )
  })

  it('produces the same identity for two different tokens on one stream', () => {
    const a = 'https://ams.example/streams/cam-01.m3u8?token=first'
    const b = 'https://ams.example/streams/cam-01.m3u8?token=second'
    expect(withoutStreamToken(a)).toBe(withoutStreamToken(b))
  })

  it('still distinguishes two different streams', () => {
    expect(withoutStreamToken('https://ams.example/streams/cam-01.m3u8?token=x')).not.toBe(
      withoutStreamToken('https://ams.example/streams/cam-02.m3u8?token=x'),
    )
  })

  it('keeps non-token parameters, which are part of the identity', () => {
    expect(withoutStreamToken('https://ams.example/x.m3u8?token=a&subscriberId=s1')).toBe(
      'https://ams.example/x.m3u8?subscriberId=s1',
    )
  })

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
  ])('returns null for %s', (_label, url) => {
    expect(withoutStreamToken(url)).toBeNull()
  })

  it('passes an unparseable URL through unchanged', () => {
    expect(withoutStreamToken('::not a url::')).toBe('::not a url::')
  })
})
