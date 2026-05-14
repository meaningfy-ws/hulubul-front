import type { Thing, WithContext } from "schema-dts";

/**
 * Wraps any number of Schema.org entities in a single JSON-LD document
 * using the `@graph` pattern. One `<script type="application/ld+json">`
 * tag per page; multiple entities inside.
 *
 * Why the `@graph` pattern: it lets us emit one JSON-LD block per page
 * containing many connected entities (Organization + Service + FAQPage
 * etc.) so Google sees them as one coherent entity model rather than
 * isolated documents.
 */
export function buildGraph(things: Thing[]): WithContext<Thing> & {
  "@graph": Thing[];
} {
  return {
    "@context": "https://schema.org",
    "@graph": things,
  } as WithContext<Thing> & { "@graph": Thing[] };
}
