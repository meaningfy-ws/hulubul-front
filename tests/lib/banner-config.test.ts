import { describe, expect, it } from "vitest";
import { buildBannerConfig } from "@/lib/consent/banner-config";
import { BANNER_REVISION } from "@/lib/consent/version";

describe("buildBannerConfig", () => {
  const noop = () => {};
  const config = buildBannerConfig({ onChange: noop });

  it("declares three categories: necessary, analytics, marketing", () => {
    const keys = Object.keys(config.categories ?? {});
    expect(keys.sort()).toEqual(["analytics", "marketing", "necessary"]);
  });

  it("marks all categories as pre-checked but only necessary as read-only", () => {
    // Pre-checked analytics + marketing is a deliberate UX choice (see
    // the COMPLIANCE NOTE in banner-config.ts). User can still untick
    // before clicking Save. Necessary remains read-only.
    const cats = config.categories!;
    expect(cats.necessary?.enabled).toBe(true);
    expect(cats.necessary?.readOnly).toBe(true);
    expect(cats.analytics?.enabled).toBe(true);
    expect(cats.analytics?.readOnly).toBeFalsy();
    expect(cats.marketing?.enabled).toBe(true);
    expect(cats.marketing?.readOnly).toBeFalsy();
  });

  it("ships Romanian language pack as the default", () => {
    expect(config.language?.default).toBe("ro");
    expect(config.language?.translations?.ro).toBeDefined();
  });

  it("ties the cookieconsent revision to the current banner version", () => {
    expect(config.revision).toBe(BANNER_REVISION);
  });

  it("disables auto-clearing of cookies (we manage this via reload)", () => {
    expect(config.autoClearCookies).toBe(false);
  });

  it("forwards onChange to the cookieconsent onConsent and onChange hooks", () => {
    let received = 0;
    const c = buildBannerConfig({ onChange: () => received++ });
    // Simulate library calling our hooks with a fake payload.
    c.onConsent?.({ cookie: { categories: ["necessary"] } } as never);
    c.onChange?.({ cookie: { categories: ["necessary", "analytics"] } } as never);
    expect(received).toBe(2);
  });
});
