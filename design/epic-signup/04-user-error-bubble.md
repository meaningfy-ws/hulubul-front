# Stage 4 — User notification bubble (cross-cutting)

> **Status:** Spec. Implementation in its own PR, scheduled **after** Stage 1 has merged. Stage 1 ships with a minimal inline banner; this stage replaces it with the cross-cutting bubble.
> **Date:** 2026-05-25.
> **Prerequisites:** None hard. Useful to read [`00-architecture.md`](./00-architecture.md) for the two-channel principle (INV-7).
> **Gherkin scenarios:** [`../../tests/features/auth-04-user-error-bubble.feature`](../../tests/features/auth-04-user-error-bubble.feature).
> **Plan:** [`04-user-error-bubble-plan.md`](./04-user-error-bubble-plan.md).

## 1. Goal

A single, page-scoped, business-language notification surface — a "bubble" or "popup" — for telling users about workflow-level outcomes that are not local to a single form. Examples: a Google sign-in was cancelled, a feature is temporarily unavailable, a consent action succeeded.

Decoupled from the existing technical channel (`lib/logger.ts`), which continues to serve developers via the browser console + future observability backends.

## 2. What exists today

Audit performed during brainstorming (gitnexus + grep):

| Primitive | Lives in | Audience | Scope |
|---|---|---|---|
| `lib/logger.ts` | server + client wrapper around `console.*`, scope-tagged | technical | global |
| `lib/form-errors.ts` | translates errors into Romanian user-readable strings | end user | inside a `<form>` |
| `lib/form-status.ts` | typed form lifecycle enum | end user | inside a `<form>` |
| `vanilla-cookieconsent` (dependency) | GDPR banner | end user | global |
| No page-level user-notification component exists. | — | — | — |

Stage 1 needs to inform the user that "Sign-in was cancelled" *outside* the context of a form submission — Strapi never gets called, so `form-errors.ts` does not apply. This spec fills that gap.

## 3. Design

### 3.1 Two parallel channels (INV-7 restated)

```
                ┌────────────────────────────────────────────────────┐
                │                                                    │
                │   logger.error("auth/callback", "...", err)        │  ← technical channel
                │                                                    │     (console + observability)
                │   notify({                                         │  ← user channel
                │     level: "info" | "warn" | "error",              │     (bubble)
                │     code:  "AUTH_CANCELLED",                       │
                │     message: AUTH_COPY.notice.cancelled,           │
                │     ttlMs: 8000,                                   │
                │   })                                               │
                └────────────────────────────────────────────────────┘
```

These are independent. A code path may emit to one, the other, both, or neither.

### 3.2 Module shape

```
lib/notify.ts                     — pure: queue, dedupe, ttl, level
components/notify/Notify.tsx       — client component reading the queue
components/notify/NotifyProvider.tsx — mounts once in the root layout
```

`lib/notify.ts` exposes:

```ts
export type NotificationLevel = "info" | "warn" | "error";

export interface Notification {
  code: string;             // stable, programmatic. e.g. "AUTH_CANCELLED"
  level: NotificationLevel;
  message: string;          // user-facing, already-translated
  ttlMs?: number;           // default 8000 for info, 12000 for error, 0 = sticky
}

export function notify(n: Notification): void;
export function dismiss(code: string): void;
export function clear(): void;
export function subscribe(listener: (queue: Notification[]) => void): () => void;
```

The store is in-memory only (per-tab, per-load). Never persisted across navigation except via the URL `?auth_status=…` mechanism (see §3.4).

### 3.3 Rendering

`<Notify />` is a fixed-position, top-center container (mobile: full-width sticky-top; desktop: centered, max-width 480px). Each notification is a small rounded "bubble" with:

- Icon (info / warn / error)
- Message text
- Optional dismiss button (× — always available regardless of TTL)

Stack: max 3 visible at a time; older ones FIFO-dropped. Animations: 200ms slide-down on enter, 150ms fade on exit.

