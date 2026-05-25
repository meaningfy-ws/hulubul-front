// Implements scenarios:
//   "Prefill cookie wins over remember-me on the same visit" (parent-component half)
//   "Tampered prefill cookie is silently ignored" (parent-component half)
//   "Kill-switch off — buttons hidden" (AuthButtons mounted iff enabled)
//
// Signup is an async server component that calls next/headers cookies().
// We mock cookies() so the component renders deterministically under jsdom.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { landingPageFixture } from "@/tests/msw/fixtures/landing-page";
import { PREFILL_COOKIE } from "@/lib/cookies";
import {
  PrefillCookieInvalidError,
  type PrefillPayload,
} from "@/lib/prefill-cookie";
import { PROVIDER_GOOGLE } from "@/lib/auth-providers";

const cookieJar = new Map<string, string>();
let nextVerifyResult: PrefillPayload | "invalid" = "invalid";

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get(name: string) {
      const value = cookieJar.get(name);
      return value === undefined ? undefined : { name, value };
    },
  }),
}));

vi.mock("@/lib/prefill-cookie", async () => {
  const actual = await vi.importActual<typeof import("@/lib/prefill-cookie")>(
    "@/lib/prefill-cookie",
  );
  return {
    ...actual,
    verifyPrefillCookie: vi.fn(async () => {
      if (nextVerifyResult === "invalid") {
        throw new actual.PrefillCookieInvalidError("forced by test");
      }
      return nextVerifyResult;
    }),
  };
});

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/components/consent/ConsentProvider", () => ({
  useConsent: () => ({
    state: {
      necessary: true,
      analytics: "denied",
      marketing: "denied",
      version: "test",
      choseAt: null,
      recordId: "rec-1",
    },
    needsBanner: false,
    setChoice: vi.fn(),
  }),
}));

const SECRET = "this-is-a-test-cookie-secret-padding-32+";

beforeEach(() => {
  cookieJar.clear();
  nextVerifyResult = "invalid";
  process.env.NEXT_PUBLIC_AUTH_ENABLED = "true";
  process.env.ZITADEL_IDP_GOOGLE = "222";
  process.env.AUTH_COOKIE_SECRET = SECRET;
});

afterEach(() => {
  delete process.env.NEXT_PUBLIC_AUTH_ENABLED;
  delete process.env.ZITADEL_IDP_GOOGLE;
  delete process.env.AUTH_COOKIE_SECRET;
});

async function resolveServerComponent(node: Promise<React.ReactElement>) {
  // Server components return JSX (sync) in tests. When async, await it.
  return await node;
}

describe("Feature: <Signup /> server component", () => {
  describe("Given a valid prefill cookie is present", () => {
    it("Then it renders SignupForm with the cookie claims passed as initialPrefill", async () => {
      cookieJar.set(PREFILL_COOKIE, "signed-token-placeholder");
      nextVerifyResult = {
        email: "alice@example.com",
        name: "Alice Doe",
        emailVerified: true,
        provider: PROVIDER_GOOGLE,
        iat: Math.floor(Date.now() / 1000),
      };

      const { Signup } = await import("@/components/landing/Signup");
      const tree = await resolveServerComponent(
        Signup({ data: landingPageFixture.signup }) as unknown as Promise<React.ReactElement>,
      );
      render(tree);

      const email = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(email.value).toBe("alice@example.com");
      expect(email).toHaveAttribute("readonly");
      expect(screen.getByText(/verificat prin google/i)).toBeInTheDocument();
    });
  });

  describe("Given a malformed prefill cookie", () => {
    it("Then it renders SignupForm WITHOUT initialPrefill (silent fallback)", async () => {
      cookieJar.set(PREFILL_COOKIE, "garbage");

      const { Signup } = await import("@/components/landing/Signup");
      const tree = await resolveServerComponent(
        Signup({ data: landingPageFixture.signup }) as unknown as Promise<React.ReactElement>,
      );
      render(tree);

      const email = screen.getByLabelText(/email/i) as HTMLInputElement;
      expect(email.value).toBe("");
      expect(email).not.toHaveAttribute("readonly");
      expect(screen.queryByText(/verificat prin google/i)).not.toBeInTheDocument();
    });
  });

  describe("Given the kill-switch is on with Google configured", () => {
    it("Then AuthButtons renders above the form", async () => {
      const { Signup } = await import("@/components/landing/Signup");
      const tree = await resolveServerComponent(
        Signup({ data: landingPageFixture.signup }) as unknown as Promise<React.ReactElement>,
      );
      render(tree);
      expect(
        screen.getByRole("link", { name: /continuă cu google/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Given the kill-switch is off", () => {
    it("Then AuthButtons does not render", async () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = "false";
      const { Signup } = await import("@/components/landing/Signup");
      const tree = await resolveServerComponent(
        Signup({ data: landingPageFixture.signup }) as unknown as Promise<React.ReactElement>,
      );
      render(tree);
      expect(
        screen.queryByRole("link", { name: /continuă cu google/i }),
      ).toBeNull();
    });
  });
});
