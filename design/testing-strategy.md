# Testing Strategy — hulubul-front

> **Audience:** anyone writing or reviewing code in this repo.
> **Date:** 2026-04-23.
> **Stance:** TDD is the default. The rubric below decides *which kind* of test you write first, not whether you write one.

## 1. Principles

1. **A test exists to catch something silently.** If the bug would be loud in development (TypeScript error, compile failure, obvious visual break), don't write a test for it.
2. **Test at the lowest layer that gives confidence.** Unit before component, component before integration, integration before E2E. Move up only when the lower layer can't see the bug.
3. **Every bug gets one regression test.** First commit after a bug is the test that would have caught it. No exceptions.
4. **Contracts with external systems are tested, always.** Strapi schema changes, Zitadel claim shapes, Airtable field names — if a provider can silently break us, we have a test.
5. **Pin behaviour, not implementation.** Query by role / label / text, not by CSS class or DOM structure. Tests should survive refactors of the internals.
6. **No flaky tests.** A flaky test is worse than no test — it trains the team to ignore failures. Delete or fix within the same PR that spots the flake.
7. **Fast feedback beats high coverage.** Unit + component tests must run in <2 s locally. E2E runs in minutes and on CI, not per-save.

## 2. The test pyramid, calibrated for this project

```
                   ▲  E2E (Playwright)
                   │  ~5 specs, critical paths only
                   │  — run on PRs + pre-deploy
                ───┼───
                   │  Integration (Vitest + MSW, Route handlers)
                   │  ~10 tests, flows that cross the server/client
                   │  or server/backend seam
                ───┼───
                   │  Component (Vitest + Testing Library)
                   │  ~15 tests, components with branching logic
                ───┼───
                   │  Unit (Vitest)
                   │  ~30 tests, pure modules in lib/
                   ▼  — run on every save, <1 s total
```

Ratios are guidance, not quotas. The shape matters more than the numbers.

## 3. Tool map

