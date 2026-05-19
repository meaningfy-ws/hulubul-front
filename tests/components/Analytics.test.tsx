import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { PRODUCTION_GA_ID } from "@/lib/tracking/config";

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => (
    <div data-testid="ga4-mock" data-ga-id={gaId} />
  ),
}));

/**
 * gtag.js only treats a dataLayer entry as a command when it is an
 * `arguments` object — not a plain array. Match the real shape the
 * gtag bridge now pushes.
 */
function isGtagCall(
  entry: unknown,
  command: string,
  action: string,
): boolean {
  if (Object.prototype.toString.call(entry) !== "[object Arguments]") {
    return false;
  }
  const args = entry as IArguments;
  return args[0] === command && args[1] === action;
}

const mockConsent = {
  state: {
    analytics: "denied" as "granted" | "denied",
    marketing: "denied" as "granted" | "denied",
  },
};

vi.mock("@/components/consent/ConsentProvider", () => ({
  useConsent: () => mockConsent,
  ConsentProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { Analytics } from "@/components/analytics/Analytics";

beforeEach(() => {
  delete (window as { dataLayer?: unknown[] }).dataLayer;
  vi.unstubAllEnvs();
  mockConsent.state = { analytics: "denied", marketing: "denied" };
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as { dataLayer?: unknown[] }).dataLayer;
});

describe("<Analytics> — Consent Mode v2 Advanced", () => {
  it("renders GoogleAnalytics with the production GA ID by default (no env override)", () => {
    // Env unset → falls back to PRODUCTION_GA_ID baked into the bundle.
    render(<Analytics />);
    const el = screen.getByTestId("ga4-mock");
    expect(el.getAttribute("data-ga-id")).toBe(PRODUCTION_GA_ID);
  });

  it("renders GoogleAnalytics regardless of consent (Advanced mode)", () => {
    // Key Advanced-mode property: gtag.js loads even when consent is
    // denied. Cookies are blocked via the `consent default denied`
    // signal, but the script is present so Tag Assistant can verify
    // the install.
    mockConsent.state = { analytics: "denied", marketing: "denied" };
    render(<Analytics />);
    expect(screen.queryByTestId("ga4-mock")).toBeInTheDocument();
  });

  it("env override wins over the bundled default (used for staging/preview)", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-STAGING");
    render(<Analytics />);
    expect(screen.getByTestId("ga4-mock").getAttribute("data-ga-id")).toBe(
      "G-STAGING",
    );
  });

  it("explicit empty env disables analytics in dev", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    render(<Analytics />);
    expect(screen.queryByTestId("ga4-mock")).toBeNull();
  });

  it("pushes Consent Mode v2 default to dataLayer on mount", () => {
    render(<Analytics />);
    expect(Array.isArray(window.dataLayer)).toBe(true);
    const consentDefaults = (window.dataLayer ?? []).filter((entry) =>
      isGtagCall(entry, "consent", "default"),
    );
    expect(consentDefaults.length).toBeGreaterThanOrEqual(1);
  });

  it("does NOT push update on first render (default already covers it)", () => {
    mockConsent.state = { analytics: "granted", marketing: "denied" };
    render(<Analytics />);
    const updates = (window.dataLayer ?? []).filter((entry) =>
      isGtagCall(entry, "consent", "update"),
    );
    expect(updates).toHaveLength(0);
  });
});

describe("resolveGaId", () => {
  // Pure-function tests for the env→constant resolver in lib/tracking/config.ts.
  it("returns the production constant when env is undefined", async () => {
    const { resolveGaId } = await import("@/lib/tracking/config");
    expect(resolveGaId(undefined)).toBe(PRODUCTION_GA_ID);
  });

  it("returns null when env is explicitly empty (dev opt-out)", async () => {
    const { resolveGaId } = await import("@/lib/tracking/config");
    expect(resolveGaId("")).toBeNull();
  });

  it("returns the env value when set", async () => {
    const { resolveGaId } = await import("@/lib/tracking/config");
    expect(resolveGaId("G-OVERRIDE")).toBe("G-OVERRIDE");
  });
});
