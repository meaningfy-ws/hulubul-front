import { STRIPE_DONATE_URL } from "@/lib/donate";
import { DonateButtonClient } from "./DonateButtonClient";

export type DonateButtonVariant = "primary" | "ghost" | "inline";

export interface DonateButtonProps {
  /**
   * Analytics tag for the click event. Examples: `"footer"`, `"donate-page"`,
   * `"donate-page-en"`, `"about-page"`. Required so dashboards can tell
   * which surface drives clicks.
   */
  source: string;
  label?: string;
  ariaLabel?: string;
  variant?: DonateButtonVariant;
  /** Short disclaimer rendered below the button. Pass empty string to hide. */
  note?: string;
  /** Locale of the surrounding page, for default copy. Defaults to `ro`. */
  locale?: "ro" | "en";
}

const DEFAULTS = {
  ro: {
    label: "Donează prin Stripe",
    note: "Vei fi redirecționat către pagina securizată Stripe.",
  },
  en: {
    label: "Donate via Stripe",
    note: "You will be redirected to Stripe's secure payment page.",
  },
} as const;

/**
 * Server component. Renders a plain `<a>` to the Stripe Payment Link in a
 * new tab — keeping our page in the visitor's history and matching user
 * expectations for off-site payment. See `design/epic-donate/spec.md` §2
 * for why we do NOT iframe the Stripe link.
 *
 * The link itself works without JS. `DonateButtonClient` adds an analytics
 * `donate_click` event on top, and degrades gracefully when JS is off.
 */
export function DonateButton({
  source,
  label,
  ariaLabel,
  variant = "primary",
  note,
  locale = "ro",
}: DonateButtonProps) {
  const copy = DEFAULTS[locale];
  const finalLabel = label ?? copy.label;
  const finalNote = note ?? copy.note;
  const className = `donate-button donate-button--${variant}`;
  return (
    <div className="donate-button-wrap">
      <DonateButtonClient
        href={STRIPE_DONATE_URL}
        source={source}
        className={className}
        ariaLabel={ariaLabel}
      >
        {finalLabel}
      </DonateButtonClient>
      {finalNote ? <p className="donate-button-note">{finalNote}</p> : null}
    </div>
  );
}
