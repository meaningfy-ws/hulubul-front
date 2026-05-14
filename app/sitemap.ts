import type { MetadataRoute } from "next";
import { INDEXABLE_ROUTES, makeCanonical } from "@/lib/seo";

/**
 * Generates `https://hulubul.com/sitemap.xml` at build time.
 *
 * Static for now — `lastModified` is the build time. When CMS-backed
 * pages need per-entry timestamps (e.g. editorial pages updated by an
 * editor), this can be made `async` and fetch from Strapi without
 * touching consumers.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return INDEXABLE_ROUTES.map((route) => ({
    url: makeCanonical(route.path),
    lastModified: now,
    changeFrequency: route.changeFrequency,
    priority: route.priority,
  }));
}
