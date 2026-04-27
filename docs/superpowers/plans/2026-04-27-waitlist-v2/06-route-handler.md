# STORY 6 — Route handler & Strapi fetcher

**Goal:** `/api/waitlist` validates the new payload, builds a server-side `device` signature from request headers (merged with `client.viewport` / `client.timezone`), and resolves an IP-based location only when `locationConsent === "not_asked"`. The `submitWaitlist` MSW test asserts the new fields are forwarded to Strapi.

**Files:**
- Modify: `app/api/waitlist/route.ts`
- Modify: `tests/api/waitlist-route.test.ts` (create if absent — repo currently does not have one)
- Modify: `tests/lib/strapi.test.ts` — add `data.cities` / `data.gdprConsent` / `data.location` / `data.device` assertions for `submitWaitlist`.

---

## Task 6.1 — Route handler tests

- [ ] **Step 1: Check whether `tests/api/waitlist-route.test.ts` exists**

```
ls tests/api/ | grep waitlist
```

If absent (likely), create it. Otherwise replace its contents with the suite below.

- [ ] **Step 2: Write `tests/api/waitlist-route.test.ts`**

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "@/app/api/waitlist/route";

vi.mock("@/lib/strapi", () => ({
  submitWaitlist: vi.fn().mockResolvedValue(undefined),
}));

import { submitWaitlist } from "@/lib/strapi";

const validBody = {
  name: "Ion",
  email: "ion@example.com",
  role: "expeditor",
  cities: ["Lux", "Chișinău"],
  gdprConsent: true,
  gdprConsentAt: "2026-04-27T15:42:11.000Z",
  gdprConsentVersion: "2026-04-27",
};

function makeReq(body: unknown, headers?: Record<string, string>) {
  return new Request("http://localhost/api/waitlist", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "user-agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)",
      "accept-language": "ro-RO,ro;q=0.9",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  (submitWaitlist as ReturnType<typeof vi.fn>).mockClear();
});

