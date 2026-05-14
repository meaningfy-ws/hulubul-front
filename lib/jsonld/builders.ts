/**
 * Barrel for the JSON-LD subsystem.
 *
 * Source-of-truth shape:
 *   lib/jsonld/snippets/<name>.jsonld   ← pure JSON-LD data, one file per
 *                                          Schema.org entity. Pasteable into
 *                                          validator.schema.org as-is.
 *   lib/jsonld/load.ts                  ← server-side `loadJsonLdSnippet` reader
 *   lib/jsonld/graph.ts                 ← `buildGraph` to combine multiple
 *                                          entities into one @graph document
 *   lib/jsonld/serialise.ts             ← script-tag-safe stringification
 *
 * Adding a new schema:
 * 1. Add `lib/jsonld/snippets/<name>.jsonld` with valid JSON-LD.
 * 2. Reference it from a page via `loadJsonLdSnippet("<name>")`.
 *
 * No TypeScript builder per schema — the snippet IS the source of truth.
 *
 * See `docs/specs/2026-05-14-seo-spec.md` §4.
 */

export { loadJsonLdSnippet } from "./load";
export { buildGraph } from "./graph";
export { serialiseJsonLd } from "./serialise";
export { buildFaqPage } from "./faq-page";
export { buildBreadcrumbList, type BreadcrumbItem } from "./breadcrumb-list";
