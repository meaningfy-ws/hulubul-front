# STORY 5 — Rewire `<SignupForm>`

**Goal:** Replace the `routes` text field, drop `ambele`, add `destinatar`, mount `<CitiesQuestion>`, `<LocationPrompt>`, `<GdprConsent>`, capture UTM on mount, build the new payload, keep remember-me + survey CTA + error inline behaviour.

**Files:**
- Modify: `components/landing/SignupForm.tsx`
- Modify: `tests/components/SignupForm.test.tsx` (rewrite — old tests reference `routes` and `ambele`)
- Reference (read-only): `components/landing/CitiesQuestion.tsx`, `LocationPrompt.tsx`, `GdprConsent.tsx`, `lib/utm.ts`, `lib/waitlist-schema.ts`.

---

## Task 5.1 — Rewrite the test file

- [ ] **Step 1: Replace `tests/components/SignupForm.test.tsx`**

> The previous test file used `routes` and `ambele`. Replace it entirely with the new suite below. Keep imports and helpers similar in spirit.

```tsx
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
  Object.defineProperty(navigator, "geolocation", { value: originalGeo, configurable: true });
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

async function addCity(user: ReturnType<typeof userEvent.setup>, name: string) {
  // CityTagInput accepts free-text Enter without an autocomplete pick.
  const input = screen.getByLabelText("Adaugă oraș");
  await user.type(input, `${name}{Enter}`);
}

async function tickConsent(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("checkbox", { name: /confidențialitate/i }));
}

describe("<SignupForm> — submit happy path per role", () => {
  it.each([
    ["expeditor"],
    ["transportator"],
    ["destinatar"],
  ] as const)("submits cities + role=%s + consent", async (role) => {
    mockFetchOk();
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);
    await fillIdentity(user);
    if (role !== "expeditor") {
      const radio = screen.getByLabelText(
        signup.roleOptions.find((o) => o.value === role)!.label,
      );
      await user.click(radio);
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

describe("<SignupForm> — submit gating", () => {
  it("submit is disabled until consent is ticked", async () => {
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);
    const submit = screen.getByRole("button", { name: signup.submitLabel });
    expect(submit).toBeDisabled();
    await tickConsent(user);
    expect(submit).not.toBeDisabled();
  });

  it("shows inline error on server rejection", async () => {
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

describe("<SignupForm> — role switch preserves cities", () => {
  it("switching role keeps the cities array", async () => {
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);
    await addCity(user, "Lux");
    await addCity(user, "Metz");
    const transportator = screen.getByLabelText(
      signup.roleOptions.find((o) => o.value === "transportator")!.label,
    );
    await user.click(transportator);
    expect(screen.getByText("Lux")).toBeInTheDocument();
    expect(screen.getByText("Metz")).toBeInTheDocument();
  });
});

describe("<SignupForm> — UTM in payload", () => {
  it("flows stored UTM into the request body", async () => {
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

  it("omits utm when sessionStorage is empty", async () => {
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

describe("<SignupForm> — location prompt in payload", () => {
  it("denied location → locationConsent=denied, location=null", async () => {
    mockFetchOk();
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);
    await fillIdentity(user);
    await addCity(user, "Lux");
    await user.click(screen.getByRole("button", { name: /nu, ascunde/i }));
    await tickConsent(user);
    await user.click(screen.getByRole("button", { name: signup.submitLabel }));
    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(submittedBody().locationConsent).toBe("denied");
    expect(submittedBody().location).toBeNull();
  });
});

describe("<SignupForm> — survey CTA on success", () => {
  it("renders /sondaj/expeditori link and sets sessionStorage flag on click", async () => {
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
```

- [ ] **Step 2: Run — expect FAIL** (form still has the old shape).

```
npx vitest run tests/components/SignupForm.test.tsx
```

---

## Task 5.2 — Update the `landing-page` fixture

The fixture in `tests/msw/fixtures/landing-page.ts` provides `roleOptions`. Update those entries (and any module-level type defaults) so the tests can find a `destinatar` label.

- [ ] **Step 1: Open `tests/msw/fixtures/landing-page.ts`** and replace the `roleOptions` array with:

