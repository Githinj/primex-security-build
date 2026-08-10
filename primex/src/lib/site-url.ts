/**
 * Canonical public origin for the app. Used for metadataBase, canonical URLs,
 * robots.txt, sitemap, Stripe redirect URLs, auth emails, and the
 * `listenerHookURL` handed to Ant Media at provisioning time.
 *
 * The order matters, and the reason is a bug this replaced (SEC-152): the only
 * fallback used to be a hardcoded `primex-security-build.vercel.app`, which is
 * not a deployment that exists. With `NEXT_PUBLIC_SITE_URL` unset in production —
 * which was the live state — every one of the consumers above silently pointed at
 * a dead domain. `robots.txt` and `sitemap.xml` advertised it to crawlers, and a
 * camera provisioned through the app would have been given a webhook URL Ant
 * Media could never reach, which is invisible until you wonder why no events
 * arrive.
 *
 * `VERCEL_PROJECT_PRODUCTION_URL` is injected by Vercel and is the project's
 * stable production hostname, so it is right by construction rather than by
 * someone remembering to set it. Note it is a bare host with no scheme.
 *
 * The literal stays last only so local tooling has something to resolve, and is
 * deliberately localhost: a wrong-but-plausible public URL is worse than an
 * obviously-local one, because it fails silently in production instead of
 * loudly in development.
 */
const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : undefined;

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || vercelProductionUrl || "http://localhost:3000";
