import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildBreadcrumbList,
  buildFaqPage,
  buildGraph,
  loadJsonLdSnippet,
  serialiseJsonLd,
} from "@/lib/jsonld/builders";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hulubul.com");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("loadJsonLdSnippet — organization", () => {
  const org = loadJsonLdSnippet<Record<string, unknown>>("organization");

  it("returns @type Organization with the right name and url", () => {
    expect(org["@type"]).toBe("Organization");
    expect(org.name).toBe("hulubul.com");
    expect(org.url).toBe("https://hulubul.com");
  });

  it("includes parentOrganization → Meaningfy", () => {
    const parent = org.parentOrganization as { name: string; url: string };
    expect(parent.name).toBe("Meaningfy");
    expect(parent.url).toBe("https://meaningfy.ws");
  });

  it("declares foundingLocation in Luxembourg and Chișinău", () => {
    const locs = org.foundingLocation as Array<{ name: string }>;
    expect(locs.map((l) => l.name).join("|")).toMatch(/Luxembourg/);
    expect(locs.map((l) => l.name).join("|")).toMatch(/Chișinău/);
  });
});

describe("loadJsonLdSnippet — website", () => {
  const ws = loadJsonLdSnippet<Record<string, unknown>>("website");

  it("returns @type WebSite with absolute url", () => {
    expect(ws["@type"]).toBe("WebSite");
    expect(ws.url).toBe("https://hulubul.com");
    expect(ws.name).toBe("hulubul.com");
  });
});

describe("loadJsonLdSnippet — error cases", () => {
  it("throws a clear error when the snippet does not exist", () => {
    expect(() => loadJsonLdSnippet("does-not-exist")).toThrow();
  });
});

describe("buildGraph", () => {
  it("wraps multiple things in a single @context + @graph document", () => {
    const doc = buildGraph([
      loadJsonLdSnippet("organization"),
      loadJsonLdSnippet("website"),
    ]);
    expect(doc["@context"]).toBe("https://schema.org");
    expect(Array.isArray(doc["@graph"])).toBe(true);
    expect(doc["@graph"]).toHaveLength(2);
  });
});

describe("loadJsonLdSnippet — service-senders", () => {
  const svc = loadJsonLdSnippet<Record<string, unknown>>("service-senders");
  it("is a Service for senders + recipients", () => {
    expect(svc["@type"]).toBe("Service");
    const audience = svc.audience as Array<{ audienceType: string }>;
    expect(audience.map((a) => a.audienceType).join("|")).toMatch(/Senders/);
    expect(audience.map((a) => a.audienceType).join("|")).toMatch(/Recipients/);
  });
});

describe("loadJsonLdSnippet — service-transporters", () => {
  const svc = loadJsonLdSnippet<Record<string, unknown>>("service-transporters");
  it("is a Service for transporters", () => {
    expect(svc["@type"]).toBe("Service");
    const audience = svc.audience as Array<{ audienceType: string }>;
    expect(audience[0]?.audienceType).toMatch(/Transporters/);
  });
});

describe("buildFaqPage", () => {
  it("turns Q/A items into a FAQPage with mainEntity Questions", () => {
    const page = buildFaqPage([
      { question: "When?", answer: "Soon." },
      { question: "Free?", answer: "Yes." },
    ]) as unknown as Record<string, unknown>;
    expect(page["@type"]).toBe("FAQPage");
    const me = page.mainEntity as Array<Record<string, unknown>>;
    expect(me).toHaveLength(2);
    expect(me[0]?.["@type"]).toBe("Question");
    expect(me[0]?.name).toBe("When?");
    expect((me[0]?.acceptedAnswer as { text: string }).text).toBe("Soon.");
  });
});

describe("buildBreadcrumbList", () => {
  it("builds positioned ListItems with absolute URLs", () => {
    const bc = buildBreadcrumbList([
      { name: "Acasă", path: "/" },
      { name: "Despre", path: "/despre-proiect" },
    ]) as unknown as Record<string, unknown>;
    expect(bc["@type"]).toBe("BreadcrumbList");
    const items = bc.itemListElement as Array<Record<string, unknown>>;
    expect(items[0]).toMatchObject({ position: 1, name: "Acasă" });
    expect(items[0]?.item).toBe("https://hulubul.com/");
    expect(items[1]).toMatchObject({
      position: 2,
      name: "Despre",
      item: "https://hulubul.com/despre-proiect",
    });
  });
});

describe("serialiseJsonLd", () => {
  it("returns valid JSON", () => {
    const doc = buildGraph([loadJsonLdSnippet("organization")]);
    const json = serialiseJsonLd(doc);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it("escapes </ to neutralise script-tag injection", () => {
    const malicious = { evil: "</script><script>alert(1)</script>" };
    const json = serialiseJsonLd(malicious);
    expect(json).not.toContain("</script>");
  });
});
