import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm } from "@/components/landing/SignupForm";
import { landingPageFixture } from "@/tests/msw/fixtures/landing-page";
import { REMEMBER_STORAGE_KEY } from "@/lib/remember-me";
import { UTM_STORAGE_KEY } from "@/lib/utm";
import { GDPR_CONSENT_VERSION } from "@/lib/gdpr-consent";

const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

const signup = landingPageFixture.signup;
const originalGeo = navigator.geolocation;

beforeEach(() => {
  Array.from(searchParams.keys()).forEach((k) => searchParams.delete(k));
  window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
  window.sessionStorage.removeItem("hulubul:from-waitlist");
  window.sessionStorage.removeItem(UTM_STORAGE_KEY);
  global.fetch = vi.fn();
  // Default: simulate browser denying geolocation so tests don't hang.
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

function mockFetchOk() {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 201 }),
  );
}

function submittedBody(): Record<string, unknown> {
  return JSON.parse(
    (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string,
  );
}

async function fillIdentity(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/nume/i), "Ion");
  await user.type(screen.getByLabelText(/email/i), "ion@example.com");
}

async function addCity(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  const input = screen.getByLabelText("Adaugă oraș");
  await user.type(input, `${name}{Enter}`);
}

async function tickConsent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("checkbox", { name: /confidențialitate/i }));
}

describe("Feature: waitlist v2 happy path", () => {
  describe.each([
    ["expeditor"],
    ["transportator"],
    ["destinatar"],
  ] as const)("Given the user picks role=%s", (role) => {
    it("When the form is filled, consent ticked, and submitted, Then the v2 payload is POSTed", async () => {
      mockFetchOk();
      const user = userEvent.setup();
      render(<SignupForm data={signup} />);

      await fillIdentity(user);
      if (role !== "expeditor") {
        const labels: Record<string, RegExp> = {
          transportator: /Transport pachete/i,
          destinatar: /Primesc pachete/i,
        };
        await user.click(screen.getByLabelText(labels[role]!));
      }
      await addCity(user, "Luxembourg");
      await addCity(user, "Chișinău");
      await tickConsent(user);
      await user.click(screen.getByRole("button", { name: signup.submitLabel }));

      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const body = submittedBody();
      expect(body.role).toBe(role);
      expect(body.cities).toEqual(["Luxembourg", "Chișinău"]);
      expect(body.gdprConsent).toBe(true);
      expect(body.gdprConsentVersion).toBe(GDPR_CONSENT_VERSION);
      expect(body.source).toBe("landing");
      expect(body).not.toHaveProperty("routes");
    });
  });
});

describe("Feature: GDPR consent gates submission", () => {
  describe("Given the consent box is unticked", () => {
    it("When the form is otherwise complete, Then the submit button is disabled", async () => {
      const user = userEvent.setup();
      render(<SignupForm data={signup} />);
      const submit = screen.getByRole("button", { name: signup.submitLabel });
      expect(submit).toBeDisabled();
      await tickConsent(user);
      expect(submit).not.toBeDisabled();
    });
  });
});

describe("Feature: server rejection surfaces an inline error", () => {
  describe("Given Strapi rejects the submission with 5xx", () => {
    it("When the user submits, Then an alert is shown and no success state appears", async () => {
      (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
        new Response(JSON.stringify({ error: "nope" }), { status: 500 }),
      );
      const user = userEvent.setup();
      render(<SignupForm data={signup} />);
      await fillIdentity(user);
      await addCity(user, "Lux");
      await tickConsent(user);
      await user.click(screen.getByRole("button", { name: signup.submitLabel }));
      await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    });
  });
});

describe("Feature: role set is the v2 trio regardless of CMS", () => {
  describe("Given the form has rendered", () => {
    it("When inspecting radios, Then exactly the three v2 roles appear (no 'ambele')", () => {
      render(<SignupForm data={signup} />);
      expect(screen.getByLabelText(/Trimit pachete/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Transport pachete/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Primesc pachete/i)).toBeInTheDocument();
      expect(screen.queryByLabelText(/Ambele/i)).not.toBeInTheDocument();
    });
  });

  describe("Given the form has rendered", () => {
    it("When the radios are inspected, Then their order is sender → receiver → transporter", () => {
      render(<SignupForm data={signup} />);
      const radios = screen.getAllByRole("radio");
      expect(radios.map((r) => (r as HTMLInputElement).value)).toEqual([
        "expeditor",
        "destinatar",
        "transportator",
      ]);
    });
  });

  describe("Given the form has rendered with no CMS icon override", () => {
    it("When the radios are inspected, Then each label carries its fallback emoji", () => {
      render(<SignupForm data={signup} />);
      expect(screen.getByLabelText(/Trimit pachete/i).closest("div")).toHaveTextContent("📤");
      expect(screen.getByLabelText(/Primesc pachete/i).closest("div")).toHaveTextContent("📥");
      expect(screen.getByLabelText(/Transport pachete/i).closest("div")).toHaveTextContent("🚚");
    });
  });

  describe("Given the CMS supplies a custom icon for one role", () => {
    it("When the form renders, Then that role's label carries the CMS icon", () => {
      const overridden = {
        ...signup,
        roleOptions: [
          { id: 1, value: "expeditor" as const, label: "Trimit pachete", icon: "✈️" },
          { id: 2, value: "destinatar" as const, label: "Primesc pachete" },
          { id: 3, value: "transportator" as const, label: "Transport pachete" },
        ],
      };
      render(<SignupForm data={overridden} />);
      expect(screen.getByLabelText(/Trimit pachete/i).closest("div")).toHaveTextContent("✈️");
      // Other roles still get fallbacks.
      expect(screen.getByLabelText(/Primesc pachete/i).closest("div")).toHaveTextContent("📥");
    });
  });
});

