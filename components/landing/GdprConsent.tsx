"use client";

import { useState } from "react";
import Link from "next/link";
import { GDPR_CONSENT_VERSION } from "@/lib/gdpr-consent";

export interface GdprConsentValue {
  consent: boolean;
  consentAt: string | null;
  version: string;
}

interface Props {
  onChange: (value: GdprConsentValue) => void;
}

export function GdprConsent({ onChange }: Props) {
  const [checked, setChecked] = useState(false);

  function handle(next: boolean) {
    setChecked(next);
    onChange({
      consent: next,
      consentAt: next ? new Date().toISOString() : null,
      version: GDPR_CONSENT_VERSION,
    });
  }

  return (
    <div className="form-consent">
      <input
        id="waitlist-gdpr"
        type="checkbox"
        checked={checked}
        onChange={(e) => handle(e.target.checked)}
      />
      <label htmlFor="waitlist-gdpr">
        Sunt de acord cu{" "}
        <Link href="/privacy" target="_blank" rel="noopener">
          politica de confidențialitate
        </Link>{" "}
        și cu prelucrarea datelor mele pentru anunțul de lansare Hulubul.
      </label>
    </div>
  );
}
