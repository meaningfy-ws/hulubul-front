import type { Metadata } from "next";
import Link from "next/link";
import { getLegalPage } from "@/lib/strapi";
import { LEGAL_FALLBACK } from "@/lib/legal-fallback";
import { MarkdownText } from "@/components/landing/MarkdownText";
import type { LegalPage } from "@/lib/types";

async function loadPage(): Promise<LegalPage> {
  try {
    const cms = await getLegalPage("termeni");
    if (cms) return cms;
  } catch (error) {
    console.error("[legal/termeni] CMS fetch failed:", error);
  }
  return LEGAL_FALLBACK.termeni;
}

export async function generateMetadata(): Promise<Metadata> {
  const page = await loadPage();
  return {
    title: page.title,
    description: page.metaDescription,
  };
}

export default async function TermsPage() {
  const page = await loadPage();
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
