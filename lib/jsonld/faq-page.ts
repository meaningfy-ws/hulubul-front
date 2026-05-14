import type { FAQPage } from "schema-dts";

interface FaqEntry {
  question: string;
  answer: string;
}

/**
 * Builds a Schema.org `FAQPage` from a list of question/answer pairs.
 * Used on the landing page; data comes from the CMS FAQ items so the
 * structured data tracks editorial changes automatically.
 *
 * No static `.jsonld` snippet here because the answers come from the
 * CMS at request time — pure data files would either be stale or
 * regenerated. A function lets the page pass live CMS items in.
 */
export function buildFaqPage(items: FaqEntry[]): FAQPage {
  return {
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
