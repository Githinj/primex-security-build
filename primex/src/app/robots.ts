import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Authenticated app areas — mirror PROTECTED_PREFIXES in src/middleware.ts.
// These redirect to /login when unauthenticated, so there is nothing to index.
const PROTECTED_PATHS = [
  "/dashboard",
  "/alerts",
  "/incidents",
  "/sites",
  "/cameras",
  "/guards",
  "/companies",
  "/reports",
  "/team",
  "/settings",
  "/audit",
  "/dispatcher",
  "/guard",
  "/manager",
  "/portal",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // /reset-password is intentionally omitted: it carries a noindex meta and
      // must stay crawlable for that to be honored.
      disallow: [...PROTECTED_PATHS, "/api/", "/callback"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
