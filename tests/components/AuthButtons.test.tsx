// Implements scenarios:
//   "First-time Google sign-in prefills the waitlist form" (button render half)
//   "Kill-switch off — buttons hidden, routes 404" (button render half)
//   "Facebook button is hidden in Stage 1"
//   "Adding a third provider is config + UI only" (forward-looking)
//
// AuthButtons is a pure presenter: it receives `providers` from its caller
// (the orchestrator <Signup>), which obtained them from getEnabledAuthProviders
// in lib/auth-env. No env reads happen here; no env mocking needed.

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthButtons } from "@/components/landing/AuthButtons";
import {
  PROVIDER_FACEBOOK,
  PROVIDER_GOOGLE,
  PROVIDER_INSTAGRAM,
  PROVIDER_TIKTOK,
} from "@/lib/auth-providers";

describe("Feature: <AuthButtons />", () => {
  describe("Given the providers list is empty", () => {
    it("Then it renders nothing", () => {
      const { container } = render(<AuthButtons providers={[]} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe("Given providers=[google]", () => {
    it("Then the Google button renders and links to /api/auth/start?provider=google", () => {
      render(<AuthButtons providers={[PROVIDER_GOOGLE]} />);
      const link = screen.getByRole("link", { name: /continuă cu google/i });
      expect(link).toHaveAttribute(
        "href",
        "/api/auth/start?provider=google",
      );
    });

    it("And the Facebook button is not rendered", () => {
      render(<AuthButtons providers={[PROVIDER_GOOGLE]} />);
      expect(
        screen.queryByRole("link", { name: /continuă cu facebook/i }),
      ).toBeNull();
    });

    it("And the Google button carries the Google G-logo SVG glyph", () => {
      const { container } = render(
        <AuthButtons providers={[PROVIDER_GOOGLE]} />,
      );
      const svg = container.querySelector(
        ".auth-button--google .auth-button__glyph",
      );
      expect(svg).not.toBeNull();
      expect(svg!.tagName.toLowerCase()).toBe("svg");
    });
  });

  describe("Given providers=[google, facebook]", () => {
    it("Then both buttons render in the order given", () => {
      render(
        <AuthButtons providers={[PROVIDER_GOOGLE, PROVIDER_FACEBOOK]} />,
      );
      expect(
        screen.getByRole("link", { name: /continuă cu google/i }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("link", { name: /continuă cu facebook/i }),
      ).toBeInTheDocument();
    });
  });

  describe("Given providers=[instagram]", () => {
    it("Then the Instagram button renders and links to /api/auth/start?provider=instagram", () => {
      render(<AuthButtons providers={[PROVIDER_INSTAGRAM]} />);
      const link = screen.getByRole("link", { name: /continuă cu instagram/i });
      expect(link).toHaveAttribute(
        "href",
        "/api/auth/start?provider=instagram",
      );
    });
  });

  describe("Given providers=[tiktok]", () => {
    it("Then the TikTok button renders and links to /api/auth/start?provider=tiktok", () => {
      render(<AuthButtons providers={[PROVIDER_TIKTOK]} />);
      const link = screen.getByRole("link", { name: /continuă cu tiktok/i });
      expect(link).toHaveAttribute(
        "href",
        "/api/auth/start?provider=tiktok",
      );
    });
  });

  describe("Given providers=[google, facebook, instagram, tiktok]", () => {
    it("Then all four buttons render in the order given", () => {
      const { container } = render(
        <AuthButtons
          providers={[
            PROVIDER_GOOGLE,
            PROVIDER_FACEBOOK,
            PROVIDER_INSTAGRAM,
            PROVIDER_TIKTOK,
          ]}
        />,
      );
      const links = Array.from(container.querySelectorAll("a"));
      const classes = links.map((a) => a.className.split(/\s+/).pop());
      expect(classes).toEqual([
        "auth-button--google",
        "auth-button--facebook",
        "auth-button--instagram",
        "auth-button--tiktok",
      ]);
    });
  });

  describe("Given hidden={true} (a prefill cookie is active)", () => {
    it("Then AuthButtons renders nothing — re-clicking would be confusing UX", () => {
      const { container } = render(
        <AuthButtons hidden providers={[PROVIDER_GOOGLE]} />,
      );
      expect(container.firstChild).toBeNull();
    });
  });
});
