# FE Spec — Editorial blocks adaptation + multi-registration dedupe

Consolidated frontend work coordinating with backend `main` (Strapi PR #7,
merged). Two independent workstreams; ship order does not matter between them,
but each has its own backend coordination note.

---

## A. Editorial pages: adapt to the delivered Strapi contract (FE-3)

The backend single types (`page-confidentialitate`, `page-termeni`,
`page-despre-proiect`, `page-pentru-transportatori`) shipped with a contract
that differs from the original FE-3 assumption. These are deliberate, locked
backend decisions — the frontend adapts.

| Field | Old FE assumption | Delivered (Strapi) | FE change |
|-------|-------------------|--------------------|-----------|
| `body` | Markdown string | `blocks` (`BlocksContent` JSON) | Render via blocks renderer; type change |
| `lastUpdated` | free-text `"14 mai 2026"` | `date` (ISO `2026-05-14`) | Format ISO → RO display |
| SEO | flat `metaDescription?` | `shared.seo` component (`metaTitle`, `metaDescription`, `shareImage`) | Read `page.seo.*`; must populate |

### A1. `lib/types.ts`
- `EditorialPage.body: BlocksContent` (reuse the landing-page blocks type).
- `EditorialPage.lastUpdated: string` (ISO date).
- Replace flat `metaDescription?` with
  `seo?: { metaTitle?: string; metaDescription?: string; shareImage?: Media }`
  — reuse the existing landing `Seo`/`Media` types, do not redefine.

### A2. `lib/strapi.ts` — `getEditorialPage`
- 🔴 **Hard requirement.** Strapi 5 does not populate components by default.
  Current call `/api/page-${slug}?status=published` returns **no `seo`** →
  metadata silently breaks.
- Add populate mirroring `buildLandingPopulate`:
  `?status=published&populate[seo][populate][0]=shareImage`.
- Without this, A is dead on arrival.

### A3. `components/editorial/EditorialPageView.tsx`
- Render `body` with the blocks renderer (A4), not `<MarkdownText>`.
- `makeEditorialMetadata` reads `page.seo.metaTitle` /
  `page.seo.metaDescription` / `page.seo.shareImage` (was `page.metaDescription`
  / `page.title`).
- Format `lastUpdated`: ISO → RO (`"15 mai 2026"`). Single helper, tested.

### A4. Blocks renderer — decision D2 (locked)
- Add `@strapi/blocks-react-renderer` (official, small). Wrap in a thin local
  component so the dependency is swappable.

### A5. `lib/editorial-fallback.ts` — decision D1 (locked): **dual-render**
- The static fallback is Markdown + flat fields; the live contract is blocks +
  `seo` + ISO date. Keep the fallback usable on fetch failure by supporting
  **both** shapes: the view detects whether `body` is a string (fallback
  Markdown) or `BlocksContent` (CMS) and renders accordingly; same for
  flat vs `seo` metadata and free-text vs ISO date.
- Net: fallback stays exactly as-is content-wise; only the renderer learns to
  accept both shapes. Retire fallback content later when the 4 single types
  are authored & published in Strapi.

### A6. FE-4 (title suffix) — no change
- Resolved by `pageTitle()` de-dupe (already merged). Keep the FE appending
  the brand suffix; editors need not add it; if they do, no double-branding.

### Backend coordination for A
- None code-wise. **Operational:** the 4 `page-*` single types must be
  **published** with `seo` filled, and the live API token must have `find`
  on each `page-*` + `landing-page` (incl. components). See backend
  `docs/DEPLOY-RUNBOOK.md`. Until published, dual-render fallback covers it.

---

## B. Allow multiple registrations with the same email (reversed decision)

Business rule (per Andrei): a single email may register **more than once** —
parents with children in different countries share one inbox. Block only an
**exact** repeat (same email **and** same role **and** same cities); allow if
role or cities differ.

### Backend reality (already supports it — no backend change)
- `waitlist-submission.email` is **not unique**; no lifecycle uniqueness
  check; the email index is **non-unique** (lookup only). The Strapi API
  already accepts multiple same-email rows.
- The *only* gate is the FE soft-dedupe. This is purely a frontend policy
  change.

### B1. Relax the soft-dedupe (`lib/strapi.ts` `findWaitlistByEmail` + caller)
- Change the pre-check from **"email exists → block"** to:
  - fetch recent submissions for that email
    (`filters[email][$eqi]=…&fields=role&populate=…` enough to compare),
  - block **only** if an existing row has the **same `role` AND same set of
    `cities`** (order-insensitive compare),
  - otherwise allow the insert.
- Keep the friendly soft-UX (no hard error); exact-duplicate protection
  remains, the Italy/France case is permitted.
- Preserve the existing error classification (AUTH_MISCONFIG on 401/403,
  etc.) — only the "duplicate" decision logic changes.

### B2. Tests (TDD)
- same email + same role + same cities → blocked.
- same email + different role → allowed.
- same email + different cities (incl. reordered/superset) → allowed.
- email not seen → allowed.
- 401/403 from the lookup → still AUTH_MISCONFIG (unchanged).

### B3. FE-1 (consent re-stamp) — optional cleanup, low priority
- Backend widened the `gdprConsentAt` window 1h → 24h. The submit-time
  re-stamp in `SignupForm` can be dropped: stamp **once** at consent, keep
  `≤ now`. Not breaking; do it only if touching that code anyway.

### Backend coordination for B
- The dedupe lookup still needs the API token to have **`find`** (+`create`)
  on `waitlist-submission`. Same runbook prerequisite as before — the relaxed
  policy still queries by email. Deploy order unchanged: **backend token
  perms live → then deploy FE.**
- Do **not** also add a backend uniqueness rule — dedupe stays single-sourced
  in the frontend (per project guidance: never run both unaligned).

---

## ⛔ Cross-cutting: token + deploy ordering

- The frontend uses a **custom Bearer API token** (`STRAPI_API_TOKEN`), not
  the Authenticated role; the backend's codified bootstrap does **not** cover
  it. The grant is a mandatory manual Admin → API Tokens action.
- That token was exposed in chat and **must be rotated** before the grant.
- Order for any deploy touching the waitlist: **backend token perms live →
  then FE**. Out of order = every submission AUTH_MISCONFIG-fails.
