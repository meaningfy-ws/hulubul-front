# STORY 3 — Small utility libs

**Goal:** Add three small libs that the components and route handler use:
1. `lib/gdpr-consent.ts` — exports `GDPR_CONSENT_VERSION` constant.
2. `lib/utm.ts` — `captureUtmFromUrl()` + `readStoredUtm()`.
3. `lib/geolocation.ts` — `requestLocation()` wrapping `navigator.geolocation`.

**Files:**
- Create: `lib/gdpr-consent.ts`
- Create: `lib/utm.ts`
- Create: `tests/lib/utm.test.ts`
- Create: `lib/geolocation.ts`
- Create: `tests/lib/geolocation.test.ts`

---

## Task 3.1 — `lib/gdpr-consent.ts`

- [ ] **Step 1: Create file**

```ts
// lib/gdpr-consent.ts
// Bump this string whenever the privacy text shown next to the consent
// checkbox changes materially. The value is persisted with each waitlist
// submission so we can prove which text the user agreed to.
export const GDPR_CONSENT_VERSION = "2026-04-27";
```

- [ ] **Step 2: Commit**

```
git add lib/gdpr-consent.ts
git commit -m "chore(waitlist): GDPR_CONSENT_VERSION constant"
```

> No test — it's a single literal. A test would assert the value equals itself.

---

## Task 3.2 — `lib/utm.ts`

- [ ] **Step 1: Write failing tests**

`tests/lib/utm.test.ts`:

```ts
import { describe, it, expect, beforeEach } from "vitest";
import { captureUtmFromUrl, readStoredUtm, UTM_STORAGE_KEY } from "@/lib/utm";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("captureUtmFromUrl", () => {
  it("stores known UTM keys from the search string", () => {
    captureUtmFromUrl(
      "?utm_source=fb&utm_medium=cpc&utm_campaign=lux&unrelated=x",
      "https://example.com/",
    );
    const stored = JSON.parse(window.sessionStorage.getItem(UTM_STORAGE_KEY)!);
    expect(stored.utm_source).toBe("fb");
    expect(stored.utm_medium).toBe("cpc");
    expect(stored.utm_campaign).toBe("lux");
    expect(stored).not.toHaveProperty("unrelated");
  });

  it("captures gclid, fbclid, and referrer", () => {
    captureUtmFromUrl("?gclid=g1&fbclid=f1", "https://ref.example/");
    const stored = JSON.parse(window.sessionStorage.getItem(UTM_STORAGE_KEY)!);
    expect(stored.gclid).toBe("g1");
    expect(stored.fbclid).toBe("f1");
    expect(stored.referrer).toBe("https://ref.example/");
  });

  it("does not overwrite an already-stored capture", () => {
    captureUtmFromUrl("?utm_source=a", "");
    captureUtmFromUrl("?utm_source=b", "");
    const stored = JSON.parse(window.sessionStorage.getItem(UTM_STORAGE_KEY)!);
    expect(stored.utm_source).toBe("a");
  });

  it("does not write anything if no UTM/click/referrer present", () => {
    captureUtmFromUrl("", "");
    expect(window.sessionStorage.getItem(UTM_STORAGE_KEY)).toBeNull();
  });

  it("truncates oversized values defensively", () => {
    const long = "x".repeat(300);
    captureUtmFromUrl(`?utm_source=${long}`, "");
    const stored = JSON.parse(window.sessionStorage.getItem(UTM_STORAGE_KEY)!);
    expect(stored.utm_source.length).toBe(256);
  });
});

describe("readStoredUtm", () => {
  it("returns undefined when nothing is stored", () => {
    expect(readStoredUtm()).toBeUndefined();
  });

  it("returns the stored object", () => {
    window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify({ utm_source: "x" }));
    expect(readStoredUtm()).toEqual({ utm_source: "x" });
  });

  it("returns undefined on parse failure", () => {
    window.sessionStorage.setItem(UTM_STORAGE_KEY, "not-json");
    expect(readStoredUtm()).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```
npx vitest run tests/lib/utm.test.ts
```

- [ ] **Step 3: Implement `lib/utm.ts`**

```ts
export const UTM_STORAGE_KEY = "hulubul:utm";

export interface UtmCapture {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_term?: string;
  utm_content?: string;
  gclid?: string;
  fbclid?: string;
  referrer?: string;
}

const KEYS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "gclid",
  "fbclid",
] as const;

function clip(v: string, max: number): string {
  return v.length > max ? v.slice(0, max) : v;
}

export function captureUtmFromUrl(search: string, referrer: string): void {
  if (typeof window === "undefined") return;
  if (window.sessionStorage.getItem(UTM_STORAGE_KEY)) return;

  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const out: UtmCapture = {};
  for (const k of KEYS) {
    const v = params.get(k);
    if (v) out[k] = clip(v, 256);
  }
  if (referrer) out.referrer = clip(referrer, 2048);

  if (Object.keys(out).length === 0) return;
  window.sessionStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(out));
}

export function readStoredUtm(): UtmCapture | undefined {
  if (typeof window === "undefined") return undefined;
  const raw = window.sessionStorage.getItem(UTM_STORAGE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as UtmCapture;
  } catch {
    return undefined;
  }
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```
git add lib/utm.ts tests/lib/utm.test.ts
git commit -m "feat(waitlist): UTM capture helpers (sessionStorage)"
```

---

## Task 3.3 — `lib/geolocation.ts`

- [ ] **Step 1: Write failing tests**

`tests/lib/geolocation.test.ts`:

```ts
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { requestLocation } from "@/lib/geolocation";

const originalGeolocation = navigator.geolocation;

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", {
    value: originalGeolocation,
    configurable: true,
  });
});

function mockGeo(impl: Geolocation["getCurrentPosition"]) {
  Object.defineProperty(navigator, "geolocation", {
    value: { getCurrentPosition: impl, watchPosition: vi.fn(), clearWatch: vi.fn() },
    configurable: true,
  });
}

describe("requestLocation", () => {
  it("resolves to LocationGranted on success", async () => {
    mockGeo((onSuccess) => {
      onSuccess({
        coords: { latitude: 49.6, longitude: 6.1, accuracy: 32 },
      } as GeolocationPosition);
    });
    const result = await requestLocation();
    expect(result).toEqual({
      source: "geolocation",
      lat: 49.6,
      lon: 6.1,
      accuracyMeters: 32,
    });
  });

  it("resolves to null when permission denied", async () => {
    mockGeo((_ok, onError) => {
      onError?.({ code: 1, message: "denied" } as GeolocationPositionError);
    });
    expect(await requestLocation()).toBeNull();
  });

  it("resolves to null when geolocation API absent", async () => {
    Object.defineProperty(navigator, "geolocation", {
      value: undefined,
      configurable: true,
    });
    expect(await requestLocation()).toBeNull();
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

- [ ] **Step 3: Implement `lib/geolocation.ts`**

```ts
export interface LocationGranted {
  source: "geolocation";
  lat: number;
  lon: number;
  accuracyMeters: number;
}

export function requestLocation(): Promise<LocationGranted | null> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve(null);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          source: "geolocation",
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          accuracyMeters: pos.coords.accuracy,
        });
      },
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  });
}
```

- [ ] **Step 4: Run — expect PASS**

- [ ] **Step 5: Commit**

```
git add lib/geolocation.ts tests/lib/geolocation.test.ts
git commit -m "feat(waitlist): geolocation helper with promise + null on denied"
```
