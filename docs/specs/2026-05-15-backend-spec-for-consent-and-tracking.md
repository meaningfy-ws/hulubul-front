# Backend spec — consent record + tracking joinability

**Date:** 2026-05-15
**Repo:** Strapi backend (separate from this frontend repo).
**Companion specs:**
- `2026-05-14-tracking-and-consent-spec.md` (in the frontend repo) — full
  context for *why* this work exists.
- `2026-05-14-seo-tracking-implementation-plan.md` — phased frontend
  implementation; this spec is the matching backend slice.

**Status:** Spec only. Not blocking the frontend PR — the frontend
ships a fire-and-forget POST that degrades gracefully when this work
isn't deployed yet. Once these changes land, the audit trail starts
filling automatically.

---

## 1. Why backend work is needed at all

The frontend can:
- Show the consent banner.
- Persist consent to the user's `localStorage`.
- Gate trackers correctly based on that local state.

It **cannot**:
- **Demonstrate** to a regulator that consent was given (GDPR Art. 7(1)).
  Local state is wiped the first time the user clears cookies; an
  auditor sees nothing.
- **Join** a `waitlist-submission` row to the consent record that
  authorised it. We need to answer "show me the consent that
  authorised this submission" with one SQL/Strapi query, not a
  cross-system reconstruction.

Both gaps are closed by storing the consent decision server-side.

---

## 2. Required: `consent-record` collection

### 2.1 Definition

Collection-type, name `consent-record`, plural `consent-records`.
`draftAndPublish: false` — every consent action is a fact, never a
draft.

| Field         | Type                          | Required | Notes                                                                                                                |
|---------------|-------------------------------|----------|----------------------------------------------------------------------------------------------------------------------|
| `sessionId`   | string (max 64)               | yes      | UUID generated client-side on first banner interaction. Joins multiple consent events from the same browser session. |
| `analytics`   | enum (`granted`, `denied`)    | yes      | Did the user grant the analytics category?                                                                            |
| `marketing`   | enum (`granted`, `denied`)    | yes      | Did the user grant the marketing category?                                                                            |
| `version`     | string (max 32)               | yes      | Banner copy version (ISO date, e.g. `"2026-05-14"`). Bumps trigger a re-prompt.                                       |
| `event`       | enum (`grant`, `update`, `withdraw`) | yes | `grant` = first acceptance; `update` = changed via preferences; `withdraw` = full reset.                              |
| `choseAt`     | datetime                      | yes      | Client-side timestamp of the choice. Server records its own `createdAt` separately.                                   |
| `userAgent`   | string (max 512)              | no       | From request headers, server-side. Truncated by the frontend route handler.                                           |
| `language`    | string (max 16)               | no       | First entry from `Accept-Language`.                                                                                   |
| `country`     | string (max 2)                | no       | From the edge `x-vercel-ip-country` / `cf-ipcountry` header, when available.                                          |
| `referrer`    | string (max 2048)             | no       | From the request `referer` header. Where the user came from when they consented.                                     |

### 2.2 Permissions

The frontend POSTs to this collection from `app/api/consent/route.ts`,
which in turn calls Strapi via `strapiFetch` with the existing
`STRAPI_API_TOKEN`. So:

- **Token (`STRAPI_API_TOKEN`):** add `create` permission on
  `consent-record`. Same token already has `create` on
  `waitlist-submission` and `survey-sender`; same model.
- **Public role (anonymous):** *no* permissions. The frontend route
  handler is the only authorised caller; the public API never accepts
  consent records directly.

### 2.3 What Strapi receives

The frontend route handler validates with Zod, augments with
header-derived fields, and POSTs:

```http
POST /api/consent-records
Authorization: Bearer <STRAPI_API_TOKEN>
Content-Type: application/json

{
  "data": {
    "sessionId": "550e8400-e29b-41d4-a716-446655440000",
    "analytics": "granted",
    "marketing": "denied",
    "version": "2026-05-14",
    "event": "grant",
    "choseAt": "2026-05-15T10:23:11.000Z",
    "userAgent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36...",
    "language": "ro-RO",
    "country": "LU",
    "referrer": "https://hulubul.com/"
  }
}
```

Strapi responds with the canonical `{ data: { documentId, ... } }`.
The frontend stores `documentId` in the user's `localStorage` so a
later submission can reference it (see §3 below).

