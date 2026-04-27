import { getLandingPage } from "@/lib/strapi";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import type { NavComponent, FooterSection } from "@/lib/types";

async function fetchChrome(): Promise<{
  nav: NavComponent;
  footer: FooterSection;
} | null> {
  try {
    const page = await getLandingPage();
    return { nav: page.nav, footer: page.footer };
  } catch (error) {
    console.error("[layout] chrome fetch failed:", error);
    return null;
  }
}

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const chrome = await fetchChrome();

  return (
    <>
      {chrome ? <Nav data={chrome.nav} /> : null}
      {children}
      {chrome ? <Footer data={chrome.footer} /> : null}
    </>
  );
}
