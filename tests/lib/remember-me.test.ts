import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearRememberedIdentity,
  readRemembered,
  REMEMBER_STORAGE_KEY,
  saveRemembered,
} from "@/lib/remember-me";

function rawLocalStorageGet(): string | null {
  return window.localStorage.getItem(REMEMBER_STORAGE_KEY);
}

beforeEach(() => {
  window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("remember-me — saveRemembered / readRemembered round-trip (v2)", () => {
  it("persists name + email and reads it back with v:2 + a savedAt", () => {
    saveRemembered({ name: "Ion Popescu", email: "ion@example.com" });
    const read = readRemembered();
    expect(read).not.toBeNull();
    expect(read!.v).toBe(2);
    expect(read!.name).toBe("Ion Popescu");
    expect(read!.email).toBe("ion@example.com");
    expect(read!.whatsapp).toBeUndefined();
    expect(read!.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("persists whatsapp when provided", () => {
    saveRemembered({
      name: "Ion",
      email: "ion@x",
      whatsapp: "+373 600 00 000",
    });
    const read = readRemembered();
    expect(read!.whatsapp).toBe("+373 600 00 000");
  });

  it("trims whitespace on every field before storing", () => {
    saveRemembered({
      name: "  Ion  ",
      email: "  ion@x  ",
      whatsapp: "  +373  ",
    });
    const read = readRemembered();
    expect(read!.name).toBe("Ion");
    expect(read!.email).toBe("ion@x");
    expect(read!.whatsapp).toBe("+373");
  });

  it("stores whatsapp as absent when empty after trim", () => {
    saveRemembered({ name: "Ion", email: "ion@x", whatsapp: "   " });
    const read = readRemembered();
    expect(read!.whatsapp).toBeUndefined();
  });
});

describe("remember-me — readRemembered null branches", () => {
  it("returns null when no entry exists", () => {
    expect(readRemembered()).toBeNull();
  });

  it("returns null when the payload is not valid JSON", () => {
    window.localStorage.setItem(REMEMBER_STORAGE_KEY, "{not json");
    expect(readRemembered()).toBeNull();
  });

  it("returns null when the version is old (v1 migration: silent drop)", () => {
    // Old v1 entry — must not leak into the new form.
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({ v: 1, name: "x", contact: "y", savedAt: new Date().toISOString() }),
    );
    expect(readRemembered()).toBeNull();
  });

  it("returns null when the version is unknown/future", () => {
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({ v: 99, name: "x", email: "y@x", savedAt: new Date().toISOString() }),
    );
    expect(readRemembered()).toBeNull();
  });

  it("returns null and clears the entry when older than 365 days", () => {
    const oldDate = new Date("2024-01-01T00:00:00Z").toISOString();
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({ v: 2, name: "x", email: "y@x", savedAt: oldDate }),
    );
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-24T00:00:00Z"));
    expect(readRemembered()).toBeNull();
    expect(rawLocalStorageGet()).toBeNull();
  });

  it("returns null when the JSON is valid but shape is wrong (missing email)", () => {
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({ v: 2, name: "Ion", savedAt: new Date().toISOString() }),
    );
    expect(readRemembered()).toBeNull();
  });
});

describe("remember-me — clearRememberedIdentity", () => {
  it("removes the key", () => {
    saveRemembered({ name: "Ion", email: "ion@x" });
    expect(rawLocalStorageGet()).not.toBeNull();
    clearRememberedIdentity();
    expect(rawLocalStorageGet()).toBeNull();
  });

  it("is idempotent", () => {
    expect(() => {
      clearRememberedIdentity();
      clearRememberedIdentity();
    }).not.toThrow();
    expect(rawLocalStorageGet()).toBeNull();
  });
});

describe("remember-me — resilience", () => {
  it("does not throw when localStorage.setItem quota errors", () => {
    const spy = vi
      .spyOn(Storage.prototype, "setItem")
      .mockImplementation(() => {
        throw new DOMException("quota", "QuotaExceededError");
      });
    expect(() =>
      saveRemembered({ name: "Ion", email: "ion@x" }),
    ).not.toThrow();
    spy.mockRestore();
  });

  it("treats missing window.localStorage as SSR: all ops are no-ops and do not throw", () => {
    const original = Object.getOwnPropertyDescriptor(window, "localStorage")!;
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("should not be accessed");
      },
    });
    try {
      expect(() =>
        saveRemembered({ name: "x", email: "y@x" }),
      ).not.toThrow();
      expect(readRemembered()).toBeNull();
      expect(() => clearRememberedIdentity()).not.toThrow();
    } finally {
      Object.defineProperty(window, "localStorage", original);
    }
  });
});
