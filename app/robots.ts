import type { MetadataRoute } from "next";
import { BLOCKED_ROUTE_PREFIXES, makeCanonical } from "@/lib/seo";

/**
 * Generates `https://hulubul.com/robots.txt`.
 *
 * The deny-list mirrors `BLOCKED_ROUTE_PREFIXES` from `lib/seo.ts` so
 * one place defines what crawlers should skip. Per-page `noindex`
 * metadata still applies as defense in depth.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [...BLOCKED_ROUTE_PREFIXES],
    },
    sitemap: makeCanonical("/sitemap.xml"),
  };
}
