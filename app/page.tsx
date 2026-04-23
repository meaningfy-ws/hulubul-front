import type { Metadata } from "next";
import { getLandingPage, LandingPageNotPublishedError } from "@/lib/strapi";
import { Hero } from "@/components/landing/Hero";
import { Problem } from "@/components/landing/Problem";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Audience } from "@/components/landing/Audience";
import { Trust } from "@/components/landing/Trust";
import { Signup } from "@/components/landing/Signup";
import { Faq } from "@/components/landing/Faq";
// Nav and Footer are rendered by the root layout; every page gets them.

export const revalidate = 300;

async function tryGetLandingPage() {
  try {
    return { page: await getLandingPage(), empty: null as null };
  } catch (error) {
    if (error instanceof LandingPageNotPublishedError) {
      return { page: null, empty: "not-published" as const };
    }
    // Never fail the render over a transient backend issue; ISR will retry in 300s.
    console.error("[hulubul-front] getLandingPage failed:", error);
    return { page: null, empty: "backend-unavailable" as const };
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { page } = await tryGetLandingPage();
  if (!page) return {};

  const { seo } = page;
  return {
    title: seo.metaTitle,
    description: seo.metaDescription,
    openGraph: {
      title: seo.metaTitle,
      description: seo.metaDescription,
      locale: "ro_RO",
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

  return (
    <main>
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
