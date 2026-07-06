import { describe, it, expect } from 'vitest'
import { encodeRfc3986, encodeKeyPath, signedPlaybackUrl } from './presign'

describe('encodeRfc3986', () => {
  it('escapes the chars encodeURIComponent leaves alone', () => {
    expect(encodeRfc3986("a!'()*")).toBe('a%21%27%28%29%2A')
  })
  it('encodes slashes and spaces', () => {
    expect(encodeRfc3986('a/b c')).toBe('a%2Fb%20c')
  })
})

describe('encodeKeyPath', () => {
  it('preserves slashes between segments but encodes within them', () => {
    expect(encodeKeyPath('recordings/cam 1/clip.mp4')).toBe('recordings/cam%201/clip.mp4')
  })
})

describe('signedPlaybackUrl', () => {
  it('returns the URL unchanged when signing is not configured', () => {
    // No DO_SPACES_KEY/SECRET in the test env → graceful passthrough.
    const url = 'https://primex-recordings.sgp1.digitaloceanspaces.com/recordings/x.mp4'
    expect(signedPlaybackUrl(url)).toBe(url)
  })
})
