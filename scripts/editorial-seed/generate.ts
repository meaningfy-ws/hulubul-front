/**
 * Generates `docs/specs/editorial-seed.blocks.json` — the four editorial
 * pages as Strapi 5 import records (ro locale), body converted from the
 * `lib/editorial-fallback.ts` Markdown to Blocks.
 *
 * Run: `node scripts/editorial-seed/generate.ts` (Node ≥ 23 strips TS).
 * Reproducible — re-run whenever the fallback copy changes.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { EDITORIAL_FALLBACK } from "../../lib/editorial-fallback.ts";
import { mdToBlocks } from "./md-to-blocks.ts";

const RO_MONTHS = [
  "ianuarie", "februarie", "martie", "aprilie", "mai", "iunie",
  "iulie", "august", "septembrie", "octombrie", "noiembrie", "decembrie",
];

/** "23 aprilie 2026" → "2026-04-23" (Strapi `date` field). */
function toIso(display: string): string {
  const m = display.trim().toLowerCase().match(/^(\d{1,2})\s+([a-zăâîșț]+)\s+(\d{4})$/);
  if (!m) throw new Error(`Unparseable lastUpdated: "${display}"`);
  const day = m[1]!.padStart(2, "0");
  const month = RO_MONTHS.indexOf(m[2]!);
  if (month < 0) throw new Error(`Unknown RO month: "${m[2]}"`);
  return `${m[3]}-${String(month + 1).padStart(2, "0")}-${day}`;
}

const records = Object.values(EDITORIAL_FALLBACK).map((p) => {
  if (p.body.format !== "markdown") {
    throw new Error(`${p.slug}: expected markdown fallback body`);
  }
  return {
    slug: p.slug,
    locale: "ro",
    title: p.title,
    lastUpdated: toIso(p.lastUpdated),
    seo: {
      // No brand suffix — the frontend's pageTitle() brands it.
      metaTitle: p.title,
      metaDescription: p.seo.metaDescription ?? "",
    },
    body: mdToBlocks(p.body.markdown),
  };
});

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "../../docs/specs/editorial-seed.blocks.json");
mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(records, null, 2) + "\n", "utf8");
console.log(
  `Wrote ${records.length} pages → docs/specs/editorial-seed.blocks.json`,
);
for (const r of records) {
  console.log(`  ${r.slug}: ${r.body.length} blocks, lastUpdated=${r.lastUpdated}`);
}
