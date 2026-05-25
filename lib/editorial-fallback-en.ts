import type { EditorialPage, EditorialPageSlug } from "./types";

/**
 * Build-time fallback for editorial pages in English. Sparse on purpose:
 * only slugs that have a dedicated EN route ship here. When the CMS gains
 * an EN translation for `page-{slug}` it takes precedence (Strapi is
 * authoritative), and these copies remain only as the last resort if the
 * Strapi fetch 404s or errors.
 *
 * The donate page is the first EN-enabled editorial page — see
 * `design/epic-donate/spec.md`. Add new entries here as we expose more EN
 * surfaces.
 */
export const EDITORIAL_FALLBACK_EN: Partial<
  Record<EditorialPageSlug, EditorialPage>
> = {
  doneaza: {
    slug: "doneaza",
    title: "Support Hulubul",
    lastUpdated: "25 May 2026",
    seo: {
      metaDescription:
        "Hulubul is built by a small team, with no ads and no investors. Support the project with a one-time donation via Stripe.",
    },
    body: {
      format: "markdown",
      markdown: `Hulubul is built by a small team, in our spare time, with no ads and no investors. If the platform is useful to you — or you think it could be, for carriers and senders across Romania and the Moldovan diaspora — you can support us with a one-time donation in a single click.

## Thank you. Sincerely.

Before anything else — thank you. Thank you to everyone who filled out the surveys, joined the waitlist, asked us a hard question, and especially to those who spread the word. A donation is just one of many ways to support the project.

## What we use the money for

- **Infrastructure** — hosting, database, email, monitoring, the \`hulubul.com\` domain, SSL certificate, and the working tools we need to run the platform.
- **New features on the platform** — fees for the developers and operations people who build and maintain Hulubul. As donations grow, we can expand the team and ship new features faster.
- **Research** — interviews with carriers and senders, small incentives for survey participants.

## Why we have no ads

Ads would pollute the data and shift who we listen to — our customers would become advertisers, not users. Donations keep us aligned with the real people using the platform.

## How the payment works

The payment runs through **Stripe**, a secure processor used by thousands of organisations across Europe. Hulubul **never sees or stores** your card data. You'll be redirected to Stripe's secure page; you can come back to the site once you're done.

## Other ways to support us

If you can't or don't want to donate money, you help us just as much by:

- filling out [the sender survey](/sondaj/expeditori),
- joining the [waitlist](/#signup),
- telling others about Hulubul.

For frequently asked questions about donations and other forms of support, see the [FAQ section](/#faq) on the home page.`,
    },
  },
};
