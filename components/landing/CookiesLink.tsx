"use client";

import { openConsentPreferences } from "@/components/consent/ConsentBanner";

/**
 * Footer "Cookies" link. Re-opens the consent preferences modal.
 * Lives separately from Footer so the server-rendered footer stays
 * a Server Component.
 */
export function CookiesLink() {
  return (
    <button
      type="button"
      onClick={openConsentPreferences}
      style={{
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
        textDecoration: "underline",
      }}
    >
      Cookies
    </button>
  );
}
