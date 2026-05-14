import type { CookieConsentConfig } from "vanilla-cookieconsent";
import { BANNER_REVISION } from "./version";

interface BuildBannerConfigOptions {
  /** Called whenever the user's consent changes (first save and updates). */
  onChange: () => void;
}

/**
 * Builds the configuration object passed to vanilla-cookieconsent.
 *
 * - Three categories: necessary (forced on), analytics, marketing.
 * - Romanian copy is the default; English is a future addition.
 * - `autoClearCookies: false` because we manage tracker teardown by
 *   reloading the page on withdrawal (in-place teardown of GA4 / GTM
 *   is fragile).
 * - The `onChange` and `onConsent` callbacks both fire `onChange`
 *   (the consumer reads the canonical state from `lib/consent/store.ts`,
 *   so we don't propagate the library's payload directly — store is
 *   the single source of truth).
 *
 * See `docs/specs/2026-05-14-tracking-and-consent-spec.md` §4.
 */
export function buildBannerConfig(
  options: BuildBannerConfigOptions,
): CookieConsentConfig {
  const notify = () => options.onChange();
  return {
    revision: BANNER_REVISION,
    autoShow: true,
    autoClearCookies: false,
    hideFromBots: true,
    guiOptions: {
      consentModal: {
        layout: "bar inline",
        position: "bottom",
        equalWeightButtons: true,
        flipButtons: false,
      },
      preferencesModal: {
        layout: "box",
        equalWeightButtons: true,
      },
    },
    categories: {
      necessary: {
        enabled: true,
        readOnly: true,
      },
      analytics: {
        enabled: false,
        readOnly: false,
      },
      marketing: {
        enabled: false,
        readOnly: false,
      },
    },
    language: {
      default: "ro",
      translations: {
        ro: {
          consentModal: {
            title: "Folosim cookie-uri",
            description:
              "Folosim cookie-uri esențiale pentru a face site-ul să funcționeze, plus cookie-uri opționale pentru a înțelege cum este folosit site-ul. Poți alege ce accepți.",
            acceptAllBtn: "Accept tot",
            acceptNecessaryBtn: "Doar esențiale",
            showPreferencesBtn: "Personalizează",
            footer:
              '<a href="/confidentialitate">Politica de confidențialitate</a> · <a href="/termeni">Termeni</a>',
          },
          preferencesModal: {
            title: "Preferințe cookie-uri",
            acceptAllBtn: "Accept tot",
            acceptNecessaryBtn: "Doar esențiale",
            savePreferencesBtn: "Salvează preferințele",
            closeIconLabel: "Închide",
            sections: [
              {
                title: "Cookie-uri esențiale",
                description:
                  "Necesare pentru funcționarea site-ului (formulare, sesiune, securitate). Nu pot fi dezactivate.",
                linkedCategory: "necessary",
              },
              {
                title: "Analiză",
                description:
                  "Ne ajută să înțelegem cum este folosit site-ul, ca să-l facem mai bun. Date agregate, fără identificare personală.",
                linkedCategory: "analytics",
              },
              {
                title: "Marketing",
                description:
                  "Pixeli folosiți pentru a măsura eficiența campaniilor. Astăzi nu rulăm campanii, dar dacă vom face asta, le vom încărca doar dacă bifezi aici.",
                linkedCategory: "marketing",
              },
              {
                title: "Mai multe informații",
                description:
                  'Pentru detalii complete, vezi <a href="/confidentialitate">politica de confidențialitate</a>. Poți reveni oricând la aceste preferințe din linkul "Cookies" din subsolul paginii.',
              },
            ],
          },
        },
      },
    },
    onConsent: notify,
    onChange: notify,
  };
}
