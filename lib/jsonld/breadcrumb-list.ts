import type { BreadcrumbList } from "schema-dts";
import { makeCanonical } from "@/lib/seo";

export interface BreadcrumbItem {
  /** Display name of the breadcrumb step. */
  name: string;
  /** Site-relative path. The function resolves it to an absolute URL. */
  path: string;
}

/**
 * Builds a Schema.org `BreadcrumbList`. Used on editorial pages so
 * Google can show "Home › Despre proiect" in the SERP.
 */
export function buildBreadcrumbList(items: BreadcrumbItem[]): BreadcrumbList {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      item: makeCanonical(item.path),
    })),
  };
}
