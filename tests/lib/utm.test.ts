import { describe, it, expect, beforeEach } from "vitest";
import { captureUtmFromUrl, readStoredUtm, UTM_STORAGE_KEY } from "@/lib/utm";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("Feature: UTM capture from landing URL", () => {
  describe("Given a URL with utm_source, utm_medium, utm_campaign", () => {
    it("When captured, Then those keys land in sessionStorage", () => {
      captureUtmFromUrl(
        "?utm_source=fb&utm_medium=cpc&utm_campaign=lux&unrelated=x",
        "https://example.com/",
      );
      const stored = JSON.parse(window.sessionStorage.getItem(UTM_STORAGE_KEY)!);
      expect(stored.utm_source).toBe("fb");
      expect(stored.utm_medium).toBe("cpc");
      expect(stored.utm_campaign).toBe("lux");
      expect(stored).not.toHaveProperty("unrelated");
    });
  });

  describe("Given gclid, fbclid and a referrer", () => {
    it("When captured, Then all three are stored", () => {
      captureUtmFromUrl("?gclid=g1&fbclid=f1", "https://ref.example/");
      const stored = JSON.parse(window.sessionStorage.getItem(UTM_STORAGE_KEY)!);
      expect(stored.gclid).toBe("g1");
      expect(stored.fbclid).toBe("f1");
      expect(stored.referrer).toBe("https://ref.example/");
    });
  });

  describe("Given a previous capture is already stored", () => {
    it("When a fresh capture runs, Then the original is preserved", () => {
      captureUtmFromUrl("?utm_source=a", "");
      captureUtmFromUrl("?utm_source=b", "");
      const stored = JSON.parse(window.sessionStorage.getItem(UTM_STORAGE_KEY)!);
      expect(stored.utm_source).toBe("a");
    });
  });

  describe("Given a URL with no UTM/click/referrer", () => {
    it("When captured, Then nothing is stored", () => {
      captureUtmFromUrl("", "");
      expect(window.sessionStorage.getItem(UTM_STORAGE_KEY)).toBeNull();
    });
  });

  describe("Given an oversized utm_source value", () => {
    it("When captured, Then it is clipped to 256 chars", () => {
      const long = "x".repeat(300);
      captureUtmFromUrl(`?utm_source=${long}`, "");
      const stored = JSON.parse(window.sessionStorage.getItem(UTM_STORAGE_KEY)!);
      expect(stored.utm_source.length).toBe(256);
    });
  });
});

describe("Feature: reading stored UTM", () => {
  describe("Given nothing is stored", () => {
    it("When read, Then it returns undefined", () => {
      expect(readStoredUtm()).toBeUndefined();
    });
  });

  describe("Given a valid JSON object is stored", () => {
    it("When read, Then it returns the parsed object", () => {
      window.sessionStorage.setItem(
        UTM_STORAGE_KEY,
        JSON.stringify({ utm_source: "x" }),
      );
      expect(readStoredUtm()).toEqual({ utm_source: "x" });
    });
  });

  describe("Given the stored value is malformed JSON", () => {
    it("When read, Then it returns undefined (no throw)", () => {
      window.sessionStorage.setItem(UTM_STORAGE_KEY, "not-json");
      expect(readStoredUtm()).toBeUndefined();
    });
  });
});
