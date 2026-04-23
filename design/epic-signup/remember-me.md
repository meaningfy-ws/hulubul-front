# EPIC — Remember Me (form prefill for returning visitors)

> **Status:** Spec only. Not implemented.
> **Date:** 2026-04-23.
> **Scope:** this frontend repo (`hulubul-front`). No backend involvement (Strapi untouched, Zitadel untouched).
> **Relationship to other epics:**
> - Ships *before* `design/epic-signup/login.md`. Lives for anonymous visitors.
> - When the Zitadel auth epic lands, this mechanism is partially superseded (authenticated users no longer see prefill — their session is authoritative). The clear-on-login hook in STORY 5 is the handshake between the two epics.

## 1. Goal

Give returning visitors a warmer experience: when they come back to hulubul.com, the waitlist form (and, later, the Zitadel signup redirect) already knows their name and contact, so they don't have to retype. Purely client-side; no account, no server state, no tracking.

## 2. Non-goals (explicit boundaries)

Do not build any of the following in this epic. If you think you need one, stop and write a separate spec.

- **Not authentication.** No session cookie, no server-recognised identity, no "you are logged in" UI. The user is still anonymous to every backend.
- **No server-side storage.** Prefill data never touches the Next.js server, the Strapi backend, or any log line. It lives only in the visitor's browser.
- **No HTTP cookie.** Cookies are sent on every request and that's a needless privacy surface for data the server doesn't need. Use `localStorage`.
- **No cross-device sync.** If a visitor clears their browser, uses incognito, or switches device, the prefill is gone. That's the correct default — tying this to an account is what the Zitadel epic is for.
- **No analytics wiring.** Remembered data does not flow to any analytics/CRM/ad pixel. It exists to prefill, nothing else.
- **No fingerprinting or silent identification.** We store what the user explicitly typed and checked a box to save. We do not infer identity from IP, browser fingerprint, or device characteristics.
- **No prefill of the `role` radio or the `route` text.** Those are per-visit intent, not per-person data. Prefilling them can mislead (a user's situation may change). Only `name` and `contact` are eligible.
- **No "welcome back, Ion!" banner.** Greet-by-name feels creepy in a shared-device context (which is the norm in some diaspora households). The sign we remember them is the pre-populated fields plus the clear-data affordance — nothing louder.
- **No auto-submit.** Returning visitors still click the submit button. Prefilling fields is not the same as submitting the form on their behalf.
- **No "remember me" for the future Zitadel login form.** Zitadel handles its own remember-me via the IdP session. Do not duplicate it here.

## 3. What IS in scope

1. A **single, version-tagged localStorage entry** holding `{ name, contact, savedAt }`.
2. An **opt-in checkbox** in the waitlist form: *"Reține datele pe acest dispozitiv"*. Off by default.
3. On successful form submission, if and only if the checkbox is ticked, save `name` + `contact` to localStorage.
4. On form mount, if a saved entry exists, prefill the `name` and `contact` inputs *and* render a small "Nu ești tu? Șterge." link next to the name input. Clicking it wipes the storage entry and clears the inputs.
5. A **privacy note** next to the checkbox: *"Datele rămân doar pe acest dispozitiv. Le poți șterge oricând."*
6. A **schema version field** (`"v": 1`) so the module can migrate or reject older payloads in the future without crashing.
7. A **forward-compatible hook** (`clearRememberedIdentity()`) exported from the module so the future Zitadel auth epic can call it on login/logout.
8. Updates to the privacy policy page (currently a `#` placeholder — see `design/elements.md §6.9`) describing what we store, why, and how the visitor can clear it.

## 4. Architecture

Entirely client-side. No SSR, no server round-trip, no network call.

```
           Browser
              │
              │  GET /
              ▼
        Server renders <SignupForm/> with empty defaults
              │
              │  Hydration
              ▼
        <SignupForm/> client-side `useEffect`:
              │
              ├── read localStorage["hulubul:remember"]
              │     ├─ if present & version OK → set defaultValues + show "Nu ești tu?" link
              │     └─ if absent or version mismatch → leave fields empty
              │
              ▼
        User fills / edits / submits
              │
              │  POST /api/waitlist (existing flow, unchanged)
              │
              ▼
        On success, *if* "Reține datele" is ticked:
              └── localStorage.setItem("hulubul:remember", JSON.stringify({ v:1, name, contact, savedAt: <ISO> }))
```

**Invariant:** the Next.js server never reads `hulubul:remember`. No API route sees it. No Strapi request carries it as a header.

## 5. Data contract

> **Schema bumped to v2 on 2026-04-24** to match the updated `waitlist-submission`
> schema (see `design/epic-signup/login.md` and the backend repo). v1 payloads
> (which stored a single `contact` string) are now treated as null by
> `readRemembered()` — users see an empty form once and re-enter their details.
> `v` exists exactly for this kind of migration; no user data is surfaced in the
> wrong field.

```ts
// lib/remember-me.ts — public surface

export interface RememberedIdentity {
  v: 2;              // schema version; bump on breaking changes
  name: string;      // as entered by the user; never normalised
  email: string;     // required; validated format happens upstream, not here
  whatsapp?: string; // optional; omitted when empty after trim
  savedAt: string;   // ISO-8601, for TTL decisions
}

export function readRemembered(): RememberedIdentity | null;
export function saveRemembered(
  input: Pick<RememberedIdentity, "name" | "email"> &
    Partial<Pick<RememberedIdentity, "whatsapp">>,
): void;
export function clearRememberedIdentity(): void;
```

**Storage key:** `hulubul:remember` (namespaced so we don't collide with other origins or future keys).

**TTL:** none enforced in v1. If the `savedAt` is older than 365 days, treat as stale and clear on read. Rationale: data has to go somewhere eventually, and most visitors either become users or forget about us within a year.

**Quota:** the payload is tiny (<500 bytes). No size guard beyond a best-effort `try/catch` around `localStorage.setItem` to handle the rare *QuotaExceededError*.

## 6. Stories (work breakdown)

Each story is an implementable unit. Execution sequence matters — do not skip ahead.

### STORY 1 — `lib/remember-me.ts` module

**Deliverable:** a small, pure module with the interface from §5. No React, no Next.js specifics. Reads and writes localStorage safely (SSR-guarded: no-op on `typeof window === "undefined"`). Handles malformed JSON, missing keys, version mismatches, and quota errors without throwing.

**Acceptance:**
- `readRemembered()` returns `null` in any of: no entry, malformed JSON, wrong version, stale (>365 d).
- `saveRemembered({ name, contact })` writes a `v:1` entry with the current ISO timestamp. Trims whitespace in `name` and `contact`.
- `clearRememberedIdentity()` removes the key. Idempotent.
- Module is importable from server components without crashing (SSR guard works).
- 100% line coverage via unit tests.

### STORY 2 — Extend waitlist-schema and form state

**Deliverable:** extend the existing client form state in `components/landing/SignupForm.tsx` to include a `remember` boolean. Extend nothing on the server — the POST payload to `/api/waitlist` is unchanged. This keeps the Zod schema in `lib/waitlist-schema.ts` and the Strapi contract intact.

**Acceptance:**
- `tsc --noEmit` clean.
- Existing `tests/lib/strapi.test.ts` and `tests/lib/waitlist-schema.test.ts` pass unchanged.
- The POST body still matches the Strapi shape `{ data: { name, contact, role, route? } }` — the `remember` flag is local-only.

### STORY 3 — UI wiring in `SignupForm`

**Deliverable:** add three things to the form, nothing else:

1. A checkbox with label *"Reține datele pe acest dispozitiv"* and sub-label *"Datele rămân doar pe acest dispozitiv. Le poți șterge oricând."* Placed between the role radio group and the submit button, visually subdued (no new section heading).
2. On mount: call `readRemembered()`. If a value is returned, set the `name` and `contact` inputs' `defaultValue` and render a small ghost link next to the name input: *"Nu ești tu? Șterge."* Clicking it calls `clearRememberedIdentity()`, clears the inputs, and hides the link.
3. On successful submit (after the existing success response is handled): if `remember` is true, call `saveRemembered({ name, contact })`. If false, call `clearRememberedIdentity()` — so un-ticking the box on a later visit overwrites a previous opt-in.

**Acceptance:**
- Returning visitor (with prefill stored) sees inputs populated and the "Nu ești tu?" link.
- Ticking → submit → refresh → fields prefilled next time.
- Un-ticking → submit → refresh → fields empty next time.
- Clicking "Nu ești tu? Șterge." immediately empties the inputs and hides itself.
- No layout shift when the prefill is applied after hydration.

### STORY 4 — CSS additions

**Deliverable:** two new rules in `app/globals.css`:

- `.form-remember` — flex layout for the checkbox + its note, subdued colour.
- `.form-identity-clear` — small right-aligned ghost link styled like `audience-link` but muted.

No changes to existing rules.

**Acceptance:** matches the visual language of the existing form (no new colours, no new fonts, same token vocabulary).

### STORY 5 — Forward-compat hook for the auth epic

**Deliverable:** document (in `lib/remember-me.ts` header comment and in this file) that **the Zitadel auth epic must call `clearRememberedIdentity()` inside its sign-in success handler**. This prevents stale prefill once the user has a real session.

No code for the hook itself — just the exported function already in STORY 1. This story is about the handshake contract between epics.

**Acceptance:** a cross-reference is added to `design/epic-signup/login.md §3.2` ("Frontend-owned responsibilities") listing `clearRememberedIdentity()` as a call-site when login succeeds.

### STORY 6 — Tests

**Deliverable (Vitest, same style as the rest of the repo):**

- `tests/lib/remember-me.test.ts`
  - Round-trip: `save → read` returns equivalent payload with `savedAt` present.
  - `read` returns `null` for: missing key, malformed JSON, wrong version, stale entry (>365d via time mocking).
  - `clear` removes the key and is idempotent.
  - `save` trims whitespace on name and contact.
  - `save` handles quota errors gracefully (mocked throw) without bubbling.
  - SSR guard: in an environment without `window`, all three functions are no-ops and do not throw.

- `tests/components/SignupForm.test.tsx` — extend with three new cases:
  - Mounts with empty localStorage → inputs are empty, no "Nu ești tu?" link.
  - Mounts with a `v:1` entry → inputs prefill, "Nu ești tu?" link renders.
  - Clicking "Nu ești tu?" clears inputs, hides link, empties localStorage.

**Acceptance:** full suite remains green; new tests bring total to ~40+.

### STORY 7 — Privacy copy

**Deliverable:** two small copy changes.

1. A new section in the privacy policy page (currently `#` in the footer) titled *"Ce reținem pe dispozitivul tău"* with:
   - What we store (name, contact).
   - Why (only to prefill the form next time you visit).
   - Where (your browser; nowhere else).
   - How to clear (the in-form "Nu ești tu? Șterge." link, or your browser's "Clear site data").
   - That this is optional and only active when you tick the box.
2. A one-line note in the form near the checkbox (already covered in STORY 3).

**Acceptance:** legal wording approved by whoever owns the privacy policy. The form change and the policy page must ship together — do not ship the form with a placeholder privacy link.

## 7. Consent reasoning (for the privacy policy)

- **Legal basis:** user consent, expressed by ticking *"Reține datele pe acest dispozitiv"*. Consent is granular (only this one purpose), informed (the note says what and where), freely given (checkbox is off by default; form submits successfully whether ticked or not), and withdrawable (the in-form clear link and the browser's "clear site data" both work instantly).
- **What qualifies as personal data:** the name and email/phone the user typed. Both are PII under GDPR.
- **Data retention:** max 365 days via the TTL on read (§5). In practice, the user can clear sooner.
- **Data sharing:** none. Data stays in the browser's localStorage, origin-bound to `hulubul.com`.
- **No ePrivacy / cookie-banner trigger:** because we use localStorage (not cookies) *and* we require explicit opt-in, this mechanism does not require a cookie banner under ePrivacy. A clear privacy-policy section is still required under GDPR's transparency principle.

If in doubt, ask legal. Do not ship the checkbox without the privacy-policy section being live.

## 8. Security checklist

- **XSS is the real threat.** localStorage is readable by any script running on the page. Mitigations in this repo:
  - No third-party analytics or tag-manager scripts loaded on the landing page.
  - No unsanitised HTML injection anywhere in `components/landing/` — the React prop commonly abused for this is never used on this page, and adding it anywhere on the site should require a code-review comment pointing back to this epic.
  - Content Security Policy: plan to add `Content-Security-Policy` header in `next.config.ts` before this epic ships (at minimum: `default-src 'self'; script-src 'self'`). Explicitly noted as a prerequisite.
- **No password, no role, no route stored.** Only name and contact.
- **Origin-bound.** Because localStorage is scoped to `hulubul.com`, other sites cannot read it. Subdomain isolation: if the marketing site and a future app live on different subdomains, each has its own localStorage.
- **Never logged.** Ensure no console-logging of the remembered payload in production — lint rule or careful review.

## 9. Known risks

| Risk | Mitigation |
|---|---|
| **Shared device / kiosk** — prefill exposes last user's email to the next person. | Explicit opt-in checkbox plus prominent "Nu ești tu? Șterge." link. We do not auto-save without consent. |
| **Stale data** — user's email/phone changes, but localStorage still has the old one. | Visible prefill makes the old value obvious. User overwrites by typing. 365-day TTL is the hard backstop. |
| **Interaction with Zitadel login (future)** — a returning visitor with prefill + an existing account gets confused when the form shows their old answers but their account has a different email. | STORY 5: Zitadel auth epic clears the localStorage entry on successful login. |
| **Locale or device migration** — switching browsers/devices loses the data. | Accepted. Cross-device sync is the auth epic's job, not this one. |
| **CSP conflicts** — if a future analytics/chat widget is added, it gains localStorage access. | Documented in §8. CSP header is a prerequisite; additions to `script-src` must be reviewed. |
| **Schema change** — future version of the payload (e.g. adding `preferredLocale`). | `v` field supports migration. `readRemembered()` returns `null` on version mismatch — safe default. |

## 10. Epic acceptance criteria

- [ ] Anonymous visitor fills the waitlist form, ticks *"Reține datele"*, submits successfully.
- [ ] Same visitor revisits the page — form is prefilled with name and contact; role and route remain empty.
- [ ] A "Nu ești tu? Șterge." link is visible when prefill is active; clicking it empties the fields and clears storage.
- [ ] Un-ticking the checkbox on a subsequent submission erases the stored entry.
- [ ] Browser DevTools shows no PII in cookies; `hulubul:remember` exists in localStorage only when opt-in was given.
- [ ] Privacy policy page describes the mechanism in Romanian before the release.
- [ ] CSP header is in place on the production response.
- [ ] Full test suite green; typecheck clean; production build passes.
- [ ] `design/epic-signup/login.md §3.2` lists `clearRememberedIdentity()` as a required call-site on login.

## 11. Out of scope — candidate follow-ups

Named here so they are not smuggled into this epic.

- **EPIC — Cross-device sync** — cross-device prefill. Becomes moot once Zitadel auth lands; do not build separately.
- **EPIC — Language preference** — remember the user's preferred UI language (when we add i18n). Same module, new fields under a bumped schema version.
- **EPIC — Shipment draft resume** — save an in-progress shipment request. Different domain, different retention policy; separate module, not this one.

## 12. References

- `design/elements.md §6.7` — waitlist-section editable fields (we're adding UI around them, not changing them).
- `design/epic-signup/login.md` — sibling epic; handshake documented in STORY 5 above.
- `components/landing/SignupForm.tsx` — the only component modified by this epic.
- GDPR Art. 6(1)(a) — consent as legal basis.
- ePrivacy Directive Art. 5(3) — why localStorage + opt-in avoids the cookie-banner trigger.

---

*End of EPIC. Implementation begins when this spec is approved and the privacy-policy page is drafted.*
