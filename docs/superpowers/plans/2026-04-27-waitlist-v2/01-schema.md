# STORY 1 — Waitlist schema (Zod) rewrite

**Goal:** Replace `lib/waitlist-schema.ts` to match the new payload contract: role enum (`expeditor | transportator | destinatar`), `cities: string[]`, GDPR consent triple, optional location/UTM/client/device-hint fields.

**Files:**
- Modify: `lib/waitlist-schema.ts` (full rewrite)
- Modify: `tests/lib/waitlist-schema.test.ts` (full rewrite — old tests reference removed `routes` field)

---

## Task 1.1 — Write the new failing test suite

- [ ] **Step 1: Replace `tests/lib/waitlist-schema.test.ts` with the new suite**

```ts
import { describe, it, expect } from "vitest";
import { waitlistSchema } from "@/lib/waitlist-schema";

const validBase = {
  name: "Ion Popescu",
  email: "ion@example.com",
  role: "expeditor" as const,
  cities: ["Luxembourg", "Chișinău"],
  gdprConsent: true as const,
  gdprConsentAt: "2026-04-27T15:42:11.000Z",
  gdprConsentVersion: "2026-04-27",
};

describe("waitlistSchema — identity & role", () => {
  it("accepts minimum valid payload", () => {
    const r = waitlistSchema.safeParse(validBase);
    expect(r.success).toBe(true);
  });

  it("accepts each new role value", () => {
    for (const role of ["expeditor", "transportator", "destinatar"] as const) {
      expect(waitlistSchema.safeParse({ ...validBase, role }).success).toBe(true);
    }
  });

  it("rejects legacy 'ambele' role", () => {
    expect(waitlistSchema.safeParse({ ...validBase, role: "ambele" }).success).toBe(false);
  });

  it("rejects invalid email", () => {
    expect(waitlistSchema.safeParse({ ...validBase, email: "not-an-email" }).success).toBe(false);
  });

  it("trims name and rejects empty after trim", () => {
    expect(waitlistSchema.safeParse({ ...validBase, name: "   " }).success).toBe(false);
  });

  it("treats blank whatsapp as undefined", () => {
    const r = waitlistSchema.safeParse({ ...validBase, whatsapp: "   " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.whatsapp).toBeUndefined();
  });
});

describe("waitlistSchema — cities", () => {
  it("requires at least one city", () => {
    expect(waitlistSchema.safeParse({ ...validBase, cities: [] }).success).toBe(false);
  });

  it("rejects more than 10 cities", () => {
    const cities = Array.from({ length: 11 }, (_, i) => `City${i}`);
    expect(waitlistSchema.safeParse({ ...validBase, cities }).success).toBe(false);
  });

  it("rejects city longer than 120 chars", () => {
    expect(
      waitlistSchema.safeParse({ ...validBase, cities: ["x".repeat(121)] }).success,
    ).toBe(false);
  });

  it("rejects blank city entries", () => {
    expect(waitlistSchema.safeParse({ ...validBase, cities: ["Lux", "  "] }).success).toBe(false);
  });
});

describe("waitlistSchema — GDPR consent", () => {
  it("rejects gdprConsent: false", () => {
    expect(waitlistSchema.safeParse({ ...validBase, gdprConsent: false }).success).toBe(false);
  });

  it("rejects missing gdprConsentAt", () => {
    const { gdprConsentAt: _omit, ...rest } = validBase;
    expect(waitlistSchema.safeParse(rest).success).toBe(false);
  });

  it("rejects non-ISO gdprConsentAt", () => {
    expect(
      waitlistSchema.safeParse({ ...validBase, gdprConsentAt: "yesterday" }).success,
    ).toBe(false);
  });

  it("requires gdprConsentVersion", () => {
    expect(
      waitlistSchema.safeParse({ ...validBase, gdprConsentVersion: "" }).success,
    ).toBe(false);
  });
});

describe("waitlistSchema — optional fields", () => {
  it("defaults source to 'landing'", () => {
    const r = waitlistSchema.safeParse(validBase);
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.source).toBe("landing");
  });

  it("defaults locationConsent to 'not_asked'", () => {
    const r = waitlistSchema.safeParse(validBase);
    if (r.success) expect(r.data.locationConsent).toBe("not_asked");
  });

  it("accepts a geolocation Location", () => {
    const r = waitlistSchema.safeParse({
      ...validBase,
      locationConsent: "granted",
      location: { source: "geolocation", lat: 49.6, lon: 6.1, accuracyMeters: 32 },
    });
    expect(r.success).toBe(true);
  });

  it("accepts an IP Location with nullable city/country", () => {
    const r = waitlistSchema.safeParse({
      ...validBase,
      location: { source: "ip", city: null, country: null },
    });
    expect(r.success).toBe(true);
  });

  it("rejects ip Location with bad country code length", () => {
    const r = waitlistSchema.safeParse({
      ...validBase,
      location: { source: "ip", city: "Lux", country: "LUX" },
    });
    expect(r.success).toBe(false);
  });

  it("accepts a sparse UTM object", () => {
    const r = waitlistSchema.safeParse({
      ...validBase,
      utm: { utm_source: "fb", utm_campaign: "lux" },
    });
    expect(r.success).toBe(true);
  });

  it("accepts client viewport + timezone", () => {
    const r = waitlistSchema.safeParse({
      ...validBase,
      client: { viewport: { w: 1280, h: 800 }, timezone: "Europe/Luxembourg" },
    });
    expect(r.success).toBe(true);
  });
});
```

