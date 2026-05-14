import type { Metadata } from "next";
import Link from "next/link";
import { getEditorialPage } from "@/lib/strapi";
import { EDITORIAL_FALLBACK } from "@/lib/editorial-fallback";
import { MarkdownText } from "@/components/landing/MarkdownText";
import { logger } from "@/lib/logger";
import type { EditorialPage, EditorialPageSlug } from "@/lib/types";

/**
 * Server-side loader: prefer the CMS entry, fall back to the build-time
 * copy in `lib/editorial-fallback.ts`. Errors are logged but never thrown
 * — a stale CMS must never take a legal page offline.
 */
async function loadPage(slug: EditorialPageSlug): Promise<EditorialPage> {
  try {
    const cms = await getEditorialPage(slug);
    if (cms) return cms;
  } catch (error) {
    logger.error(`page/${slug}`, "CMS fetch failed", error);
  }
  return EDITORIAL_FALLBACK[slug];
}

/**
 * Returns a `generateMetadata` function bound to a slug. Each route file
 * exports `export const generateMetadata = makeEditorialMetadata("foo")`.
 */
export function makeEditorialMetadata(slug: EditorialPageSlug) {
  return async function generateMetadata(): Promise<Metadata> {
    const page = await loadPage(slug);
    return { title: page.title, description: page.metaDescription };
  };
}

/**
 * The shared body for all editorial pages (privacy, terms, about). Each
 * route file's default export is a thin wrapper: `<EditorialPageView slug="…" />`.
 */
export async function EditorialPageView({
  slug,
}: {
  slug: EditorialPageSlug;
}) {
  const page = await loadPage(slug);
  return (
    <main className="legal-page">
      <article>
        <h1 className="serif">{page.title}</h1>
        <p className="legal-meta">Ultima actualizare: {page.lastUpdated}.</p>

        <MarkdownText>{page.body}</MarkdownText>

        <p>
          <Link href="/">← Înapoi la pagina principală</Link>
        </p>
      </article>
    </main>
  );
}
