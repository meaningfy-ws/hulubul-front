// Drift guard: ensure every `page.tsx` under `app/(marketing)/` is either
// listed in INDEXABLE_ROUTES (so it ships in sitemap.xml) or matches one of
// BLOCKED_ROUTE_PREFIXES (intentionally excluded). Catches the common bug of
// adding a new marketing page and forgetting to register it for SEO.
//
// Admin routes and API route handlers are always out of scope by design.

import { describe, expect, it } from "vitest";
import { readdirSync, statSync, existsSync } from "node:fs";
import { join, relative } from "node:path";
import { INDEXABLE_ROUTES, BLOCKED_ROUTE_PREFIXES } from "@/lib/seo";

const ROOT = process.cwd();
const MARKETING_ROOT = join(ROOT, "app", "(marketing)");

function walkForPages(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walkForPages(p, acc);
    else if (name === "page.tsx" || name === "page.ts") acc.push(p);
  }
  return acc;
}

function pageFileToRoutePath(pageFile: string): string {
  // app/(marketing)/foo/bar/page.tsx → /foo/bar
  // app/(marketing)/page.tsx          → /
  const rel = relative(MARKETING_ROOT, pageFile).replace(
    /(^|\/)page\.tsx?$/,
    "",
  );
  if (rel === "") return "/";
  // Route groups in `(parens)` are ignored by Next.js — strip any nested.
  const stripped = rel
    .split("/")
    .filter((seg) => !/^\(.+\)$/.test(seg))
    .join("/");
  return "/" + stripped;
}

function isBlocked(route: string): boolean {
  return BLOCKED_ROUTE_PREFIXES.some((prefix) => {
    if (route.startsWith(prefix)) return true;
    // A prefix `/sondaj/` should also cover the bare `/sondaj` "index" route.
    if (prefix.endsWith("/") && route === prefix.slice(0, -1)) return true;
    return false;
  });
}

describe("Feature: sitemap drift guard", () => {
  it("every marketing page is either in INDEXABLE_ROUTES or matches BLOCKED_ROUTE_PREFIXES", () => {
    const pageFiles = walkForPages(MARKETING_ROOT);
    expect(pageFiles.length).toBeGreaterThan(0); // sanity: we found pages

    const indexedPaths = new Set(INDEXABLE_ROUTES.map((r) => r.path));
    const orphaned: { route: string; file: string }[] = [];

    for (const file of pageFiles) {
      const route = pageFileToRoutePath(file);
      const indexed = indexedPaths.has(route);
      if (!indexed && !isBlocked(route)) {
        orphaned.push({ route, file });
      }
    }

    expect(
      orphaned,
      `orphan marketing pages — add to lib/seo.ts INDEXABLE_ROUTES or BLOCKED_ROUTE_PREFIXES:\n${orphaned
        .map((o) => `  ${o.route}  (${relative(ROOT, o.file)})`)
        .join("\n")}`,
    ).toEqual([]);
  });
});
