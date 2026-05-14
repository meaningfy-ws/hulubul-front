import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SITE_DESCRIPTION,
  PRODUCTION_SITE_URL,
  SITE_NAME,
  getMetadataBase,
  makeCanonical,
  makeOgImage,
} from "@/lib/seo";

beforeEach(() => {
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getMetadataBase", () => {
  it("returns the env value when NEXT_PUBLIC_SITE_URL is set", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://staging.hulubul.com");
    expect(getMetadataBase().href).toBe("https://staging.hulubul.com/");
  });

  it("falls back to the production URL when env is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "");
    expect(getMetadataBase().href).toBe(`${PRODUCTION_SITE_URL}/`);
  });

  it("strips trailing slashes", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://example.com///");
    expect(getMetadataBase().href).toBe("https://example.com/");
  });
});

describe("makeCanonical", () => {
  it("returns the absolute URL for a known path", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hulubul.com");
    expect(makeCanonical("/sondaj/expeditori")).toBe(
      "https://hulubul.com/sondaj/expeditori",
    );
  });

  it("normalises a path missing its leading slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hulubul.com");
    expect(makeCanonical("rute")).toBe("https://hulubul.com/rute");
  });

  it("preserves the root path as a single trailing slash", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hulubul.com");
    expect(makeCanonical("/")).toBe("https://hulubul.com/");
  });
});

describe("makeOgImage", () => {
  it("returns the absolute /og URL with title encoded", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hulubul.com");
    expect(makeOgImage("Despre proiect")).toBe(
      "https://hulubul.com/og?title=Despre+proiect",
    );
  });

  it("includes subtitle when supplied", () => {
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://hulubul.com");
    expect(makeOgImage("Termeni", "ediția 2026")).toBe(
      "https://hulubul.com/og?title=Termeni&subtitle=edi%C8%9Bia+2026",
    );
  });
});

describe("constants", () => {
  it("SITE_NAME is hulubul.com", () => {
    expect(SITE_NAME).toBe("hulubul.com");
  });

  it("DEFAULT_SITE_DESCRIPTION is non-empty Romanian copy", () => {
    expect(DEFAULT_SITE_DESCRIPTION.length).toBeGreaterThan(40);
  });
});
