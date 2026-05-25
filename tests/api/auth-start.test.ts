// @vitest-environment node
// Implements scenarios:
//   "Kill-switch off — buttons hidden, routes 404"
//   "Zitadel is unreachable when starting auth"
//   "Open-redirect attempt via return_to is rejected"
// and the happy 302 + flow cookie set.

import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { HttpResponse, http } from "msw";
import { server } from "@/tests/msw/server";
import {
  applyTestZitadelEnv,
  clearTestZitadelEnv,
  setupMockZitadel,
  TEST_ZITADEL_ENV,
} from "@/tests/lib/zitadel.test-helper";
import { __resetZitadelCache } from "@/lib/zitadel";
import { OIDC_FLOW_COOKIE } from "@/lib/cookies";

let GET: typeof import("@/app/api/auth/start/route")["GET"];

beforeEach(async () => {
  applyTestZitadelEnv();
  __resetZitadelCache();
  await setupMockZitadel();
  // Re-import the route module to pick up env changes between tests.
  ({ GET } = await import("@/app/api/auth/start/route"));
});

afterEach(() => {
  clearTestZitadelEnv();
  __resetZitadelCache();
});

function req(url: string) {
  return new Request(url);
}

describe("Feature: GET /api/auth/start", () => {
  describe("Given a happy Google start request", () => {
    it("Then it responds 302 to the Zitadel authorize URL and sets the flow cookie", async () => {
      const res = await GET(req("http://localhost:3000/api/auth/start?provider=google"));
      expect(res.status).toBe(302);
      const location = res.headers.get("location") ?? "";
      expect(location).toContain(
        `${TEST_ZITADEL_ENV.issuer}/oauth/v2/authorize`,
      );
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).toContain(OIDC_FLOW_COOKIE + "=");
      expect(setCookie.toLowerCase()).toContain("httponly");
      expect(setCookie.toLowerCase()).toContain("samesite=lax");
      expect(setCookie.toLowerCase()).toContain("path=/");
    });

    it("Then the redirect URL includes idp_hint=<google_idp_id>", async () => {
      const res = await GET(req("http://localhost:3000/api/auth/start?provider=google"));
      const url = new URL(res.headers.get("location")!);
      expect(url.searchParams.get("idp_hint")).toBe(
        TEST_ZITADEL_ENV.idpGoogle,
      );
    });
  });

  describe("Given the kill-switch is off", () => {
    it("Then GET /api/auth/start returns 404", async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = "false";
      __resetZitadelCache();
      ({ GET } = await import("@/app/api/auth/start/route"));
      const res = await GET(req("http://localhost:3000/api/auth/start?provider=google"));
      expect(res.status).toBe(404);
    });
  });

  describe("Given an unsupported provider", () => {
    it("Then GET /api/auth/start returns 400", async () => {
      const res = await GET(req("http://localhost:3000/api/auth/start?provider=tiktok"));
      expect(res.status).toBe(400);
    });
    it("And a missing provider param returns 400", async () => {
      const res = await GET(req("http://localhost:3000/api/auth/start"));
      expect(res.status).toBe(400);
    });
  });

  describe("Given Zitadel's discovery endpoint is unreachable", () => {
    it("Then GET /api/auth/start redirects to /#signup?auth_status=unreachable with no flow cookie", async () => {
      server.use(
        http.get(
          `${TEST_ZITADEL_ENV.issuer}/.well-known/openid-configuration`,
          () => HttpResponse.json({ error: "down" }, { status: 500 }),
        ),
      );
      __resetZitadelCache();
      const res = await GET(req("http://localhost:3000/api/auth/start?provider=google"));
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe(
        "/#signup?auth_status=unreachable",
      );
      const setCookie = res.headers.get("set-cookie") ?? "";
      expect(setCookie).not.toContain(OIDC_FLOW_COOKIE + "=ey");
    });
  });

  describe("Given an attacker provides a return_to query param", () => {
    it("Then the parameter is ignored and the flow proceeds with the hardcoded target", async () => {
      const res = await GET(
        req(
          "http://localhost:3000/api/auth/start?provider=google&return_to=https://evil.example.com",
        ),
      );
      expect(res.status).toBe(302);
      const location = res.headers.get("location") ?? "";
      expect(location).not.toContain("evil.example.com");
    });
  });
});