- [ ] **Step 2: Run — expect FAIL (schema still in old shape)**

```
npx vitest run tests/lib/waitlist-schema.test.ts
```
Expected: most tests fail (`role` enum mismatch, `cities` field unknown, etc.).

## Task 1.2 — Replace the schema

- [ ] **Step 1: Write `lib/waitlist-schema.ts`**

```ts
import { z } from "zod";

export const Role = z.enum(["expeditor", "transportator", "destinatar"]);
export type Role = z.infer<typeof Role>;

const City = z.string().trim().min(1).max(120);

const LocationGranted = z.object({
  source: z.literal("geolocation"),
  lat: z.number(),
  lon: z.number(),
  accuracyMeters: z.number().nonnegative(),
});
const LocationIp = z.object({
  source: z.literal("ip"),
  city: z.string().nullable(),
  country: z.string().length(2).nullable(),
});
const Location = z.union([LocationGranted, LocationIp]);

const Utm = z.object({
  utm_source: z.string().max(256).optional(),
  utm_medium: z.string().max(256).optional(),
  utm_campaign: z.string().max(256).optional(),
  utm_term: z.string().max(256).optional(),
  utm_content: z.string().max(256).optional(),
  gclid: z.string().max(256).optional(),
  fbclid: z.string().max(256).optional(),
  referrer: z.string().max(2048).optional(),
});

export const waitlistSchema = z.object({
  name: z.string().trim().min(1, "Numele este obligatoriu"),
  email: z
    .string()
    .trim()
    .min(1, "Email-ul este obligatoriu")
    .email("Email invalid — verifică și încearcă din nou"),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined)),
  role: Role,
  cities: z.array(City).min(1, "Adaugă cel puțin un oraș.").max(10),
  source: z
    .enum(["landing", "qr_event", "referral", "other"])
    .optional()
    .default("landing"),

  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Trebuie să accepți politica de confidențialitate." }),
  }),
  gdprConsentAt: z.string().datetime(),
  gdprConsentVersion: z.string().min(1).max(64),

  location: Location.nullable().optional(),
  locationConsent: z
    .enum(["granted", "denied", "not_asked"])
    .optional()
    .default("not_asked"),
  utm: Utm.nullable().optional(),
  client: z
    .object({
      viewport: z.object({ w: z.number().int(), h: z.number().int() }).optional(),
      timezone: z.string().max(64).optional(),
    })
    .optional(),
});

export type WaitlistPayload = z.infer<typeof waitlistSchema>;
```

- [ ] **Step 2: Run — expect PASS**

```
npx vitest run tests/lib/waitlist-schema.test.ts
```

- [ ] **Step 3: Run repo-wide typecheck — note breakages**

```
npx tsc --noEmit
```

Expected breakages (will be fixed in later stories):
- `components/landing/SignupForm.tsx` — references `routes` and `ambele`.
- `lib/strapi.ts` — `submitWaitlist(payload)` signature still types `payload: WaitlistPayload`. The new shape is bigger but the function body uses `JSON.stringify({ data: payload })`, so no code change needed.
- `tests/components/SignupForm.test.tsx` — old field references.

These are acceptable for now; they get fixed in STORY 5.

- [ ] **Step 4: Commit**

```
git add lib/waitlist-schema.ts tests/lib/waitlist-schema.test.ts
git commit -m "feat(waitlist): rewrite Zod schema for cities/consent/location/utm"
```
