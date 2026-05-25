import type { Metadata } from "next";
import Link from "next/link";
import { getEditorialPage } from "@/lib/strapi";
import { EDITORIAL_FALLBACK } from "@/lib/editorial-fallback";
import { EDITORIAL_FALLBACK_EN } from "@/lib/editorial-fallback-en";
import { BlocksRenderer } from "@strapi/blocks-react-renderer";
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
import { DEFAULT_LOCALE_CODE, type Locale } from "@/lib/locale";

interface EditorialChrome {
  homeLabel: string;
  backToHome: string;
  lastUpdatedPrefix: string;
}

const CHROME: Record<Locale, EditorialChrome> = {
  ro: {
    homeLabel: "Acasă",
    backToHome: "← Înapoi la pagina principală",
    lastUpdatedPrefix: "Ultima actualizare:",
  },
  en: {
    homeLabel: "Home",
    backToHome: "← Back to the home page",
    lastUpdatedPrefix: "Last updated:",
  },
};

function pickFallback(
  slug: EditorialPageSlug,
  locale: Locale,
): EditorialPage {
  if (locale === "en") {
    const en = EDITORIAL_FALLBACK_EN[slug];
    if (en) return en;
  }
  return EDITORIAL_FALLBACK[slug];
}

/**
 * Server-side loader: prefer the CMS entry, fall back to the build-time
 * copy. Errors are logged but never thrown — a stale CMS must never take a
 * legal/editorial page offline.
 */
async function loadPage(
  slug: EditorialPageSlug,
  locale: Locale,
): Promise<EditorialPage> {
  try {
    const cms = await getEditorialPage(slug, locale);
    if (cms) return cms;
  } catch (error) {
    logger.error(`page/${slug}`, "CMS fetch failed", error);
  }
  return pickFallback(slug, locale);
}

interface EditorialMetadataOptions {
  /** Override `/${slug}` when the route URL differs from the slug (e.g. `/donate` for EN). */
  path?: string;
  locale?: Locale;
}

/**
 * Returns a `generateMetadata` function bound to a slug. Each route file
 * exports `export const generateMetadata = makeEditorialMetadata("foo")`.
 *
 * For locale-specific routes, pass `{ locale, path }` so the canonical URL
 * and fallback copy match the URL the user actually visits.
 *
 * Sets the canonical URL so the metadataBase resolves OG / Twitter card
 * images against the right host.
 */
export function makeEditorialMetadata(
  slug: EditorialPageSlug,
  options: EditorialMetadataOptions = {},
) {
  const locale = options.locale ?? DEFAULT_LOCALE_CODE;
  const path = options.path ?? `/${slug}`;
  return async function generateMetadata(): Promise<Metadata> {
    const page = await loadPage(slug, locale);
    const canonical = makeCanonical(path);
    // CMS `seo.metaTitle` is authoritative when set; otherwise the page
    // title. pageTitle() still guarantees no double-branding either way.
    const ogTitle = page.seo.metaTitle ?? page.title;
    const description = page.seo.metaDescription;
    return {
      title: pageTitle(ogTitle),
      description,
      alternates: { canonical },
      openGraph: {
        title: ogTitle,
        description,
        url: canonical,
      },
      twitter: {
        title: ogTitle,
        description,
      },
    };
  };
}

interface EditorialPageViewProps {
  slug: EditorialPageSlug;
  /** Locale for fetching + chrome strings. Defaults to `ro`. */
  locale?: Locale;
  /** Route path for the breadcrumb (defaults to `/${slug}`). */
  path?: string;
  /** Optional content rendered after the article body — e.g. a CTA. */
  footerSlot?: React.ReactNode;
  /**
   * Optional sidebar rendered next to the article. When present the page
   * switches to a 2-column grid on desktop (sticky aside) and stacks the
   * aside below the article on mobile. Used by the donate pages to host
   * the Stripe Buy Button card.
   */
  asideSlot?: React.ReactNode;
}

/**
 * The shared body for all editorial pages (privacy, terms, about,
 * pentru-transportatori, doneaza, donate). Each route file's default export is
 * a thin wrapper: `<EditorialPageView slug="…" />`.
 *
 * The component emits a `BreadcrumbList` JSON-LD entity per page, plus a
 * `Service` snippet for `pentru-transportatori`. The root layout already
 * emits `Organization` + `WebSite`, so search engines see the full entity
 * graph as one coherent model.
 */
export async function EditorialPageView({
  slug,
  locale = DEFAULT_LOCALE_CODE,
  path,
  footerSlot,
  asideSlot,
}: EditorialPageViewProps) {
  const page = await loadPage(slug, locale);
  const chrome = CHROME[locale];
  const routePath = path ?? `/${slug}`;
  const things: unknown[] = [
    buildBreadcrumbList([
      { name: chrome.homeLabel, path: "/" },
      { name: page.title, path: routePath },
    ]),
  ];
  if (slug === "pentru-transportatori") {
    things.push(loadJsonLdSnippet("service-transporters"));
  }

  const article = (
    <article>
      <h1 className="serif">{page.title}</h1>
      <p className="legal-meta">
        {chrome.lastUpdatedPrefix} {page.lastUpdated}.
      </p>

      {page.body.format === "blocks" ? (
        <BlocksRenderer content={page.body.blocks} />
      ) : (
        <MarkdownText>{page.body.markdown}</MarkdownText>
      )}

      {footerSlot}

      <p>
        <Link href="/">{chrome.backToHome}</Link>
      </p>
    </article>
  );

  const mainClass = asideSlot
    ? "legal-page legal-page--with-aside"
    : "legal-page";

  return (
    <main className={mainClass}>
      <JsonLd data={buildGraph(things as never)} />
      {asideSlot ? (
        <div className="legal-grid">
          {article}
          <aside className="legal-aside">{asideSlot}</aside>
        </div>
      ) : (
        article
      )}
    </main>
  );
}