| Tool | Role | Analogous to (Python) |
|---|---|---|
| **Vitest** | Test runner + assertion library | `pytest` |
| **@testing-library/react** | DOM queries that mirror what a user perceives | — (no clean analogue; closest is BDD's "step" vocabulary) |
| **@testing-library/user-event** | Realistic keyboard/mouse simulation | — |
| **MSW** (Mock Service Worker) | HTTP interception; lets tests use `fetch` without a real server | `responses` / `httpx_mock` |
| **Zod** | Schema parsing used as runtime contract tests | `pydantic` validation |
| **Playwright** | Real-browser E2E; boots the Next.js server | `selenium` / `playwright-python` |
| **Playwright `toHaveScreenshot`** | Visual regression via pixel diff | `pytest-playwright-visual` |

Optional, not currently in this repo:
- **Storybook** — component workshop + visual-regression surface. Worth adding only when the component library exceeds ~20 stateful components.
- **playwright-bdd / cucumber-js** — Gherkin layer on top of Playwright. Worth it only if non-devs author scenarios.

## 4. When to write which test (decision rubric)

Apply in order. Stop at the first match.

| The thing you're writing | Start with |
|---|---|
| A pure function, parser, or data transform | **Unit test** (`tests/lib/*.test.ts`) |
| A Zod schema, a populate builder, a URL builder | **Unit test** |
| A Next.js Route Handler (`app/api/*/route.ts`) | **Unit test** — construct a `Request`, call the handler, assert on the `Response` |
| A React component with state, branching, or form logic | **Component test** (`tests/components/*.test.tsx`) |
| A React component that calls `fetch` | **Component test with MSW** |
| A Server Component that fetches data | Unit-test the *helper* it calls; cover the composition in **E2E** |
| Middleware | **Unit test** — pass a fake `NextRequest`, assert on the returned `NextResponse` |
| A full user journey that crosses pages / hydration / real HTTP | **E2E test** (`e2e/*.spec.ts`) |
| Visual appearance | Skip unless you've been bitten. If yes: **Playwright `toHaveScreenshot`** |
| A component that is pure props → JSX, <20 lines, no state | **Don't test.** TypeScript + an E2E smoke is enough |
| A third-party library behaviour | **Don't test.** Trust the library or switch libraries |

## 5. Recipes — what each kind of test looks like here

All examples are taken from or aligned with code already in this repo. Paths are relative to the repo root.

### 5.1 Unit test — pure function

For anything that's just input-in, output-out. No network, no DOM.

```ts
// tests/lib/populate.test.ts
import { describe, it, expect } from "vitest";
import { buildLandingPopulate } from "@/lib/populate";

describe("buildLandingPopulate", () => {
  it("hydrates the depth-3 footer.columns.links chain", () => {
    const populate = buildLandingPopulate();
    expect(populate.footer).toEqual({
      populate: { columns: { populate: ["links"] } },
    });
  });
});
```

**Cost:** seconds to write, runs in single-digit ms, catches contract drift with Strapi.

### 5.2 Unit test — Zod schema (contract)

Schema-as-code tests document the contract and surface every edge case.

```ts
// tests/lib/waitlist-schema.test.ts
import { waitlistSchema } from "@/lib/waitlist-schema";

it("rejects unknown role values", () => {
  const result = waitlistSchema.safeParse({
    name: "Ion",
    contact: "x",
    role: "something-else",
  });
  expect(result.success).toBe(false);
});

it("trims whitespace", () => {
  const result = waitlistSchema.safeParse({
    name: "  Ion  ", contact: "  x  ", role: "ambele",
  });
  expect(result.success && result.data.name).toBe("Ion");
});
```

**Why it matters:** the schema is the single source of truth for what the form can submit. Drift between schema + form + backend surfaces here first.

### 5.3 Unit test — Route Handler

Next.js route handlers are just functions that return a `Response`. Test them like any HTTP handler.

```ts
// tests/api/waitlist-route.test.ts
import { POST } from "@/app/api/waitlist/route";
import { vi } from "vitest";

it("returns 400 when the payload is invalid", async () => {
  const req = new Request("http://test/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "", contact: "", role: "expeditor" }),
  });
  const res = await POST(req);
  expect(res.status).toBe(400);
  expect((await res.json()).error).toMatch(/obligatori/i);
});

it("returns 502 when Strapi is unreachable", async () => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", "http://127.0.0.1:1"); // unroutable
  const req = new Request("http://test/api/waitlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Ion", contact: "x", role: "expeditor" }),
  });
  const res = await POST(req);
  expect(res.status).toBe(502);
});
```

**Why it matters:** the route handler is the boundary between browser input and backend. It owns validation and error translation. Component tests can't see this layer directly.

### 5.4 Integration test — fetcher × mocked backend (MSW)

For any code that calls `fetch`, MSW intercepts at the network layer — the code under test believes it's talking to a real server.

```ts
// tests/lib/strapi.test.ts
import { server } from "@/tests/msw/server";
import { http, HttpResponse } from "msw";
import { getLandingPage, LandingPageNotPublishedError } from "@/lib/strapi";

it("throws LandingPageNotPublishedError on 404", async () => {
  server.use(
    http.get(`${TEST_STRAPI_URL}/api/landing-page`, () =>
      HttpResponse.json({ error: { status: 404 } }, { status: 404 }),
    ),
  );
  await expect(getLandingPage()).rejects.toBeInstanceOf(
    LandingPageNotPublishedError,
  );
});
```

**Why it matters:** error-path coverage. In production we can't force the backend to 404; in tests it's one line.

### 5.5 Component test — stateless rendering

For components with real logic (branching, repetition, prop-driven variants). Query by role or label, not by class name.

```tsx
// tests/components/Faq.test.tsx
import { render, screen } from "@testing-library/react";
import { Faq } from "@/components/landing/Faq";

it("renders inline markdown links inside the answer", () => {
  render(<Faq data={{ ...fixture, items: [
    { id: 1, question: "Q?", answer: "see [link](#map)" },
  ]}} />);
  expect(screen.getByRole("link", { name: "link" })).toHaveAttribute(
    "href", "#map",
  );
});
```

**Rule:** never assert on a CSS class name. `getByRole`, `getByLabelText`, `getByText` survive CSS refactors.

### 5.6 Component test — interactive

`@testing-library/user-event` simulates real typing and clicking. Combine with MSW or a `vi.fn()` for `fetch`.

```tsx
// tests/components/SignupForm.test.tsx
import userEvent from "@testing-library/user-event";

it("submits name/contact/role to /api/waitlist and shows success", async () => {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 201 }),
  );
  const user = userEvent.setup();
  render(<SignupForm data={fixture.signup} />);

  await user.type(screen.getByLabelText(/nume/i), "Ion");
  await user.type(screen.getByLabelText(/email/i), "ion@x");
  await user.click(screen.getByRole("button", { name: fixture.signup.submitLabel }));

  await waitFor(() =>
    expect(screen.getByText(fixture.signup.successTitle)).toBeInTheDocument(),
  );
});
```

**Why it matters:** this is the test that proves the business-critical flow works end-to-end inside the browser runtime, without needing a browser.

### 5.7 Middleware unit test

Next.js middleware is a function `(NextRequest) => NextResponse | Promise<NextResponse>`. Test it with a constructed request.

```ts
// tests/middleware.test.ts (illustrative — middleware lands in the Zitadel epic)
import { middleware } from "@/middleware";
import { NextRequest } from "next/server";

it("redirects anonymous /account to signin", async () => {
  const req = new NextRequest("http://test/account");
  const res = await middleware(req);
  expect(res.status).toBe(307);
  expect(res.headers.get("location")).toContain("/api/auth/signin");
});

it("passes through /api/waitlist", async () => {
  const req = new NextRequest("http://test/api/waitlist", { method: "POST" });
  const res = await middleware(req);
  expect(res.status).toBeLessThan(400); // NextResponse.next()
});
```

### 5.8 E2E — Playwright smoke

Boots the real Next.js server, real browser, exercises the full hydration path. One smoke test catches a whole class of build-time and SSR bugs that unit tests cannot.

```ts
// e2e/waitlist.spec.ts
import { test, expect } from "@playwright/test";

test("anonymous visitor submits the waitlist", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel(/nume/i).fill("Ion Popescu");
  await page.getByLabel(/email/i).fill("ion@example.com");
  await page.getByRole("button", { name: /mă înscriu/i }).click();
  await expect(page.getByText(/te-am adăugat/i)).toBeVisible();
});

test("renders the coming-soon placeholder when the backend has no entry", async ({ page }) => {
  // This test relies on the live backend state; flip to MSW-booted server when it stops matching.
  await page.goto("/");
  await expect(page.getByText(/site-ul se pregătește/i)).toBeVisible();
});
```

**Rule:** E2E tests have the highest maintenance cost. Write one per critical journey; resist the urge to cover branches better handled at the component level.

### 5.9 Contract test — parse real backend response

Periodically (or on CI against a staging backend), parse a real response through Zod to detect drift.

```ts
// tests/contracts/landing-page.contract.test.ts (run on demand, not on every push)
import { z } from "zod";
import { landingPageSchema } from "@/lib/types-schema"; // Zod mirror of LandingPage

it("live Strapi response matches frontend types", async () => {
  const res = await fetch(`${process.env.NEXT_PUBLIC_STRAPI_URL}/api/landing-page?populate=*`, {
    headers: { Authorization: `Bearer ${process.env.STRAPI_API_TOKEN}` },
  });
  const json = await res.json();
  expect(() => landingPageSchema.parse(json.data)).not.toThrow();
});
```

**Why it matters:** catches schema drift before users do. Runs nightly, not on every PR (flaky — depends on backend).

## 6. What NOT to test (with reasoning)

| Pattern | Why skip |
|---|---|
| `<Logo/>` or any <20-line passthrough component | TypeScript + Playwright smoke already prove it renders |
| Assertions on `className` contents | Breaks every time CSS is refactored. Use `getByRole` / `getByLabelText` |
| `react-markdown`, `next/font`, `qs`, `zod` internals | Third-party. If broken, switch libraries, don't paper over with tests |
| CSS breakpoints, transitions, animations | Fragile in jsdom; add visual regression only after a real regression |
| The font actually loading | Playwright smoke sees it; no point in unit-testing |
| Every branch of a typed prop union | TypeScript's exhaustiveness checks do this for free |
| Private helpers with no independent meaning | Test the public API they support; the helper coverage follows |
| Server Components' async internals | Test the data-fetching helpers; cover composition in E2E |

## 7. Project coverage matrix (as of 2026-04-23)

| Layer | Location | Status | Gap |
|---|---|---|---|
| Data contract (populate) | `tests/lib/populate.test.ts` | Necessary ✅ | — |
| Data contract (validation) | `tests/lib/waitlist-schema.test.ts` | Necessary ✅ | — |
| Fetcher × mocked backend | `tests/lib/strapi.test.ts` | Necessary ✅ | — |
| Route handler | `tests/api/waitlist-route.test.ts` | **Missing** | Add — covers 400/502 not exercised by the SignupForm test |
| Business-critical component | `tests/components/SignupForm.test.tsx` | Necessary ✅ | Extend for remember-me epic |
| Markdown-rendered content | `tests/components/Faq.test.tsx` | Keep ✅ | Borderline — keep while FAQ is load-bearing |
| Typographic primitive | `tests/components/SplitTitle.test.tsx` | **Overkill** | Consider deleting; TypeScript + smoke cover it |
| Section components (Nav, Hero, Problem, Trust, Footer, HowItWorks, Audience) | n/a | Not needed | Covered by E2E smoke |
| E2E smoke — page loads | n/a | **Missing** | Add Playwright |
| E2E smoke — form submits | n/a | **Missing** | Add Playwright |
| E2E smoke — empty-state renders | n/a | **Missing** | Add Playwright |
| Contract test — live Strapi shape | n/a | Optional | Run nightly against staging; not in CI PR gate |
| Visual regression | n/a | Skip | Add only on a real regression |

## 8. TDD workflow (Red / Green / Refactor)

Same cycle as pytest; different runner.

```bash
npm run test:watch          # keep this open
# 1. Write the failing test (Red)
# 2. Implement the minimum to pass (Green)
# 3. Refactor internals; tests must stay green (Refactor)
```

Local-loop targets:
- **Unit + component tests:** <2 s total. Vitest's watch mode re-runs only the affected files.
- **Typecheck:** `npm run typecheck` before push.
- **E2E:** `npx playwright test` — minutes, not seconds. Run before PR, not per-save.

Pre-commit hook (suggested, not enforced in the repo yet):

```bash
# scripts/hooks/pre-commit
npm test -- --run && npm run typecheck || exit 1
```

## 9. CI integration (recommended)

Minimum pipeline per PR:

```yaml
# .github/workflows/ci.yml (sketch — not committed yet)
jobs:
  test:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 22, cache: npm }
      - run: npm ci
      - run: npm run typecheck
      - run: npm test -- --run
      - run: npm run build        # catches SSR + env surprises
  e2e:
    needs: test
    steps:
      - uses: actions/checkout@v4
      - run: npm ci && npx playwright install --with-deps chromium
      - run: npm run build && npx playwright test
```

Gate merges on all four stages passing. Optional parallelism: run `typecheck` + `test` + `build` in parallel; `e2e` depends on them.

Nightly (separate workflow):
- Contract test against the live (or staging) Strapi.
- Playwright visual-regression run if/when adopted.

## 10. Anti-patterns to refuse in review

- Tests that query DOM by CSS class or tag structure (`container.querySelector(".btn-primary")`).
- `expect(something).toBeTruthy()` used as the only assertion — says nothing specific.
- Tests that import internal helpers from other modules' internals.
- `waitFor(() => { /* nothing */ })` swallowed as "give it time" — the DOM has specific events, wait for them.
- Snapshots of entire components. Use targeted assertions; snapshots rot silently.
- Tests that hit the network. Always mock (MSW in unit/component, test-server or staging in E2E).
- Commented-out tests. Delete or fix; never ship muted tests.
- Tests that depend on test execution order.

## 11. Adding tests for new epics — worked expectations

| Epic | New tests needed |
|---|---|
| `design/epic-signup/remember-me.md` | 1 unit file for `lib/remember-me.ts` (6 cases incl. SSR guard + TTL + quota). Extend `SignupForm.test.tsx` with 3 cases. **No E2E** (hydration is already covered by the page-load smoke). |
| `design/epic-signup/login.md` | 1 unit for Auth.js config (MSW-mocked OIDC). 1 unit for middleware. 1 component test for `<AccountMenu/>` (signed-in vs. signed-out). **1 E2E** that actually logs in against a test Zitadel tenant — the high value one. Skip for self-registration branch; covered by Zitadel's own tests. |
| Future "per-user Strapi data" | Route-handler tests multiply (authorization branches). Add Zod contract tests for user-owned collections. One E2E per authorized flow. |
| Future payments/Stripe | Unit tests for webhook signature verification (critical, subtle). Component tests for the checkout button. E2E only against Stripe's test mode, on a schedule. Never hit real Stripe in CI. |

## 12. When to break the rules

- **Prototype / spike code:** no tests required; mark clearly, ship behind a feature flag, delete or properly test before merge to main.
- **Generated code** (Zod from OpenAPI, Strapi types): don't test the generator's output; trust the generator or switch it.
- **One-off scripts** (`scripts/*.ts`): one happy-path smoke is enough if the script is run-on-demand only.

## 13. References

- `docs/specs/2026-04-23-hulubul-frontend-design.md` — overall architecture.
- `design/epic-signup/login.md` §5 STORY 7 — auth epic test plan.
- `design/epic-signup/remember-me.md` §6 STORY 6 — remember-me test plan.
- `CLAUDE.md` — Meaningfy coding guidelines that inform the "no test = no code" stance.
- Kent C. Dodds, *Testing Trophy* — the source of "component tests as a first-class layer" thinking adapted here.
- testing-library.com/docs/guiding-principles — why we query by role, not by class.

---

*This document is the source of truth for testing decisions in this repo. PRs that contradict it must either update this document in the same PR or carry a brief rationale in the PR description.*

