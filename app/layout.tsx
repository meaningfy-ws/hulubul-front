import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { Analytics } from "@/components/analytics/Analytics";
import { WebVitalsReporter } from "@/components/analytics/WebVitalsReporter";
import { ConsentProvider } from "@/components/consent/ConsentProvider";
import { ConsentBanner } from "@/components/consent/ConsentBanner";
import { ConsentDefaultsScript } from "@/components/consent/ConsentDefaultsScript";
import { JsonLd } from "@/components/seo/JsonLd";
import {
  DEFAULT_LOCALE,
  DEFAULT_SITE_DESCRIPTION,
  SITE_NAME,
  getMetadataBase,
} from "@/lib/seo";
import {
  buildGraph,
  loadJsonLdSnippet,
} from "@/lib/jsonld/builders";

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
  metadataBase: getMetadataBase(),
  title: {
    default: SITE_NAME,
    template: `%s — ${SITE_NAME}`,
  },
  description: DEFAULT_SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  // Disable iOS auto-detection of phone/email/address — we mark up
  // contact info ourselves where needed.
  formatDetection: { telephone: false, email: false, address: false },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: DEFAULT_LOCALE,
    url: "/",
    images: [{ url: "/og-default.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [{ url: "/og-default.png" }],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  // No favicon assets shipped yet — re-enable once the designer
  // delivers /favicon.ico and /apple-touch-icon.png in public/.
  // icons: { icon: "/favicon.ico", apple: "/apple-touch-icon.png" },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ro"
      className={`${inter.variable} ${fraunces.variable}`}
      suppressHydrationWarning
    >
      <body>
        {/*
          ConsentDefaultsScript MUST come first — it uses
          strategy="beforeInteractive" so the Google Consent Mode v2
          default ("everything denied") lands in dataLayer before
          gtag.js parses. Required by the Advanced-mode consent docs.
        */}
        <ConsentDefaultsScript />
        <JsonLd
          data={buildGraph([
            loadJsonLdSnippet("organization"),
            loadJsonLdSnippet("website"),
          ])}
        />
        <ConsentProvider>
          {children}
          <Analytics />
          <WebVitalsReporter />
          <ConsentBanner />
        </ConsentProvider>
      </body>
    </html>
  );
}
