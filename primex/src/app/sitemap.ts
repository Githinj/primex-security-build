import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-url";

// Only public, indexable pages. Excludes /reset-password (noindex) and every
// authenticated route.
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/request-access`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/login`, changeFrequency: "monthly", priority: 0.5 },
  ];
}