---

## 3. Optional but highly recommended: relation from submissions

### 3.1 What

Add a one-to-one relation on each user-submission collection:

- `waitlist-submission.consentRecord → consent-record`
- `survey-sender.consentRecord → consent-record`
- `survey-transporter.consentRecord → consent-record` (when shipped)

The relation is **optional** (not required) because:
- A user who refused all cookies AND submitted the form has no
  consent record — but their submission is still valid (the form has
  its own per-submission `gdprConsent` checkbox, see §4).
- Backwards compatibility — existing rows without the relation must
  not error.

### 3.2 Why

GDPR audits ("show me the consent that authorised this submission")
become a single Strapi join: `populate=consentRecord` on the
submission. Without the relation we'd reconstruct it via timestamps
and `sessionId` matching — fragile and slow.

### 3.3 How the frontend will populate it

The frontend already returns the `documentId` of a `consent-record`
when the banner save succeeds. It stores that id in `ConsentState.recordId`
(in `localStorage`). When the user later submits the waitlist or the
survey, the form payload includes `consentRecord: <documentId>`.

The form components don't need a code change beyond passing the id
through — that ships as part of the frontend implementation plan
Phase 14.

---

## 4. What this spec does NOT replace

The waitlist form has had a **per-submission GDPR checkbox** since
2026-04 (`gdprConsent`, `gdprConsentAt`, `gdprConsentVersion` fields
on `waitlist-submission`). That's a different consent:

| Layer | Purpose | Storage |
|---|---|---|
| Cookie/tracker consent (this spec) | "Agree to load analytics/marketing scripts in my browser." | `consent-record` collection. |
| Per-submission GDPR consent (already shipped) | "Agree to process my name/email/phone for the purpose of contacting me at launch." | `waitlist-submission.gdprConsent*` fields. |

Both must continue to exist. They have different legal bases under
GDPR (Art. 6/7 vs. ePrivacy Art. 5(3)) and serve different audit
needs. The `consentRecord` relation in §3 links them so an auditor
can see both at once for any submission.

---

## 5. Out of scope for this spec

These are explicitly not requested here. They may come in a later
iteration; calling them out so the backend team isn't surprised:

| Future work | Why deferred |
|---|---|
| Strapi lifecycle hooks dispatching server-side conversions (Meta CAPI, TikTok Events, GA4 Measurement Protocol) | The frontend's Next.js route handler does this today; moving to Strapi lifecycle hooks would scatter ad-stack secrets across two repos. Revisit only if the frontend approach proves unreliable. |
| Withdrawal cascade (deleting a `consent-record` should NOT delete the submissions that referenced it) | Should be the default Strapi behaviour for the relation. Verify when implementing; document the expected behaviour. |
| Read API for the `consent-record` collection | Not required for v1. If admin tooling needs to read records, expose only to admin role, never to the API token used by the frontend. |
| Bulk export for GDPR Article 15 (right of access) | Separate data-subject-rights spec. |

---

## 6. Acceptance

### 6.1 Backend
- [ ] `consent-record` collection exists with the fields and types in §2.1.
- [ ] `STRAPI_API_TOKEN` has `create` permission on `consent-record`.
- [ ] Public role has no permissions on `consent-record`.
- [ ] (Optional) `waitlist-submission` and `survey-sender` carry an
      optional `consentRecord` relation to `consent-record`.

### 6.2 End-to-end (verifiable from the frontend deploy)
- [ ] Click "Accept all" in the banner on production → a row appears
      in Strapi admin → Content Manager → Consent Records, with
      `event: "grant"`, the right `version`, and the request headers
      populated.
- [ ] Submit the waitlist after consent → the new
      `waitlist-submission` row's `consentRecord` relation points at
      the consent record from the previous step (when §3 ships).
- [ ] Withdraw consent → a new row appears with `event: "withdraw"`.
      The previous `grant` row is **not** deleted (audit trail).

---

## 7. Effort estimate

- §2 (collection + permissions): **~30 min** in Strapi admin (no
  custom controllers needed).
- §3 (one-to-one relations on two submission collections): **~10 min**
  in Strapi admin.

Total: under an hour. The frontend ships independently and starts
benefiting immediately when this work lands.
