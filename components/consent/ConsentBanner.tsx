"use client";

import { useEffect, useRef } from "react";
import { useConsent } from "./ConsentProvider";
import { logger } from "@/lib/logger";
import type { ConsentChoice } from "@/lib/consent/store";

/**
 * Translates the library's notion of accepted categories into our
 * canonical `ConsentChoice`. Pure, easy to unit test.
 */
export function translateCategories(categories: string[]): ConsentChoice {
  return {
    analytics: categories.includes("analytics") ? "granted" : "denied",
    marketing: categories.includes("marketing") ? "granted" : "denied",
  };
}

interface CookieConsentApi {
  run: (config: unknown) => Promise<void> | void;
  showPreferences: () => void;
  getCookie: () => { categories?: string[] } | null | undefined;
}

declare global {
  interface Window {
    /** Expose imperative API so the footer "Cookies" link can re-open the modal. */
    __hulubulOpenConsent?: () => void;
  }
}

/**
 * Mounts vanilla-cookieconsent on first render and wires its callbacks
 * to our consent store. The banner is auto-shown on first visit by the
 * library itself (per its config). After consent, this component does
 * nothing but listen for re-open requests.
 *
 * Imports are dynamic so the library doesn't end up in the server
 * bundle (it touches `document` at module scope).
 */
export function ConsentBanner() {
  const { setChoice } = useConsent();
  const apiRef = useRef<CookieConsentApi | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        // Library's own CSS — must be imported once.
        await import("vanilla-cookieconsent/dist/cookieconsent.css");
        const cc: CookieConsentApi = (await import("vanilla-cookieconsent")) as
          unknown as CookieConsentApi;
        const { buildBannerConfig } = await import("@/lib/consent/banner-config");
        if (cancelled) return;
        apiRef.current = cc;
        window.__hulubulOpenConsent = () => cc.showPreferences();
        await cc.run(
          buildBannerConfig({
            onChange: () => {
              const cookie = cc.getCookie();
              const cats = cookie?.categories ?? [];
              setChoice(translateCategories(cats));
            },
          }),
        );
      } catch (error) {
        logger.error("consent.banner", "failed to initialise banner", error);
      }
    })();
    return () => {
      cancelled = true;
      delete window.__hulubulOpenConsent;
    };
  }, [setChoice]);

  return null;
}

/**
 * Imperative open from anywhere (e.g. the footer "Cookies" link).
 * Safe to call before the banner has finished initialising — no-op.
 */
export function openConsentPreferences() {
  if (typeof window !== "undefined") {
    window.__hulubulOpenConsent?.();
  }
}
