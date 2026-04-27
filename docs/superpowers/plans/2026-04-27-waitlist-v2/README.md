# Waitlist v2 — Implementation Plan (index)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the free-text "rute" field on the waitlist with a structured, role-aware ordered city list, and add GDPR consent + optional location + UTM + device signature, per `design/spec-waitlist-frontend.md` and `design/spec-waitlist-backend.md`.

**Architecture:** Frontend-only TypeScript change. Reuses the existing `CityTagInput` (extended), the `submitWaitlist` Strapi fetcher, and the `/api/waitlist` route handler. Adds five small libs (`lib/utm.ts`, `lib/geolocation.ts`, `lib/gdpr-consent.ts`) and three components (`CitiesQuestion`, `LocationPrompt`, `GdprConsent`). Backend Strapi field/enum changes are **out of scope of this plan** — they are an ops step in the runbook.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, Zod 4, Vitest, React Testing Library, MSW.

**Tests run with:** `npx vitest run <path>`

---

## Read before starting

1. `design/spec-waitlist-frontend.md` — the contract.
2. `design/spec-waitlist-backend.md` — payload shape; useful for STORY 6 (route handler).
3. `components/routes/CityTagInput.tsx` — current shape; extended in STORY 2.
4. `components/landing/SignupForm.tsx` — rewired in STORY 5.
5. `lib/waitlist-schema.ts` — replaced in STORY 1.
6. `lib/strapi.ts::submitWaitlist` — used as-is; only its MSW test changes.

## Story files (execute in order)

| # | File | What it produces |
|---|---|---|
| 1 | `01-schema.md` | New `lib/waitlist-schema.ts` with role enum + cities + consent + location + utm + client. |
| 2 | `02-citytaginput.md` | `CityTagInput` gains drag-to-reorder, insert-between, `Alt+Arrow` keyboard reorder, `originDestinationLabels` prop. |
| 3 | `03-utils.md` | `lib/utm.ts`, `lib/geolocation.ts`, `lib/gdpr-consent.ts` (constants + helpers). |
| 4 | `04-components.md` | `CitiesQuestion`, `LocationPrompt`, `GdprConsent` React components. |
| 5 | `05-signupform.md` | Rewires `SignupForm` to use the new schema, components, and payload. |
| 6 | `06-route-handler.md` | `/api/waitlist` route handler validates new shape, builds `device` from headers + client hints, IP-fallback when consent is `not_asked`. Updates `submitWaitlist` MSW test. |

## Conventions

- **Commit after each task.** Commit messages use `feat:`, `test:`, `refactor:`, `chore:`.
- **Run the suite frequently.** `npx vitest run` from repo root.
- **Don't move `CityTagInput`.** It stays in `components/routes/`; both routes admin and waitlist import from there.
- **No edits to `routes-schema.ts` or any routes admin/public component** — STORY 2 keeps default props backwards-compatible.
- **No CMS edits** — that's an ops step (`design/strapi-runbook.md` §3).
- **No commits to `main`.** Work happens on the existing `feat/routes-management` branch or a new `feat/waitlist-v2` branch.

## Verification gate (run before declaring done)

```bash
npx vitest run                                    # all unit/component tests
npx tsc --noEmit                                  # typecheck
npx next build                                    # production build
```

All three must pass before the plan is considered complete.
