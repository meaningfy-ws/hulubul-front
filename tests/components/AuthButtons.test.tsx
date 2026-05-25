// Implements scenarios:
//   "First-time Google sign-in prefills the waitlist form" (button render half)
//   "Kill-switch off — buttons hidden, routes 404" (button render half)
//   "Facebook button is hidden in Stage 1"
//   "Adding a third provider is config + UI only" (forward-looking)

import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthButtons } from "@/components/landing/AuthButtons";

const KEYS = [
  "NEXT_PUBLIC_AUTH_ENABLED",
  "ZITADEL_IDP_GOOGLE",
  "ZITADEL_IDP_FACEBOOK",
];

let snapshot: Record<string, string | undefined> = {};

beforeEach(() => {
  snapshot = {};
  for (const k of KEYS) {
    snapshot[k] = process.env[k];
    delete process.env[k];
  }
});

afterEach(() => {
  for (const k of KEYS) {
    if (snapshot[k] === undefined) delete process.env[k];
    else process.env[k] = snapshot[k];
  }
});

describe("Feature: <AuthButtons />", () => {
  describe("Given the kill-switch is off", () => {
    it("Then it renders nothing", () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = "false";
      const { container } = render(<AuthButtons />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Given the kill-switch is on and Google IdP is configured", () => {
    it("Then the Google button renders and links to /api/auth/start?provider=google", () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = "true";
      process.env.ZITADEL_IDP_GOOGLE = "222";
      render(<AuthButtons />);
      const link = screen.getByRole("link", { name: /continuă cu google/i });
      expect(link).toHaveAttribute(
        "href",
        "/api/auth/start?provider=google",
      );
    });
  });

  describe("Given Facebook IdP env is NOT set", () => {
    it("Then the Facebook button is not rendered (Stage-1 default)", () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = "true";
      process.env.ZITADEL_IDP_GOOGLE = "222";
      render(<AuthButtons />);
      expect(
        screen.queryByRole("link", { name: /continuă cu facebook/i }),
      ).toBeNull();
    });
  });

  describe("Given Facebook IdP env IS set (forward-compat sanity)", () => {
    it("Then the Facebook button renders alongside Google", () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = "true";
      process.env.ZITADEL_IDP_GOOGLE = "222";
      process.env.ZITADEL_IDP_FACEBOOK = "333";
      render(<AuthButtons />);
      expect(
        screen.getByRole("link", { name: /continuă cu google/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /continuă cu facebook/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Given no IdP env is configured but the switch is on", () => {
    it("Then no buttons render (no IdP → no button)", () => {
      process.env.NEXT_PUBLIC_AUTH_ENABLED = "true";
      const { container } = render(<AuthButtons />);
      expect(container.querySelectorAll("a").length).toBe(0);
    });
  });
});
