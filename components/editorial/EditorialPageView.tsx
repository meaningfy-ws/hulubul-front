import type { Metadata } from "next";
import Link from "next/link";
import { getEditorialPage } from "@/lib/strapi";
import { EDITORIAL_FALLBACK } from "@/lib/editorial-fallback";
import { MarkdownText } from "@/components/landing/MarkdownText";
import { JsonLd } from "@/components/seo/JsonLd";
import { logger } from "@/lib/logger";
import { makeCanonical, pageTitle } from "@/lib/seo";
import {
  buildBreadcrumbList,
  buildGraph,
  loadJsonLdSnippet,
} from "@/lib/jsonld/builders";
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
 *
 * Sets the canonical URL so the metadataBase resolves OG / Twitter
 * card images against the right host.
 */
export function makeEditorialMetadata(slug: EditorialPageSlug) {
  return async function generateMetadata(): Promise<Metadata> {
    const page = await loadPage(slug);
    const canonical = makeCanonical(`/${slug}`);
    return {
      title: pageTitle(page.title),
      description: page.metaDescription,
      alternates: { canonical },
      openGraph: {
        title: page.title,
        description: page.metaDescription,
        url: canonical,
      },
      twitter: {
        title: page.title,
        description: page.metaDescription,
      },
    };
  };
}

/**
 * The shared body for all editorial pages (privacy, terms, about,
 * pentru-transportatori). Each route file's default export is a thin
 * wrapper: `<EditorialPageView slug="…" />`.
 *
 * The component emits two JSON-LD entities per page:
 *   1. A `BreadcrumbList` (Home → this page).
 *   2. For `pentru-transportatori`, the transporter `Service` snippet.
 *
 * The root layout already emits `Organization` + `WebSite`, so search
 * engines see the full entity graph as one coherent model.
 */
export async function EditorialPageView({
  slug,
}: {
  slug: EditorialPageSlug;
}) {
  const page = await loadPage(slug);
  const things: unknown[] = [
    buildBreadcrumbList([
      { name: "Acasă", path: "/" },
      { name: page.title, path: `/${slug}` },
    ]),
  ];
  if (slug === "pentru-transportatori") {
    things.push(loadJsonLdSnippet("service-transporters"));
  }

  return (
    <main className="legal-page">
      <JsonLd data={buildGraph(things as never)} />
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
