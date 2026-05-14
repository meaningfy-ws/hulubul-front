import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  CURRENT_CONSENT_VERSION,
  CONSENT_STORAGE_KEY,
  __resetConsentCache,
  initialState,
  needsBanner,
  readConsent,
  writeConsent,
  subscribe,
} from "@/lib/consent/store";

beforeEach(() => {
  window.localStorage.clear();
  // The store caches its snapshot to satisfy React's
  // useSyncExternalStore reference-stability requirement. Tests that
  // mutate localStorage directly need the cache cleared between cases.
  __resetConsentCache();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2027-01-15T10:00:00Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("initialState", () => {
  it("defaults to all-denied for non-essential categories", () => {
    const s = initialState();
    expect(s.necessary).toBe(true);
    expect(s.analytics).toBe("denied");
    expect(s.marketing).toBe("denied");
    expect(s.choseAt).toBeNull();
    expect(s.version).toBe(CURRENT_CONSENT_VERSION);
  });
});

describe("readConsent", () => {
  it("returns initialState when localStorage is empty", () => {
    expect(readConsent()).toEqual(initialState());
  });

  it("returns the stored state when localStorage has a current-version record", () => {
    const stored = {
      necessary: true,
      analytics: "granted" as const,
      marketing: "denied" as const,
      version: CURRENT_CONSENT_VERSION,
      choseAt: "2027-01-10T00:00:00.000Z",
    };
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    expect(readConsent()).toMatchObject(stored);
  });

  it("returns initialState when stored version is older (force re-prompt)", () => {
    const stored = {
      necessary: true,
      analytics: "granted",
      marketing: "granted",
      version: "2020-01-01",
      choseAt: "2020-01-01T00:00:00.000Z",
    };
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(stored));
    expect(readConsent()).toEqual(initialState());
  });

  it("returns initialState when stored JSON is malformed", () => {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, "{not json");
    expect(readConsent()).toEqual(initialState());
  });
});

describe("needsBanner", () => {
  it("is true when no choice has been made yet", () => {
    expect(needsBanner(initialState())).toBe(true);
  });

  it("is false when the user has chosen on the current version", () => {
    const s = {
      ...initialState(),
      analytics: "granted" as const,
      choseAt: "2027-01-10T00:00:00.000Z",
    };
    expect(needsBanner(s)).toBe(false);
  });
});

describe("writeConsent", () => {
  it("persists the new state to localStorage", () => {
    writeConsent({ analytics: "granted", marketing: "denied" });
    const stored = JSON.parse(
      window.localStorage.getItem(CONSENT_STORAGE_KEY) ?? "null",
    );
    expect(stored.analytics).toBe("granted");
    expect(stored.marketing).toBe("denied");
    expect(stored.version).toBe(CURRENT_CONSENT_VERSION);
    expect(stored.choseAt).toBe("2027-01-15T10:00:00.000Z");
  });

  it("returns the new state", () => {
    const s = writeConsent({ analytics: "granted", marketing: "granted" });
    expect(s.analytics).toBe("granted");
    expect(s.marketing).toBe("granted");
    expect(s.choseAt).toBe("2027-01-15T10:00:00.000Z");
  });
});

describe("subscribe", () => {
  it("notifies subscribers when consent changes", () => {
    const listener = vi.fn();
    const unsub = subscribe(listener);
    writeConsent({ analytics: "granted", marketing: "denied" });
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    writeConsent({ analytics: "denied", marketing: "denied" });
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
