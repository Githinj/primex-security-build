/**
 * Canonical public origin for the app. Used for metadataBase, canonical URLs,
 * robots.txt, and sitemap. Mirrors the fallback used in notify.ts and auth.ts.
 */
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || "https://primex-security-build.vercel.app";
