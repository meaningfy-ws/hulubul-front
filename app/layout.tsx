import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { getLandingPage } from "@/lib/strapi";
import { Nav } from "@/components/landing/Nav";
import { Footer } from "@/components/landing/Footer";
import type { NavComponent, FooterSection } from "@/lib/types";

const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "600", "800"],
  style: ["normal", "italic"],
  variable: "--font-fraunces",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "hulubul.com",
    template: "%s — hulubul.com",
  },
  description:
    "Platforma care conectează diaspora cu transportatorii care trec prin orașul tău.",
};

/**
 * Fetches the landing-page single type just for nav + footer chrome.
 * Wrapped in try/catch so a backend hiccup never blanks the whole site —
 * worst case, individual pages render without chrome until ISR refreshes.
 */
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

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const chrome = await fetchChrome();

  return (
    <html
      lang="ro"
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body>
        {chrome ? <Nav data={chrome.nav} /> : null}
        {children}
        {chrome ? <Footer data={chrome.footer} /> : null}
      </body>
    </html>
  );
}
