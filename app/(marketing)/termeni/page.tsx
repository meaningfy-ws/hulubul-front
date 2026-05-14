import type { Metadata } from "next";
import Link from "next/link";
import { getEditorialPage } from "@/lib/strapi";
import { EDITORIAL_FALLBACK } from "@/lib/editorial-fallback";
import { MarkdownText } from "@/components/landing/MarkdownText";
import type { EditorialPage } from "@/lib/types";

async function loadPage(): Promise<EditorialPage> {
  try {
    const cms = await getEditorialPage("termeni");
    if (cms) return cms;
  } catch (error) {
    console.error("[page/termeni] CMS fetch failed:", error);
  }
  return EDITORIAL_FALLBACK.termeni;
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
