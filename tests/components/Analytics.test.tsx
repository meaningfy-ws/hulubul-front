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

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => (
    <div data-testid="ga4-mock" data-ga-id={gaId} />
  ),
}));

const mockConsent = {
  state: { analytics: "denied" as "granted" | "denied", marketing: "denied" as "granted" | "denied" },
};

vi.mock("@/components/consent/ConsentProvider", () => ({
  useConsent: () => mockConsent,
  ConsentProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

import { Analytics } from "@/components/analytics/Analytics";

beforeEach(() => {
  delete (window as { dataLayer?: unknown[] }).dataLayer;
  vi.stubEnv("NEXT_PUBLIC_GA_ID", "G-TESTID");
  mockConsent.state = { analytics: "denied", marketing: "denied" };
});

afterEach(() => {
  vi.unstubAllEnvs();
  delete (window as { dataLayer?: unknown[] }).dataLayer;
});

describe("<Analytics>", () => {
  it("does NOT render GoogleAnalytics when analytics consent is denied", () => {
    mockConsent.state = { analytics: "denied", marketing: "denied" };
    render(<Analytics />);
    expect(screen.queryByTestId("ga4-mock")).toBeNull();
  });

  it("renders GoogleAnalytics when analytics consent is granted and GA_ID is set", () => {
    mockConsent.state = { analytics: "granted", marketing: "denied" };
    render(<Analytics />);
    const el = screen.getByTestId("ga4-mock");
    expect(el).toBeInTheDocument();
    expect(el.getAttribute("data-ga-id")).toBe("G-TESTID");
  });

  it("does NOT render GoogleAnalytics when GA_ID env is unset, even with consent", () => {
    vi.stubEnv("NEXT_PUBLIC_GA_ID", "");
    mockConsent.state = { analytics: "granted", marketing: "granted" };
    render(<Analytics />);
    expect(screen.queryByTestId("ga4-mock")).toBeNull();
  });

  it("pushes Consent Mode v2 default to dataLayer on mount", () => {
    mockConsent.state = { analytics: "denied", marketing: "denied" };
    render(<Analytics />);
    expect(Array.isArray(window.dataLayer)).toBe(true);
    const consentDefaults = (window.dataLayer ?? []).filter(
      (entry) =>
        Array.isArray(entry) && entry[0] === "consent" && entry[1] === "default",
    );
    expect(consentDefaults.length).toBeGreaterThanOrEqual(1);
  });

  it("pushes a Consent Mode v2 update when consent is granted", () => {
    mockConsent.state = { analytics: "granted", marketing: "denied" };
    render(<Analytics />);
    const updates = (window.dataLayer ?? []).filter(
      (entry) =>
        Array.isArray(entry) && entry[0] === "consent" && entry[1] === "update",
    );
    expect(updates.length).toBeGreaterThanOrEqual(1);
    const last = updates[updates.length - 1] as unknown[];
    expect(last[2]).toMatchObject({ analytics_storage: "granted" });
  });
});
