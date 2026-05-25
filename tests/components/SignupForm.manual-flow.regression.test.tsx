// Regression guard for Stage-1 auth work.
// Implements scenarios: "Manual signup flow remains unchanged",
// "WhatsApp field is preserved and never prefilled by Google" (manual half).
// Locks the current shape of the manual waitlist submit payload + remember-me
// write so that the Stage-1 prefill plumbing cannot drift these behaviours.

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm } from "@/components/landing/SignupForm";
import { landingPageFixture } from "@/tests/msw/fixtures/landing-page";
import { REMEMBER_STORAGE_KEY } from "@/lib/remember-me";

const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
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

const signup = landingPageFixture.signup;
const originalGeo = navigator.geolocation;

beforeEach(() => {
  Array.from(searchParams.keys()).forEach((k) => searchParams.delete(k));
  window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true, event_id: "evt-1" }), {
      status: 201,
    }),
  );
  Object.defineProperty(navigator, "geolocation", {
    value: {
      getCurrentPosition: (_ok: PositionCallback, err?: PositionErrorCallback) =>
        err?.({ code: 1, message: "denied" } as GeolocationPositionError),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    },
    configurable: true,
  });
});

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", {
    value: originalGeo,
    configurable: true,
  });
});

function submittedBody(): Record<string, unknown> {
  return JSON.parse(
    (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string,
  );
}

describe("Feature: SignupForm manual-flow regression (no Google involvement)", () => {
  describe("Given the user types name, email, role and consents", () => {
    it("When the form is submitted, Then the POST body shape carries no Zitadel-related fields", async () => {
      const user = userEvent.setup();
      render(<SignupForm data={signup} />);

      await user.type(screen.getByLabelText(/nume/i), "Ion");
      await user.type(screen.getByLabelText(/email/i), "ion@example.com");
      await user.click(screen.getByLabelText(/sunt de acord|prelucrarea/i));
      await user.click(screen.getByRole("button", { name: /mă înscriu/i }));

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());

      const body = submittedBody();
      expect(body).toMatchObject({
        name: "Ion",
        email: "ion@example.com",
        role: "expeditor",
        source: "landing",
        gdprConsent: true,
      });
      // Critical: no auth/identity fields leak into the waitlist payload.
      expect(body).not.toHaveProperty("sub");
      expect(body).not.toHaveProperty("zitadelSub");
      expect(body).not.toHaveProperty("provider");
      expect(body).not.toHaveProperty("emailVerified");
      expect(body).not.toHaveProperty("idToken");
      expect(body).not.toHaveProperty("accessToken");
    });

    it("When 'remember me' is on, Then remember-me storage is written without auth metadata", async () => {
      const user = userEvent.setup();
      render(<SignupForm data={signup} />);

      await user.type(screen.getByLabelText(/nume/i), "Ana");
      await user.type(screen.getByLabelText(/email/i), "ana@example.com");
      await user.click(screen.getByLabelText(/sunt de acord|prelucrarea/i));
      await user.click(screen.getByRole("button", { name: /mă înscriu/i }));

      await waitFor(() => {
        const raw = window.localStorage.getItem(REMEMBER_STORAGE_KEY);
        expect(raw).not.toBeNull();
      });
      const stored = JSON.parse(
        window.localStorage.getItem(REMEMBER_STORAGE_KEY)!,
      );
      expect(stored).toMatchObject({ name: "Ana", email: "ana@example.com" });
      expect(stored).not.toHaveProperty("sub");
      expect(stored).not.toHaveProperty("provider");
    });
  });

  describe("Given no Google prefill cookie has ever existed", () => {
    it("When the form mounts, Then the WhatsApp field renders empty and editable", async () => {
      render(<SignupForm data={signup} />);
      const wa = await screen.findByLabelText(/whatsapp/i);
      expect(wa).toBeInTheDocument();
      expect(wa).toHaveValue("");
      expect(wa).not.toHaveAttribute("readonly");
      expect(wa).not.toBeDisabled();
    });
  });
});
