# Backend spec — CMS fields for auth copy

> **Audience:** the team that owns the Strapi backend repo.
> **Status:** Spec only. Frontend does not require these fields to ship Stage 1; they enable migrating the Romanian auth copy from hardcoded values to CMS-managed content.
> **Date:** 2026-05-25.
> **Frontend counterpart:** [`01-google-prefill.md`](./01-google-prefill.md), `lib/auth-copy.ts`.

## 1. Motivation

Stage 1 of the signup epic introduces three classes of Romanian user-facing strings:

1. Auth button labels — *"Continuă cu Google"*, *"Continuă cu Facebook"*, etc.
2. Verified-email badge — *"verificat prin Google"*, etc.
3. Notification bubble messages — cancel, unreachable, generic.

These are currently hardcoded in `lib/auth-copy.ts` because adding Strapi fields was deferred (per [`00-architecture.md §11 D9`](./00-architecture.md#11-decisions-captured-during-brainstorming)). When the marketing/content team wants to A/B-test or refine these strings, they need them in the CMS like every other piece of user-visible copy.

## 2. Requested change to Strapi

### 2.1 Collection

Extend the existing **`landing-page`** single type. Do **not** create a new collection.

### 2.2 Fields

Add a single new component named `auth-copy` and embed it once on `landing-page`. The component holds the following text fields (all required unless noted):

| Field name | Type | Default value (Romanian) | Notes |
|---|---|---|---|
| `googleButtonLabel` | Text (short) | `Continuă cu Google` | |
| `facebookButtonLabel` | Text (short) | `Continuă cu Facebook` | |
| `tiktokButtonLabel` | Text (short) | `Continuă cu TikTok` | Optional; nullable. |
| `verifiedTagGoogle` | Text (short) | `verificat prin Google` | |
| `verifiedTagFacebook` | Text (short) | `verificat prin Facebook` | |
| `verifiedTagTiktok` | Text (short) | `verificat prin TikTok` | Optional; nullable. |
| `noticeCancelled` | Text (long) | `Conectarea cu {provider} nu a fost finalizată. Poți completa formularul manual.` | `{provider}` placeholder interpolated by frontend. |
| `noticeUnreachable` | Text (long) | `Conectarea este temporar indisponibilă. Încearcă din nou sau completează formularul manual.` | |
| `noticeGeneric` | Text (long) | `Nu am putut finaliza conectarea. Încearcă din nou sau completează formularul manual.` | |

### 2.3 Permissions

- The new component is readable via the existing **public** `landing-page` GET endpoint (same as all other landing-page fields).
- No write permission for end users.

### 2.4 Versioning / migration

- One-off migration: insert defaults into the existing published `landing-page` entry. Editors can change them afterwards.

## 3. Frontend usage after this lands

```ts
// lib/auth-copy.ts becomes a translator from Strapi shape → the same keyed object today's code uses.
// Components that import from "lib/auth-copy" do not change.

export function makeAuthCopy(landingPage: StrapiLandingPageDto): AuthCopy {
  const c = landingPage.attributes.authCopy;
  return {
    buttonContinueWith: {
      google:   c.googleButtonLabel,
      facebook: c.facebookButtonLabel,
      tiktok:   c.tiktokButtonLabel ?? "",
    },
    // ...
  };
}
```

The hardcoded defaults stay as a fallback if Strapi returns nullish values (defensive — should never happen given the required-fields constraint).

## 4. Non-goals

- No new collection.
- No new permissions model.
- No new API endpoint.
- No backend behavioural change beyond exposing additional fields on an existing endpoint.

## 5. Acceptance for the backend PR

- [ ] Component `auth-copy` exists with the fields above.
- [ ] `landing-page` references it once.
- [ ] GET `/api/landing-page?populate[authCopy][populate]=*` returns the component with default values populated.
- [ ] Existing tests on the Strapi side pass; new tests cover the field shape.

## 6. Coordination

When this lands on the backend, the frontend opens a small follow-up PR that:

- Adds the `authCopy` block to the existing Strapi populate query (`lib/populate.ts`).
- Switches `lib/auth-copy.ts` from hardcoded constants to a function over the Strapi response, with the current hardcoded values as the fallback.
- Adds a test asserting that when the Strapi response includes the new fields, the rendered button labels match.

This frontend PR is small (~50 LoC) and does not block Stage 1, 2, or 3.
