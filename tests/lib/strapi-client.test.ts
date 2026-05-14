import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import {
  StrapiAuthError,
  StrapiNotFoundError,
  StrapiUpstreamError,
  authHeaders,
  isStrapiAuthError,
  isStrapiError,
  isStrapiNotFound,
  isStrapiUpstreamError,
  strapiFetch,
  strapiUrl,
  throwStrapiError,
} from "@/lib/strapi-client";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("strapiUrl", () => {
  it("returns the URL with trailing slashes stripped", () => {
    vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", "https://api.example.com///");
    expect(strapiUrl()).toBe("https://api.example.com");
  });

  it("throws when NEXT_PUBLIC_STRAPI_URL is unset", () => {
    vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", "");
    expect(() => strapiUrl()).toThrow(/NEXT_PUBLIC_STRAPI_URL/);
  });
});

describe("authHeaders", () => {
  it("returns Authorization header when token present", () => {
    expect(authHeaders()).toEqual({ Authorization: "Bearer test-token" });
  });

  it("returns empty object when token absent", () => {
    vi.stubEnv("STRAPI_API_TOKEN", "");
    expect(authHeaders()).toEqual({});
  });
});

describe("strapiFetch", () => {
  it("prepends the base URL and merges auth headers", async () => {
    let captured: { url: string; auth: string | null } = { url: "", auth: null };
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/probe`, ({ request }) => {
        captured = {
          url: request.url,
          auth: request.headers.get("authorization"),
        };
        return HttpResponse.json({ data: [] });
      }),
    );
    const res = await strapiFetch("/api/probe");
    expect(res.status).toBe(200);
    expect(captured.url).toBe(`${TEST_STRAPI_URL}/api/probe`);
    expect(captured.auth).toBe("Bearer test-token");
  });

  it("normalises a path missing its leading slash", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/no-slash`, () =>
        HttpResponse.json({ ok: true }),
      ),
    );
    const res = await strapiFetch("api/no-slash");
    expect(res.status).toBe(200);
  });

  it("respects caller headers (does not lose them)", async () => {
    let contentType: string | null = null;
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/x`, ({ request }) => {
        contentType = request.headers.get("content-type");
        return HttpResponse.json({ ok: true });
      }),
    );
    await strapiFetch("/api/x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    expect(contentType).toBe("application/json");
  });
});

describe("Strapi error classes", () => {
  it("StrapiNotFoundError carries path and status=404", () => {
    const err = new StrapiNotFoundError("/api/foo");
    expect(err.name).toBe("StrapiNotFoundError");
    expect(err.path).toBe("/api/foo");
    expect(err.status).toBe(404);
    expect(err.message).toMatch(/not found/i);
  });

  it("StrapiAuthError carries path and the actual status (401 or 403)", () => {
    const err = new StrapiAuthError("/api/foo", 403);
    expect(err.name).toBe("StrapiAuthError");
    expect(err.path).toBe("/api/foo");
    expect(err.status).toBe(403);
  });

  it("StrapiUpstreamError carries path and status", () => {
    const err = new StrapiUpstreamError("/api/foo", 502);
    expect(err.name).toBe("StrapiUpstreamError");
    expect(err.status).toBe(502);
  });
});

describe("error discriminators (name-based, realm-safe)", () => {
  it("isStrapiError matches the whole hierarchy", () => {
    expect(isStrapiError(new StrapiNotFoundError("/x"))).toBe(true);
    expect(isStrapiError(new StrapiAuthError("/x", 401))).toBe(true);
    expect(isStrapiError(new StrapiUpstreamError("/x", 500))).toBe(true);
    expect(isStrapiError(new Error("plain"))).toBe(false);
    expect(isStrapiError("string")).toBe(false);
  });

  it("specific discriminators only match their own class", () => {
    expect(isStrapiNotFound(new StrapiNotFoundError("/x"))).toBe(true);
    expect(isStrapiNotFound(new StrapiAuthError("/x", 401))).toBe(false);
    expect(isStrapiAuthError(new StrapiAuthError("/x", 401))).toBe(true);
    expect(isStrapiUpstreamError(new StrapiUpstreamError("/x", 500))).toBe(true);
  });

  it("name-based check survives synthetic Error-like objects", () => {
    const synthetic = Object.assign(new Error("forged"), {
      name: "StrapiUpstreamError",
    });
    expect(isStrapiUpstreamError(synthetic)).toBe(true);
  });
});

describe("throwStrapiError", () => {
  it("throws StrapiNotFoundError on 404", () => {
    const res = new Response("", { status: 404 });
    expect(() => throwStrapiError("/api/x", res)).toThrow(StrapiNotFoundError);
  });

  it("throws StrapiAuthError on 401 and 403", () => {
    expect(() => throwStrapiError("/api/x", new Response("", { status: 401 })))
      .toThrow(StrapiAuthError);
    expect(() => throwStrapiError("/api/x", new Response("", { status: 403 })))
      .toThrow(StrapiAuthError);
  });

  it("throws StrapiUpstreamError on other failures", () => {
    expect(() => throwStrapiError("/api/x", new Response("", { status: 500 })))
      .toThrow(StrapiUpstreamError);
    expect(() => throwStrapiError("/api/x", new Response("", { status: 502 })))
      .toThrow(StrapiUpstreamError);
  });
});