```ts
roleOptions: [
  { id: 1, value: "expeditor", label: "Trimit pachete" },
  { id: 2, value: "transportator", label: "Transport pachete" },
  { id: 3, value: "destinatar", label: "Primesc pachete" },
],
```

- [ ] **Step 2: If the role option type (likely in `lib/types.ts`) restricts `value` to `expeditor|transportator|ambele`,** widen it to include `destinatar`. Search:

```
grep -n "ambele\|expeditor\|transportator" lib/types.ts
```

Update the `Role` (or equivalent) type to `"expeditor" | "transportator" | "destinatar"`. Remove `ambele`.

- [ ] **Step 3: Commit (intermediate)**

```
git add tests/msw/fixtures/landing-page.ts lib/types.ts
git commit -m "chore(waitlist): widen Role type to include destinatar"
```

---

## Task 5.3 — Rewrite `SignupForm.tsx`

- [ ] **Step 1: Replace `components/landing/SignupForm.tsx`**

```tsx
"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import type { Role, SignupSection } from "@/lib/types";
import {
  clearRememberedIdentity,
  readRemembered,
  saveRemembered,
} from "@/lib/remember-me";
import { CitiesQuestion } from "@/components/landing/CitiesQuestion";
import { LocationPrompt, type LocationPromptValue } from "@/components/landing/LocationPrompt";
import { GdprConsent, type GdprConsentValue } from "@/components/landing/GdprConsent";
import { captureUtmFromUrl, readStoredUtm } from "@/lib/utm";

type Status = "idle" | "submitting" | "success" | "error";

const ROLES: readonly Role[] = ["expeditor", "transportator", "destinatar"] as const;

function parseRole(value: string | null, fallback: Role): Role {
  if (value && (ROLES as readonly string[]).includes(value)) return value as Role;
  return fallback;
}

export function SignupForm({ data }: { data: SignupSection }) {
  const searchParams = useSearchParams();
  const defaultRole = (data.roleDefault as Role) ?? "expeditor";
  const initialRole = useMemo(
    () => parseRole(searchParams?.get("role") ?? null, defaultRole),
    [searchParams, defaultRole],
  );

  const [role, setRole] = useState<Role>(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [remember, setRemember] = useState(true);
  const [hasPrefill, setHasPrefill] = useState(false);
  const [location, setLocation] = useState<LocationPromptValue>({
    consent: "not_asked",
    location: null,
  });
  const [consent, setConsent] = useState<GdprConsentValue>({
    consent: false,
    consentAt: null,
    version: "",
  });
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const remembered = readRemembered();
    if (remembered) {
      setName(remembered.name);
      setEmail(remembered.email);
      if (remembered.whatsapp) setWhatsapp(remembered.whatsapp);
      setRemember(true);
      setHasPrefill(true);
    }
    if (typeof window !== "undefined") {
      captureUtmFromUrl(window.location.search, document.referrer);
    }
  }, []);

  function handleClearIdentity() {
    clearRememberedIdentity();
    setName("");
    setEmail("");
    setWhatsapp("");
    setRemember(false);
    setHasPrefill(false);
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!consent.consent || !consent.consentAt) return;
    setStatus("submitting");
    setErrorMessage(null);

    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    const trimmedWhatsapp = whatsapp.trim();

    const payload: Record<string, unknown> = {
      name: trimmedName,
      email: trimmedEmail,
      role,
      cities,
      source: "landing",
      gdprConsent: true,
      gdprConsentAt: consent.consentAt,
      gdprConsentVersion: consent.version,
      locationConsent: location.consent,
      location: location.location,
      client: {
        viewport:
          typeof window !== "undefined"
            ? { w: window.innerWidth, h: window.innerHeight }
            : undefined,
        timezone:
          typeof Intl !== "undefined"
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : undefined,
      },
    };
    if (trimmedWhatsapp) payload.whatsapp = trimmedWhatsapp;

    const utm = readStoredUtm();
    if (utm && Object.keys(utm).length > 0) payload.utm = utm;

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const json = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(json?.error ?? `Request failed (${res.status})`);
      }
      if (remember) {
        saveRemembered({
          name: trimmedName,
          email: trimmedEmail,
          whatsapp: trimmedWhatsapp || undefined,
        });
      } else {
        clearRememberedIdentity();
      }
      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "A apărut o eroare. Încearcă din nou, te rog.",
      );
    }
  }

  if (status === "success") {
    function goToSurvey() {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem("hulubul:from-waitlist", "1");
      }
    }
    return (
      <div className="form-success" role="status">
        <div className="success-icon" aria-hidden="true">✓</div>
        <h3>{data.successTitle}</h3>
        <p>{data.successMessage}</p>
        <div className="form-success-cta">
          <Link href="/sondaj/expeditori" className="cta-primary" onClick={goToSurvey}>
            Împărtășește experiența ta de expeditor (3 min)
          </Link>
          <p className="form-success-secondary">
            <Link href="/">Rămâi pe pagina principală</Link>
          </p>
        </div>
      </div>
    );
  }

  const submitDisabled = status === "submitting" || !consent.consent;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="form-group">
        <div className="form-label-row">
          <label htmlFor="waitlist-name">
            {data.nameLabel}
            {data.nameHint ? <span className="hint">{data.nameHint}</span> : null}
          </label>
          {hasPrefill ? (
            <button type="button" className="form-identity-clear" onClick={handleClearIdentity}>
              Nu ești tu? Șterge.
            </button>
          ) : null}
        </div>
        <input id="waitlist-name" name="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="form-group">
        <label htmlFor="waitlist-email">
          Email
          <span className="hint">Aici îți trimitem anunțul de lansare.</span>
        </label>
        <input id="waitlist-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
      </div>

      <div className="form-group">
        <label htmlFor="waitlist-whatsapp">
          WhatsApp
          <span className="hint">Opțional — mai rapid pentru anunțuri scurte.</span>
        </label>
        <input id="waitlist-whatsapp" name="whatsapp" type="tel" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} autoComplete="tel" />
      </div>

      <div className="form-group">
        <label>{data.roleLabel}</label>
        <div className="radio-group" role="radiogroup">
          {data.roleOptions.map((option) => {
            const id = `waitlist-role-${option.value}`;
            return (
              <div key={option.id} className="radio-option">
                <input
                  id={id}
                  type="radio"
                  name="role"
                  value={option.value}
                  checked={role === option.value}
                  onChange={() => setRole(option.value as Role)}
                />
                <label htmlFor={id}>{option.label}</label>
              </div>
            );
          })}
        </div>
      </div>

      <CitiesQuestion role={role} value={cities} onChange={setCities} />

      <LocationPrompt onChange={setLocation} />

      <div className="form-remember">
        <input
          id="waitlist-remember"
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />
        <label htmlFor="waitlist-remember">
          Reține-mă pe acest dispozitiv
          <span className="hint">
            Data viitoare găsești formularul deja completat. Datele rămân doar aici — le poți șterge oricând.
          </span>
        </label>
      </div>

      <GdprConsent onChange={setConsent} />

      <button type="submit" className="form-submit" disabled={submitDisabled}>
        {status === "submitting" ? "Se înscrie..." : data.submitLabel}
      </button>

      {data.privacyNote ? <p className="form-footer">{data.privacyNote}</p> : null}

      {status === "error" && errorMessage ? (
        <p className="form-error" role="alert">
          {errorMessage}
        </p>
      ) : null}
    </form>
  );
}
```

- [ ] **Step 2: Run the SignupForm tests — expect PASS**

```
npx vitest run tests/components/SignupForm.test.tsx
```

If a test fails because the cities `<input>` aria-label is "Adaugă oraș" but the helper looked it up case-insensitively, adjust the helper. The label is set in `CityTagInput`.

- [ ] **Step 3: Run the full suite**

```
npx vitest run
```

Expect green except possibly route-handler tests (those are STORY 6).

- [ ] **Step 4: Commit**

```
git add components/landing/SignupForm.tsx tests/components/SignupForm.test.tsx
git commit -m "feat(waitlist): rewire SignupForm to v2 (cities, consent, location, utm)"
```
