import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * SITE_URL is computed at module load, so each case needs a fresh import with the
 * environment already in place.
 */
async function loadSiteUrl(env: Record<string, string | undefined>) {
  vi.resetModules()
  for (const [key, value] of Object.entries(env)) {
    if (value === undefined) vi.stubEnv(key, '')
    else vi.stubEnv(key, value)
  }
  const mod = await import('./site-url')
  return mod.SITE_URL
}

beforeEach(() => {
  vi.unstubAllEnvs()
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('SITE_URL', () => {
  it('prefers an explicit NEXT_PUBLIC_SITE_URL', async () => {
    expect(
      await loadSiteUrl({
        NEXT_PUBLIC_SITE_URL: 'https://primex.example',
        VERCEL_PROJECT_PRODUCTION_URL: 'ignored.vercel.app',
      }),
    ).toBe('https://primex.example')
  })

  it("falls back to Vercel's production hostname, with a scheme added", async () => {
    // The whole point of this fallback: it is correct by construction rather
    // than by someone remembering to set a variable. Vercel supplies a bare
    // host, so a missing https:// would produce a relative URL downstream.
    expect(
      await loadSiteUrl({
        NEXT_PUBLIC_SITE_URL: undefined,
        VERCEL_PROJECT_PRODUCTION_URL: 'primex-security-build-oevg.vercel.app',
      }),
    ).toBe('https://primex-security-build-oevg.vercel.app')
  })

  it('falls back to localhost, never to a guessed public domain', async () => {
    // The regression this guards (SEC-152): the old fallback was a hardcoded
    // vercel.app host that did not exist. With NEXT_PUBLIC_SITE_URL unset in
    // production, robots.txt and sitemap.xml advertised a dead domain and any
    // camera provisioned through the app got a listenerHookURL Ant Media could
    // never reach — silent in every case. An obviously-local default fails
    // loudly in development instead.
    const url = await loadSiteUrl({
      NEXT_PUBLIC_SITE_URL: undefined,
      VERCEL_PROJECT_PRODUCTION_URL: undefined,
    })
    expect(url).toBe('http://localhost:3000')
    expect(url).not.toContain('vercel.app')
  })

  it('always yields an absolute origin', async () => {
    for (const env of [
      { NEXT_PUBLIC_SITE_URL: 'https://a.example', VERCEL_PROJECT_PRODUCTION_URL: undefined },
      { NEXT_PUBLIC_SITE_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: 'b.vercel.app' },
      { NEXT_PUBLIC_SITE_URL: undefined, VERCEL_PROJECT_PRODUCTION_URL: undefined },
    ]) {
      const url = await loadSiteUrl(env)
      expect(() => new URL(url)).not.toThrow()
      expect(url).toMatch(/^https?:\/\//)
    }
  })
})