describe("/api/waitlist POST", () => {
  it("accepts a valid v2 payload and returns 201", async () => {
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);
    expect(submitWaitlist).toHaveBeenCalledOnce();
  });

  it("rejects legacy routes-only payload with 400", async () => {
    const { cities: _omit, ...rest } = validBody;
    const res = await POST(makeReq({ ...rest, routes: "Lux - KIV" }));
    expect(res.status).toBe(400);
    expect(submitWaitlist).not.toHaveBeenCalled();
  });

  it("rejects payload missing gdprConsent with 400", async () => {
    const { gdprConsent: _omit, ...rest } = validBody;
    const res = await POST(makeReq(rest));
    expect(res.status).toBe(400);
  });

  it("rejects malformed JSON with 400", async () => {
    const req = new Request("http://localhost/api/waitlist", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("builds device.userAgent from request headers and truncates to 512", async () => {
    const longUa = "x".repeat(600);
    await POST(makeReq(validBody, { "user-agent": longUa }));
    const arg = (submitWaitlist as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(arg.device.userAgent.length).toBe(512);
  });

  it("merges client.viewport and client.timezone into device", async () => {
    await POST(
      makeReq({
        ...validBody,
        client: { viewport: { w: 1280, h: 800 }, timezone: "Europe/Luxembourg" },
      }),
    );
    const arg = (submitWaitlist as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(arg.device.viewport).toEqual({ w: 1280, h: 800 });
    expect(arg.device.timezone).toBe("Europe/Luxembourg");
  });

  it("resolves IP-based location only when consent is not_asked", async () => {
    await POST(
      makeReq(
        { ...validBody, locationConsent: "not_asked" },
        { "x-vercel-ip-country": "LU", "x-vercel-ip-city": "Luxembourg" },
      ),
    );
    const arg = (submitWaitlist as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(arg.location).toEqual({ source: "ip", city: "Luxembourg", country: "LU" });
  });

  it("does not run IP fallback when consent is granted", async () => {
    await POST(
      makeReq(
        {
          ...validBody,
          locationConsent: "granted",
          location: { source: "geolocation", lat: 49.6, lon: 6.1, accuracyMeters: 30 },
        },
        { "x-vercel-ip-country": "LU", "x-vercel-ip-city": "Luxembourg" },
      ),
    );
    const arg = (submitWaitlist as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(arg.location.source).toBe("geolocation");
  });

  it("does not run IP fallback when consent is denied", async () => {
    await POST(
      makeReq(
        { ...validBody, locationConsent: "denied", location: null },
        { "x-vercel-ip-country": "LU", "x-vercel-ip-city": "Luxembourg" },
      ),
    );
    const arg = (submitWaitlist as ReturnType<typeof vi.fn>).mock.calls[0]![0];
    expect(arg.location).toBeNull();
  });

  it("returns 502 on Strapi failure", async () => {
    (submitWaitlist as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("strapi down"),
    );
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(502);
  });
});
```

- [ ] **Step 3: Run — expect FAIL**

```
npx vitest run tests/api/waitlist-route.test.ts
```

---

## Task 6.2 — Update the route handler

- [ ] **Step 1: Replace `app/api/waitlist/route.ts`**

```ts
import { NextResponse } from "next/server";
import { waitlistSchema } from "@/lib/waitlist-schema";
import { submitWaitlist } from "@/lib/strapi";

export const runtime = "nodejs";

interface DeviceSignature {
  userAgent: string;
  platform: string | null;
  language: string | null;
  viewport: { w: number; h: number } | null;
  timezone: string | null;
  dnt: boolean;
}

function clip(s: string | null, max: number): string {
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

function buildDevice(
  request: Request,
  client?: { viewport?: { w: number; h: number }; timezone?: string },
): DeviceSignature {
  const ua = clip(request.headers.get("user-agent"), 512);
  const lang = request.headers.get("accept-language");
  const platform = request.headers.get("sec-ch-ua-platform");
  const dnt = request.headers.get("dnt") === "1";
  return {
    userAgent: ua,
    platform: platform ? platform.replace(/"/g, "") : null,
    language: lang ? lang.split(",")[0]!.trim() : null,
    viewport: client?.viewport ?? null,
    timezone: client?.timezone ?? null,
    dnt,
  };
}

function resolveIpLocation(request: Request) {
  const country =
    request.headers.get("x-vercel-ip-country") ??
    request.headers.get("cf-ipcountry") ??
    null;
  const city = request.headers.get("x-vercel-ip-city") ?? null;
  if (!country && !city) return null;
  return { source: "ip" as const, city, country };
}

export async function POST(request: Request) {
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = waitlistSchema.safeParse(json);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    return NextResponse.json(
      { error: firstIssue?.message ?? "Validare nereușită" },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const device = buildDevice(request, data.client);

  let location = data.location ?? null;
  if (data.locationConsent === "not_asked" && !location) {
    location = resolveIpLocation(request);
  }

  // Strip the `client` hint — its content was merged into `device`.
  const { client: _client, ...rest } = data;
  const enriched = { ...rest, device, location };

  try {
    await submitWaitlist(enriched as unknown as Parameters<typeof submitWaitlist>[0]);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Nu am putut trimite formularul. Încearcă din nou.";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
```

> Note: `submitWaitlist`'s signature still types `payload: WaitlistPayload`. The enriched object has extra keys (`device`) and a slightly different shape. The cast keeps types pragmatic; if you'd rather widen `submitWaitlist`, change its parameter type to `Record<string, unknown>` or a new `EnrichedWaitlistPayload`. Either is acceptable.

- [ ] **Step 2: Run the route handler tests — expect PASS**

```
npx vitest run tests/api/waitlist-route.test.ts
```

- [ ] **Step 3: Commit**

```
git add app/api/waitlist/route.ts tests/api/waitlist-route.test.ts
git commit -m "feat(waitlist): route handler enriches payload with device + IP fallback"
```

---

## Task 6.3 — Update `tests/lib/strapi.test.ts` for the new payload

- [ ] **Step 1: Find the existing `submitWaitlist` test and update its assertion**

```
grep -n "submitWaitlist" tests/lib/strapi.test.ts
```

Locate the test that asserts the request body forwarded to Strapi. Replace its expected body with the v2 shape:

```ts
expect(forwarded).toEqual({
  data: expect.objectContaining({
    name: "Ion",
    email: "ion@example.com",
    role: "expeditor",
    cities: ["Lux"],
    gdprConsent: true,
    gdprConsentAt: expect.any(String),
    gdprConsentVersion: expect.any(String),
    source: "landing",
  }),
});
```

(Adjust to whatever shape the existing test uses for the input. The point: assert `data.cities` is present and `data.routes` is absent.)

- [ ] **Step 2: Run — expect PASS**

```
npx vitest run tests/lib/strapi.test.ts
```

- [ ] **Step 3: Commit**

```
git add tests/lib/strapi.test.ts
git commit -m "test(strapi): assert submitWaitlist forwards v2 payload fields"
```

---

## Final verification gate

- [ ] **Run the full suite**

```
npx vitest run
```

All green.

- [ ] **Typecheck**

```
npx tsc --noEmit
```

Clean.

- [ ] **Production build**

```
npx next build
```

Clean.

- [ ] **Manual smoke (optional but recommended)**

```
npm run dev
```

Open the landing page, fill the form for each role, observe the Network tab to confirm the POST body matches the v2 shape (cities array, gdprConsent fields, source=landing, optional location/utm). Confirm submit is disabled until consent is ticked. Confirm the survey CTA navigates to `/sondaj/expeditori`.

If everything passes, the plan is complete.
