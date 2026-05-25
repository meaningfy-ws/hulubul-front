import type { Metadata } from "next";
import { getLandingPage, LandingPageNotPublishedError } from "@/lib/strapi";
import { logger } from "@/lib/logger";
import { makeCanonical, pageTitle } from "@/lib/seo";
import {
  buildFaqPage,
  buildGraph,
  loadJsonLdSnippet,
} from "@/lib/jsonld/builders";
import { JsonLd } from "@/components/seo/JsonLd";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Audience } from "@/components/landing/Audience";
import { Trust } from "@/components/landing/Trust";
import { Signup } from "@/components/landing/Signup";
import { Faq } from "@/components/landing/Faq";
// Nav and Footer are rendered by the root layout; every page gets them.

// The Signup section reads runtime env (lib/auth-env → getEnabledAuthProviders)
// to decide which provider buttons to render. Forcing dynamic rendering keeps
// that read at request time inside the running container; the previous
// `revalidate = 300` cached the build-time render forever, so the buttons
// (computed when env was empty during `next build`) never reached visitors.
export const dynamic = "force-dynamic";

async function tryGetLandingPage() {
  try {
    return { page: await getLandingPage(), empty: null as null };
  } catch (error) {
    if (error instanceof LandingPageNotPublishedError) {
      return { page: null, empty: "not-published" as const };
    }
    // Never fail the render over a transient backend issue; ISR will retry in 300s.
    logger.error("hulubul-front", "getLandingPage failed", error);
    return { page: null, empty: "backend-unavailable" as const };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await tryGetLandingPage();
  if (!page) return {};

  const { seo } = page;
  return {
    // pageTitle de-dupes the brand so the root title.template doesn't
    // render "hulubul.com — … — hulubul.com" when the CMS metaTitle
    // already leads with the brand.
    title: pageTitle(seo.metaTitle),
    description: seo.metaDescription,
    alternates: { canonical: makeCanonical("/") },
    openGraph: {
      title: seo.metaTitle,
      description: seo.metaDescription,
      locale: "ro_RO",
      url: makeCanonical("/"),
      images: seo.shareImage?.url ? [{ url: seo.shareImage.url }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: seo.metaTitle,
      description: seo.metaDescription,
      images: seo.shareImage?.url ? [seo.shareImage.url] : undefined,
    },
  };
}

export default async function HomePage() {
  const { page, empty } = await tryGetLandingPage();

  if (!page || empty === "not-published") {
    return <ComingSoon />;
  }

  // Page-level JSON-LD: the sender/recipient Service + the FAQPage built
  // from CMS items. The Organization/WebSite live in the root layout.
  const faqEntries = page.faq.items.map((item) => ({
    question: item.question,
    answer: item.answer,
  }));
  const pageGraph = buildGraph([
    loadJsonLdSnippet("service-senders"),
    buildFaqPage(faqEntries),
  ]);

  return (
    <main>
      <JsonLd data={pageGraph} />
      <Hero data={page.hero} />
      <Problem data={page.problem} />
      <HowItWorks data={page.howItWorks} />
      <Audience data={page.audience} />
      <Trust data={page.trust} />
      <Signup data={page.signup} />
      <Faq data={page.faq} />
    </main>
  );
}

function ComingSoon() {
  return (
    <main style={{ padding: "160px 24px", textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
      <h1 className="serif" style={{ fontSize: 42, marginBottom: 16 }}>
        hulubul.com
      </h1>
      <p style={{ color: "var(--ink-soft)", fontSize: 18, lineHeight: 1.6 }}>
        Site-ul se pregătește. Revino în curând.
      </p>
      <p
        style={{
          marginTop: 32,
          fontSize: 13,
          color: "var(--ink-soft)",
          fontStyle: "italic",
        }}
      >
        (Backend-ul Strapi nu are încă o intrare publicată pentru{" "}
        <code>landing-page</code>. Rulează scriptul de seed din{" "}
        <code>design/strapi-runbook.md §2</code>.)
      </p>
    </main>
  );
}
