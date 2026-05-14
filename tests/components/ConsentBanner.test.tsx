import { describe, expect, it } from "vitest";
import { translateCategories } from "@/components/consent/ConsentBanner";

describe("translateCategories", () => {
  it("denies all when no categories are accepted", () => {
    expect(translateCategories([])).toEqual({
      analytics: "denied",
      marketing: "denied",
    });
  });

  it("grants analytics only", () => {
    expect(translateCategories(["necessary", "analytics"])).toEqual({
      analytics: "granted",
      marketing: "denied",
    });
  });

  it("grants both when accept-all", () => {
    expect(translateCategories(["necessary", "analytics", "marketing"])).toEqual({
      analytics: "granted",
      marketing: "granted",
    });
  });

  it("ignores unknown category names", () => {
    expect(translateCategories(["whatever", "marketing"])).toEqual({
      analytics: "denied",
      marketing: "granted",
    });
  });
});
