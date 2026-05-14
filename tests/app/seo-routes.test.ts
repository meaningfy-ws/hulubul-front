import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hulubul.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("app/sitemap.ts", () => {
  it("lists every public, indexable page with absolute URLs", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls).toContain("https://hulubul.com/");
    expect(urls).toContain("https://hulubul.com/rute");
    expect(urls).toContain("https://hulubul.com/confidentialitate");
    expect(urls).toContain("https://hulubul.com/termeni");
    expect(urls).toContain("https://hulubul.com/despre-proiect");
    expect(urls).toContain("https://hulubul.com/pentru-transportatori");
  });

  it("does NOT include transient or admin paths", async () => {
    const entries = await sitemap();
    const urls = entries.map((e) => e.url);

    expect(urls.some((u) => u.includes("/sondaj/"))).toBe(false);
    expect(urls.some((u) => u.includes("/admin/"))).toBe(false);
    expect(urls.some((u) => u.includes("/api/"))).toBe(false);
  });

  it("home page has highest priority", async () => {
    const entries = await sitemap();
    const home = entries.find((e) => e.url === "https://hulubul.com/");
    expect(home?.priority).toBe(1.0);
  });

  it("each entry has a lastModified date", async () => {
    const entries = await sitemap();
    for (const e of entries) {
      expect(e.lastModified).toBeInstanceOf(Date);
    }
  });
});

describe("app/robots.ts", () => {
  it("allows the site root", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const wildcard = rules.find((rule) => rule.userAgent === "*");
    expect(wildcard?.allow).toEqual("/");
  });

  it("disallows admin, api, and sondaj", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules : [r.rules];
    const wildcard = rules.find((rule) => rule.userAgent === "*");
    const disallow = wildcard?.disallow;
    const list = Array.isArray(disallow) ? disallow : disallow ? [disallow] : [];
    expect(list).toContain("/admin/");
    expect(list).toContain("/api/");
    expect(list).toContain("/sondaj/");
  });

  it("references the sitemap absolute URL", () => {
    const r = robots();
    expect(r.sitemap).toBe("https://hulubul.com/sitemap.xml");
  });
});
