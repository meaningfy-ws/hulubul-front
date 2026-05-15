import { describe, expect, it } from "vitest";
import { SUPPORTED_LOCALES, DEFAULT_LOCALE_CODE, isLocale } from "@/lib/locale";

describe("locale model", () => {
  it("supports exactly ro + en, default ro", () => {
    expect([...SUPPORTED_LOCALES]).toEqual(["ro", "en"]);
    expect(DEFAULT_LOCALE_CODE).toBe("ro");
  });

  it("isLocale guards membership", () => {
    expect(isLocale("ro")).toBe(true);
    expect(isLocale("en")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale(undefined)).toBe(false);
  });
});
