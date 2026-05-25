# Stage 4 — Implementation plan (TDD)

> **Pairs with:** [`04-user-error-bubble.md`](./04-user-error-bubble.md), [`features/04-user-error-bubble.feature`](./features/04-user-error-bubble.feature).
> **Discipline:** strict red → green → refactor.

## Step 0 — Audit existing primitives (no code)

Confirm the state described in spec §2 still holds. If a notification primitive has been introduced since this spec was written, reconcile before continuing.

## Step 1 — `lib/notify.ts` store

- **Red:** `tests/lib/notify.test.ts` — `notify` adds, `dismiss(code)` removes, `clear()` empties, `subscribe` observes; FIFO drop at >3 entries; TTL auto-removes; default TTLs per level; `code` uniqueness (re-notify same code dedupes, refreshing TTL).
- **Green:** Implement with a tiny event-emitter-style store.
- **Commit:** `feat(notify, step 1): notify store`

## Step 2 — Server-side guard

- **Red:** Calling `notify()` in a non-`"use client"` context throws `NotifyOnServerError`.
- **Green:** Add the guard via a `typeof window !== "undefined"` check that throws with a clear message.
- **Commit:** `feat(notify, step 2): server-side guard`

## Step 3 — `lib/notify-codes.ts`

- **Red:** Tests verify all codes referenced by `?auth_status` values in Stage 1 callback are present and map to non-empty strings.
- **Green:** Implement, importing from `lib/auth-copy.ts`.
- **Commit:** `feat(notify, step 3): notify codes registry`

## Step 4 — `<NotifyProvider />`

- **Red:** `tests/components/NotifyProvider.test.tsx` — mounts once, subscribes to the store, renders nothing when empty, renders a list when non-empty.
- **Green:** Implement.
- **Commit:** `feat(notify, step 4): NotifyProvider`

## Step 5 — `<Notify />` item rendering

- **Red:** Renders message + level icon + dismiss button; `role="status"` for info/warn, `role="alert"` for error; dismiss button removes; entry/exit transitions don't break tests (assertion is on final state).
- **Green:** Implement.
- **Commit:** `feat(notify, step 5): Notify item rendering`

## Step 6 — URL bridge effect

- **Red:** A new client-side hook `useAuthStatusBridge()` reads `?auth_status` on mount, maps via `NOTIFY_CODES`, calls `notify`, then `history.replaceState` to drop the param.
- **Green:** Implement.
- **Commit:** `feat(notify, step 6): auth_status URL bridge`

## Step 7 — Mount `<NotifyProvider />` in root layout

- **Red:** `tests/app/layout.test.tsx` — provider mounted exactly once.
- **Green:** Add to `app/layout.tsx`.
- **Commit:** `feat(notify, step 7): mount NotifyProvider`

## Step 8 — Replace Stage-1 inline banner with notify call

- **Red:** Update `tests/components/Signup.test.tsx` to assert that the cancel scenario surfaces via the bubble, not an inline banner.
- **Green:** Remove the inline banner; rely on the URL-bridge effect. Stage-1 cancel scenario now naturally surfaces through `notify`.
- **Commit:** `refactor(notify, step 8): retire stage-1 inline banner`

## Step 9 — Visual smoke + PR

- Trigger the cancel flow in dev. Confirm bubble appears, dismisses on click, auto-dismisses after TTL.
- Test on mobile viewport.
- Test multiple stacked bubbles (e.g. emit 4 in a row → 3 visible).

## Definition of done

All Gherkin scenarios in `features/04-user-error-bubble.feature` green; lint clean; bundle delta ≤ 4 KB gzipped.