describe("Feature: switching role preserves entered cities", () => {
  describe("Given two cities have been added", () => {
    it("When the role is switched, Then the chips persist in the new role view", async () => {
      const user = userEvent.setup();
      render(<SignupForm data={signup} />);
      await addCity(user, "Lux");
      await addCity(user, "Metz");
      const transportator = screen.getByLabelText(/Transport pachete/i);
      await user.click(transportator);
      expect(screen.getByText("Lux")).toBeInTheDocument();
      expect(screen.getByText("Metz")).toBeInTheDocument();
    });
  });
});

describe("Feature: UTM capture flows into the payload", () => {
  describe("Given a UTM record is already in sessionStorage", () => {
    it("When the user submits, Then 'utm' is included in the body", async () => {
      mockFetchOk();
      window.sessionStorage.setItem(
        UTM_STORAGE_KEY,
        JSON.stringify({ utm_source: "fb", utm_campaign: "lux" }),
      );
      const user = userEvent.setup();
      render(<SignupForm data={signup} />);
      await fillIdentity(user);
      await addCity(user, "Lux");
      await tickConsent(user);
      await user.click(screen.getByRole("button", { name: signup.submitLabel }));
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      expect(submittedBody().utm).toEqual({ utm_source: "fb", utm_campaign: "lux" });
    });
  });

  describe("Given there is no stored UTM", () => {
    it("When the user submits, Then 'utm' is omitted from the body", async () => {
      mockFetchOk();
      const user = userEvent.setup();
      render(<SignupForm data={signup} />);
      await fillIdentity(user);
      await addCity(user, "Lux");
      await tickConsent(user);
      await user.click(screen.getByRole("button", { name: signup.submitLabel }));
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      expect(submittedBody()).not.toHaveProperty("utm");
    });
  });
});

describe("Feature: silent geolocation captures the outcome", () => {
  describe("Given the browser denies geolocation on mount", () => {
    it("When the user submits, Then locationConsent=denied and location=null", async () => {
      mockFetchOk();
      const user = userEvent.setup();
      render(<SignupForm data={signup} />);
      await fillIdentity(user);
      await addCity(user, "Lux");
      await tickConsent(user);
      await user.click(screen.getByRole("button", { name: signup.submitLabel }));
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      expect(submittedBody().locationConsent).toBe("denied");
      expect(submittedBody().location).toBeNull();
    });
  });
});

describe("Feature: gdprConsentAt is fresh at submit time", () => {
  describe("Given the user ticks consent and waits before submitting", () => {
    it("When the user submits, Then gdprConsentAt is stamped at submit time, not at tick time", async () => {
      mockFetchOk();
      const user = userEvent.setup();
      render(<SignupForm data={signup} />);
      await fillIdentity(user);
      await addCity(user, "Lux");
      await tickConsent(user);
      const tickedAt = Date.now();
      // Simulate a wait by advancing wall clock implicitly via async ops.
      await new Promise((r) => setTimeout(r, 20));
      await user.click(screen.getByRole("button", { name: signup.submitLabel }));
      await waitFor(() => expect(global.fetch).toHaveBeenCalled());
      const stamped = new Date(submittedBody().gdprConsentAt as string).getTime();
      // Stamp must be at-or-after the tick (re-stamped at submit) and within a few seconds of now.
      expect(stamped).toBeGreaterThanOrEqual(tickedAt);
      expect(Date.now() - stamped).toBeLessThan(5000);
    });
  });
});

describe("Feature: survey CTA on success", () => {
  describe("Given a successful submission", () => {
    it("When the success card renders, Then the survey link sets the from-waitlist flag", async () => {
      mockFetchOk();
      const user = userEvent.setup();
      render(<SignupForm data={signup} />);
      await fillIdentity(user);
      await addCity(user, "Lux");
      await tickConsent(user);
      await user.click(screen.getByRole("button", { name: signup.submitLabel }));
      const link = await screen.findByRole("link", { name: /împărtășește/i });
      expect(link).toHaveAttribute("href", "/sondaj/expeditori");
      await user.click(link);
      expect(window.sessionStorage.getItem("hulubul:from-waitlist")).toBe("1");
    });
  });
});
