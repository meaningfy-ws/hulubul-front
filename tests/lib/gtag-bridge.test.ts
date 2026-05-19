import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ensureGtagBootstrap,
  gtag,
  pushConsentDefault,
  pushConsentUpdate,
} from "@/lib/consent/gtag-bridge";

/**
 * gtag.js only processes a dataLayer entry as a command when it is an
 * `arguments` object. A plain array is silently ignored — the exact
 * bug this guards against (Consent Mode `update` never registering).
 */
function isArgumentsObject(value: unknown): boolean {
  return Object.prototype.toString.call(value) === "[object Arguments]";
}

function lastEntry(): unknown {
  return window.dataLayer?.[window.dataLayer.length - 1];
}

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

describe("gtag", () => {
  it("pushes an arguments object, NOT a plain array (gtag.js ignores arrays)", () => {
    gtag("consent", "update", { analytics_storage: "granted" });
    const last = lastEntry();
    expect(isArgumentsObject(last)).toBe(true);
    expect(Array.isArray(last)).toBe(false);
    const args = last as IArguments;
    expect(args[0]).toBe("consent");
    expect(args[1]).toBe("update");
    expect(args[2]).toMatchObject({ analytics_storage: "granted" });
  });

  it("bootstraps dataLayer if absent", () => {
    gtag("event", "x");
    expect(Array.isArray(window.dataLayer)).toBe(true);
  });
});

describe("pushConsentDefault", () => {
  it("pushes a denied-by-default consent state to dataLayer", () => {
    pushConsentDefault();
    const last = lastEntry() as IArguments;
    expect(isArgumentsObject(last)).toBe(true);
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
    const last = lastEntry() as IArguments;
    expect(isArgumentsObject(last)).toBe(true);
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
    const last = lastEntry() as IArguments;
    expect(isArgumentsObject(last)).toBe(true);
    expect(last[2]).toMatchObject({
      ad_storage: "granted",
      analytics_storage: "denied",
    });
  });

  it("pushes denied marketing when only analytics is granted", () => {
    pushConsentUpdate({ analytics: "granted", marketing: "denied" });
    const last = lastEntry() as IArguments;
    expect(isArgumentsObject(last)).toBe(true);
    expect(last[2]).toMatchObject({
      ad_storage: "denied",
      analytics_storage: "granted",
    });
  });
});
