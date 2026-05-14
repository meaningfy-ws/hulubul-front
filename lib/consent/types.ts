/**
 * Consent state shapes shared by the store, banner, GA4 bridge and
 * the Strapi consent-record sync.
 *
 * See `docs/specs/2026-05-14-tracking-and-consent-spec.md` §4.
 */

export type ConsentDecision = "granted" | "denied";

export interface ConsentState {
  necessary: true;
  analytics: ConsentDecision;
  marketing: ConsentDecision;
  /** Banner copy version the user agreed to (or default version when no choice yet). */
  version: string;
  /** ISO-8601 timestamp of the user's choice; null when no choice has been made yet. */
  choseAt: string | null;
  /** Strapi documentId of the matching consent-record row, when server-sync succeeded. */
  recordId?: string;
}

/** What a banner click commits — the necessary category is implicit. */
export interface ConsentChoice {
  analytics: ConsentDecision;
  marketing: ConsentDecision;
}
