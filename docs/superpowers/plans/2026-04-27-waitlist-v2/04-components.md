# STORY 4 — Three new client components

**Goal:** Build the three small client components that `SignupForm` will mount in STORY 5:
1. `<CitiesQuestion>` — picks role-driven label/hint and renders `<CityTagInput>`.
2. `<LocationPrompt>` — geolocation consent panel.
3. `<GdprConsent>` — required checkbox with timestamp + version stamp.

**Files:**
- Create: `components/landing/CitiesQuestion.tsx`
- Create: `components/landing/LocationPrompt.tsx`
- Create: `components/landing/GdprConsent.tsx`
- Create: `tests/components/CitiesQuestion.test.tsx`
- Create: `tests/components/LocationPrompt.test.tsx`
- Create: `tests/components/GdprConsent.test.tsx`

---

## Task 4.1 — `<CitiesQuestion>`

- [ ] **Step 1: Write failing tests**

`tests/components/CitiesQuestion.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CitiesQuestion } from "@/components/landing/CitiesQuestion";

describe("<CitiesQuestion>", () => {
  it("renders the sender label for role=expeditor", () => {
    render(<CitiesQuestion role="expeditor" value={[]} onChange={() => {}} />);
    expect(screen.getByText(/de unde trimiți și unde trebuie să ajungă/i)).toBeInTheDocument();
  });

  it("renders the receiver label for role=destinatar", () => {
    render(<CitiesQuestion role="destinatar" value={[]} onChange={() => {}} />);
    expect(screen.getByText(/de unde pleacă pachetul tău și unde trebuie să ajungă/i)).toBeInTheDocument();
  });

  it("renders the transporter label for role=transportator", () => {
    render(<CitiesQuestion role="transportator" value={[]} onChange={() => {}} />);
    expect(screen.getByText(/de unde pleci și prin ce orașe livrezi pachete/i)).toBeInTheDocument();
  });

  it("shows Plecare/Destinație badges for every role", () => {
    for (const role of ["expeditor", "destinatar", "transportator"] as const) {
      const { unmount } = render(
        <CitiesQuestion role={role} value={["A", "B"]} onChange={() => {}} />,
      );
      expect(screen.getByText("Plecare")).toBeInTheDocument();
      expect(screen.getByText("Destinație")).toBeInTheDocument();
      unmount();
    }
  });

  it("forwards onChange from CityTagInput", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<CitiesQuestion role="expeditor" value={["A"]} onChange={onChange} />);
    // Remove A to verify the wiring (no autocomplete needed).
    await user.click(screen.getByRole("button", { name: /Elimină A/i }));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith([]));
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `components/landing/CitiesQuestion.tsx`**

```tsx
"use client";

import { CityTagInput } from "@/components/routes/CityTagInput";
import type { Role } from "@/lib/waitlist-schema";

interface Copy {
  label: string;
  hint: string;
}

const COPY: Record<Role, Copy> = {
  expeditor: {
    label: "De unde trimiți și unde trebuie să ajungă pachetul?",
    hint: "Primul oraș = de unde pleacă pachetul. Ultimul = unde trebuie să ajungă. Adaugă escale dacă vrei.",
  },
  destinatar: {
    label: "De unde pleacă pachetul tău și unde trebuie să ajungă?",
    hint: "Primul oraș = de unde pleacă pachetul. Ultimul = unde îl primești.",
  },
  transportator: {
    label: "De unde pleci și prin ce orașe livrezi pachete?",
    hint: "Primul oraș = de unde pleci. Ordinea contează — adaugă orașele în ordinea aproximativă a rutei tale.",
  },
};

interface Props {
  role: Role;
  value: string[];
  onChange: (cities: string[]) => void;
}

