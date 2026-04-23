/**
 * Strapi populate tree for the landing-page single type.
 *
 * `populate=*` only hydrates one level; this page has two-level nesting
 * (footer.columns.links) plus eight one-level repeatables. The tree below
 * is the single source of truth — if the backend schema adds a field,
 * update this file and the corresponding test will catch omissions.
 */

export const LANDING_POPULATE_KEYS = [
  "seo",
  "nav",
  "hero",
  "problem",
  "howItWorks",
  "audience",
  "trust",
  "signup",
  "faq",
  "footer",
] as const;

export type LandingPopulateKey = (typeof LANDING_POPULATE_KEYS)[number];

export interface LandingPopulate {
  seo: { populate: ["shareImage"] };
  nav: { populate: "*" };
  hero: { populate: ["handwrittenLines"] };
  problem: { populate: ["cards"] };
  howItWorks: { populate: ["steps"] };
  audience: { populate: ["cards"] };
  trust: { populate: ["items"] };
  signup: { populate: ["roleOptions"] };
  faq: { populate: ["items"] };
  footer: { populate: { columns: { populate: ["links"] } } };
}

export function buildLandingPopulate(): LandingPopulate {
  return {
    seo: { populate: ["shareImage"] },
    nav: { populate: "*" },
    hero: { populate: ["handwrittenLines"] },
    problem: { populate: ["cards"] },
    howItWorks: { populate: ["steps"] },
    audience: { populate: ["cards"] },
    trust: { populate: ["items"] },
    signup: { populate: ["roleOptions"] },
    faq: { populate: ["items"] },
    footer: { populate: { columns: { populate: ["links"] } } },
  };
}
