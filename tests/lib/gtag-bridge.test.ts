import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureGtagBootstrap,
  pushConsentDefault,
  pushConsentUpdate,
} from "@/lib/consent/gtag-bridge";

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

beforeEach(() => {
  delete (window as { dataLayer?: unknown[] }).dataLayer;
});

afterEach(() => {
  delete (window as { dataLayer?: unknown[] }).dataLayer;
  vi.restoreAllMocks();
});

describe("ensureGtagBootstrap", () => {
  it("creates window.dataLayer if it doesn't exist", () => {
    ensureGtagBootstrap();
    expect(Array.isArray(window.dataLayer)).toBe(true);
  });

  it("preserves an existing dataLayer", () => {
    window.dataLayer = [{ pre: "existing" }];
    ensureGtagBootstrap();
    expect(window.dataLayer).toHaveLength(1);
  });
});

describe("pushConsentDefault", () => {
  it("pushes a denied-by-default consent state to dataLayer", () => {
    pushConsentDefault();
    const last = window.dataLayer?.[window.dataLayer.length - 1] as unknown[];
    expect(last[0]).toBe("consent");
    expect(last[1]).toBe("default");
    expect(last[2]).toMatchObject({
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied",
      analytics_storage: "denied",
      wait_for_update: 500,
    });
  });
});

describe("pushConsentUpdate", () => {
  it("pushes granted ad_* and analytics_storage when both categories are granted", () => {
    pushConsentUpdate({ analytics: "granted", marketing: "granted" });
    const last = window.dataLayer?.[window.dataLayer.length - 1] as unknown[];
    expect(last[0]).toBe("consent");
    expect(last[1]).toBe("update");
    expect(last[2]).toMatchObject({
      ad_storage: "granted",
      ad_user_data: "granted",
      ad_personalization: "granted",
      analytics_storage: "granted",
    });
  });

  it("pushes denied analytics when only marketing is granted", () => {
    pushConsentUpdate({ analytics: "denied", marketing: "granted" });
    const last = window.dataLayer?.[window.dataLayer.length - 1] as unknown[];
    expect(last[2]).toMatchObject({
      ad_storage: "granted",
      analytics_storage: "denied",
    });
  });

  it("pushes denied marketing when only analytics is granted", () => {
    pushConsentUpdate({ analytics: "granted", marketing: "denied" });
    const last = window.dataLayer?.[window.dataLayer.length - 1] as unknown[];
    expect(last[2]).toMatchObject({
      ad_storage: "denied",
      analytics_storage: "granted",
    });
  });
});