### 3.4 Bridging server → client

Server-side code (route handlers, server components) cannot directly call `notify()` — it's client-state. The bridge is the URL query param `?auth_status=<code>`:

```
/api/auth/callback → 302 /#signup?auth_status=cancelled
                                          │
                                          ▼
                            Client root effect:
                            reads ?auth_status from URL,
                            looks up AUTH_COPY.notice[code],
                            calls notify(...),
                            removes the param via history.replaceState
```

This pattern is generic. Any feature that wants to surface a server-side outcome to a user uses `?status=<code>` (or feature-scoped `?<feature>_status=<code>`).

### 3.5 Status-code → copy mapping

Defined in `lib/notify-codes.ts`:

```ts
import { AUTH_COPY } from "./auth-copy";

export const NOTIFY_CODES = {
  AUTH_CANCELLED:           { level: "info",  message: AUTH_COPY.notice.cancelled },
  AUTH_UNREACHABLE:         { level: "error", message: AUTH_COPY.notice.unreachable },
  AUTH_GENERIC:             { level: "error", message: AUTH_COPY.notice.generic },
  AUTH_INVALID_STATE:       { level: "error", message: AUTH_COPY.notice.generic }, // same UX, distinct log
  AUTH_TOKEN_EXCHANGE_FAILED: { level: "error", message: AUTH_COPY.notice.generic },
  AUTH_TOKEN_INVALID:       { level: "error", message: AUTH_COPY.notice.generic },
} as const;
```

The URL-bridge layer in §3.4 maps each `?auth_status=<code>` to a `NOTIFY_CODES` entry. Unknown codes are ignored (silently logged via `logger.warn` for technical debug).

## 4. Acceptance criteria

- [ ] Gherkin scenarios in `../../tests/features/auth-04-user-error-bubble.feature` covered.
- [ ] `lib/notify.ts` has ≥ 95% coverage (it's the seam every feature will rely on).
- [ ] `<Notify />` renders correctly at mobile and desktop breakpoints (screenshot tests if practical, otherwise manual smoke in PR).
- [ ] Stage 1's inline cancel notice is removed and replaced with `notify()` + URL bridge.
- [ ] No new `console.log` calls — anything technical goes through `lib/logger.ts`.
- [ ] `notify()` does not run on the server (guarded with `"use client"`); a server-side call throws a clear error.

## 5. Risks

| ID | Risk | Mitigation |
|---|---|---|
| S4-R1 | Two-channel rule is violated (technical messages shown to users) | Code review + a lint-like test asserting no `logger.*` arg appears as a `notify` message. |
| S4-R2 | URL-bridge param leaks PII | `?auth_status=<code>` is enum-only; never user data. Tests assert. |
| S4-R3 | Bubble accessibility (screen readers miss it) | `role="status"` for info, `role="alert"` for error; tested via Testing Library. |
| S4-R4 | Bubble z-index / layout breaks consent banner | Bubble z-index sits below the consent banner; visual test. |
| S4-R5 | Devs reach for `alert()` because they forgot the bubble exists | The Stage-1 cancel scenario uses the bubble in the merged PR — establishes the pattern. Add `docs/runbooks/user-notifications.md` (short) pointing future authors at it. |

## 6. Out of scope

- Server-pushed notifications (no WebSocket / SSE).
- Persistent / cross-tab notifications.
- A11y-rich live region semantics beyond `role="status"` / `role="alert"`.
- Themed brand polish — Stage 4 ships *functional*; visual polish is a follow-up.

## 7. References

- [`00-architecture.md`](./00-architecture.md) — INV-7 (two channels).
- [`01-google-prefill.md`](./01-google-prefill.md) — first consumer.
- [`../../tests/features/auth-04-user-error-bubble.feature`](../../tests/features/auth-04-user-error-bubble.feature)
- [`04-user-error-bubble-plan.md`](./04-user-error-bubble-plan.md)