export function CitiesQuestion({ role, value, onChange }: Props) {
  const copy = COPY[role];
  return (
    <div className="form-group">
      <label htmlFor="waitlist-cities">
        {copy.label}
        <span className="hint">{copy.hint}</span>
      </label>
      <div id="waitlist-cities">
        <CityTagInput
          value={value}
          onChange={onChange}
          originDestinationLabels={true}
        />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```
git add components/landing/CitiesQuestion.tsx tests/components/CitiesQuestion.test.tsx
git commit -m "feat(waitlist): CitiesQuestion role-driven copy wrapper"
```

---

## Task 4.2 — `<GdprConsent>`

- [ ] **Step 1: Write failing tests**

`tests/components/GdprConsent.test.tsx`:

```tsx
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GdprConsent } from "@/components/landing/GdprConsent";
import { GDPR_CONSENT_VERSION } from "@/lib/gdpr-consent";

describe("<GdprConsent>", () => {
  it("renders unchecked by default and emits consent=false", () => {
    const onChange = vi.fn();
    render(<GdprConsent onChange={onChange} />);
    const cb = screen.getByRole("checkbox");
    expect(cb).not.toBeChecked();
  });

  it("on tick, emits consent=true with iso consentAt and the static version", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GdprConsent onChange={onChange} />);
    await user.click(screen.getByRole("checkbox"));
    expect(onChange).toHaveBeenLastCalledWith({
      consent: true,
      consentAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
      version: GDPR_CONSENT_VERSION,
    });
  });

  it("on untick, emits consent=false with consentAt=null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<GdprConsent onChange={onChange} />);
    const cb = screen.getByRole("checkbox");
    await user.click(cb);
    await user.click(cb);
    expect(onChange).toHaveBeenLastCalledWith({
      consent: false,
      consentAt: null,
      version: GDPR_CONSENT_VERSION,
    });
  });

  it("renders a link to /privacy that opens in a new tab", () => {
    render(<GdprConsent onChange={() => {}} />);
    const link = screen.getByRole("link", { name: /politica de confidențialitate/i });
    expect(link).toHaveAttribute("href", "/privacy");
    expect(link).toHaveAttribute("target", "_blank");
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `components/landing/GdprConsent.tsx`**

```tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { GDPR_CONSENT_VERSION } from "@/lib/gdpr-consent";

export interface GdprConsentValue {
  consent: boolean;
  consentAt: string | null;
  version: string;
}

interface Props {
  onChange: (value: GdprConsentValue) => void;
}

export function GdprConsent({ onChange }: Props) {
  const [checked, setChecked] = useState(false);

  function handle(next: boolean) {
    setChecked(next);
    onChange({
      consent: next,
      consentAt: next ? new Date().toISOString() : null,
      version: GDPR_CONSENT_VERSION,
    });
  }

  return (
    <div className="form-consent">
      <input
        id="waitlist-gdpr"
        type="checkbox"
        checked={checked}
        onChange={(e) => handle(e.target.checked)}
      />
      <label htmlFor="waitlist-gdpr">
        Sunt de acord cu{" "}
        <Link href="/privacy" target="_blank" rel="noopener">
          politica de confidențialitate
        </Link>{" "}
        și cu prelucrarea datelor mele pentru anunțul de lansare Hulubul.
      </label>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```
git add components/landing/GdprConsent.tsx tests/components/GdprConsent.test.tsx
git commit -m "feat(waitlist): GdprConsent checkbox with timestamp + version"
```

---

## Task 4.3 — `<LocationPrompt>`

- [ ] **Step 1: Write failing tests**

`tests/components/LocationPrompt.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocationPrompt } from "@/components/landing/LocationPrompt";

const originalGeo = navigator.geolocation;

function mockGeoSuccess() {
  Object.defineProperty(navigator, "geolocation", {
    value: {
      getCurrentPosition: (ok: PositionCallback) => {
        ok({ coords: { latitude: 49.6, longitude: 6.1, accuracy: 30 } } as GeolocationPosition);
      },
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    },
    configurable: true,
  });
}

function mockGeoDenied() {
  Object.defineProperty(navigator, "geolocation", {
    value: {
      getCurrentPosition: (_ok: PositionCallback, err?: PositionErrorCallback) => {
        err?.({ code: 1, message: "denied" } as GeolocationPositionError);
      },
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    },
    configurable: true,
  });
}

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", { value: originalGeo, configurable: true });
});

describe("<LocationPrompt>", () => {
  it("renders the initial prompt", () => {
    render(<LocationPrompt onChange={() => {}} />);
    expect(screen.getByText(/locația ta aproximativă/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /da, partajează/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nu, ascunde/i })).toBeInTheDocument();
  });

  it("emits granted + location on share success", async () => {
    mockGeoSuccess();
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LocationPrompt onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /da, partajează/i }));
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({
        consent: "granted",
        location: { source: "geolocation", lat: 49.6, lon: 6.1, accuracyMeters: 30 },
      }),
    );
  });

  it("emits denied + null on hide", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LocationPrompt onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /nu, ascunde/i }));
    expect(onChange).toHaveBeenLastCalledWith({ consent: "denied", location: null });
  });

  it("on browser denial, emits denied + null", async () => {
    mockGeoDenied();
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LocationPrompt onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /da, partajează/i }));
    await waitFor(() =>
      expect(onChange).toHaveBeenLastCalledWith({ consent: "denied", location: null }),
    );
  });

  it("after grant, the 'Ascunde' link reverts to denied", async () => {
    mockGeoSuccess();
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<LocationPrompt onChange={onChange} />);
    await user.click(screen.getByRole("button", { name: /da, partajează/i }));
    await waitFor(() => screen.getByRole("button", { name: /ascunde/i }));
    await user.click(screen.getByRole("button", { name: /^ascunde$/i }));
    expect(onChange).toHaveBeenLastCalledWith({ consent: "denied", location: null });
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `components/landing/LocationPrompt.tsx`**

```tsx
"use client";

import { useState } from "react";
import { requestLocation, type LocationGranted } from "@/lib/geolocation";

type Consent = "granted" | "denied" | "not_asked";

export interface LocationPromptValue {
  consent: Consent;
  location: LocationGranted | null;
}

interface Props {
  onChange: (value: LocationPromptValue) => void;
}

export function LocationPrompt({ onChange }: Props) {
  const [state, setState] = useState<LocationPromptValue>({
    consent: "not_asked",
    location: null,
  });
  const [busy, setBusy] = useState(false);

  function emit(next: LocationPromptValue) {
    setState(next);
    onChange(next);
  }

  async function handleShare() {
    setBusy(true);
    const loc = await requestLocation();
    setBusy(false);
    if (loc) emit({ consent: "granted", location: loc });
    else emit({ consent: "denied", location: null });
  }

  function handleHide() {
    emit({ consent: "denied", location: null });
  }

  function handleReopen() {
    emit({ consent: "not_asked", location: null });
  }

  if (state.consent === "granted") {
    return (
      <div className="form-location">
        <span>Locație partajată ✓</span>
        <button type="button" onClick={handleHide}>
          Ascunde
        </button>
      </div>
    );
  }

  if (state.consent === "denied") {
    return (
      <div className="form-location">
        <span>Locație ascunsă.</span>
        <button type="button" onClick={handleReopen}>
          Schimbă
        </button>
      </div>
    );
  }

  return (
    <div className="form-location">
      <p>
        🌍 Pot afla locația ta aproximativă?
        <span className="hint">Ne ajută să prioritizăm orașele de pornire.</span>
      </p>
      <div>
        <button type="button" onClick={handleShare} disabled={busy}>
          Da, partajează
        </button>
        <button type="button" onClick={handleHide} disabled={busy}>
          Nu, ascunde
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```
git add components/landing/LocationPrompt.tsx tests/components/LocationPrompt.test.tsx
git commit -m "feat(waitlist): LocationPrompt with grant/deny/reopen states"
```
