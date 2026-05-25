"use client";

import { useEffect, useState } from "react";
import { readRemembered } from "@/lib/remember-me";

export interface NavCtaProps {
  ctaLabel: string;
  ctaHref: string;
  /**
   * First name supplied by the parent server component when a Stage-1 prefill
   * cookie is present. Lets the greeting render on the very first paint after
   * the OIDC callback redirect — no reload, no hydration delay.
   */
  prefilledFirstName?: string;
}

/**
 * Nav CTA that upgrades to a personalised greeting once the visitor has
 * either a Stage-1 prefill cookie (server-rendered via `prefilledFirstName`)
 * or remember-me data stored client-side. Default state (no identity) is the
 * CMS-configured signup button. SSR and first paint match.
 */
export function NavCta({ ctaLabel, ctaHref, prefilledFirstName }: NavCtaProps) {
  const [firstName, setFirstName] = useState<string | null>(
    prefilledFirstName ?? null,
  );
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Only fall back to remember-me if the server didn't already hand us a
    // first name — Stage-1 prefill (this visit) always wins over remember-me.
    if (!prefilledFirstName) {
      const remembered = readRemembered();
      if (remembered) {
        const first = remembered.name.trim().split(/\s+/)[0] ?? "";
        if (first.length > 0) setFirstName(first);
      }
    }
    setHydrated(true);
  }, [prefilledFirstName]);

  if (prefilledFirstName || (hydrated && firstName)) {
    return (
      <span className="nav-greeting">
        Bună, {prefilledFirstName ?? firstName}
      </span>
    );
  }

  // CMS stores the CTA target as `#signup`, which only resolves on the landing
  // page. On other routes (e.g. /sondaj) a bare fragment is a no-op — prefix
  // `/` so the click always navigates back to the landing anchor.
  const href = ctaHref.startsWith("#") ? `/${ctaHref}` : ctaHref;

  return (
    <a href={href} className="nav-cta">
      {ctaLabel}
    </a>
  );
}
