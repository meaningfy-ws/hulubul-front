"use client";

import { useEffect, useState } from "react";
import { readRemembered } from "@/lib/remember-me";

export interface NavCtaProps {
  ctaLabel: string;
  ctaHref: string;
}

/**
 * Nav CTA that upgrades to a personalised greeting once the visitor has
 * remember-me data stored. Default state (no remembered identity) is the
 * same signup button the CMS configures. Server-rendered fallback =
 * identity-absent, so SSR and first paint match for new visitors.
 */
export function NavCta({ ctaLabel, ctaHref }: NavCtaProps) {
  const [firstName, setFirstName] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const remembered = readRemembered();
    if (remembered) {
      const first = remembered.name.trim().split(/\s+/)[0] ?? "";
      if (first.length > 0) setFirstName(first);
    }
    setHydrated(true);
  }, []);

  if (hydrated && firstName) {
    return <span className="nav-greeting">Bună, {firstName}</span>;
  }

  return (
    <a href={ctaHref} className="nav-cta">
      {ctaLabel}
    </a>
  );
}
