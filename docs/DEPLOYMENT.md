# Deployment

**Not Vercel** — despite what this repo's own README currently says under
"Live deployments" (stale; see the note at the bottom of this file). The
actual, currently-wired path is a self-hosted Docker deploy to a Hetzner VM,
orchestrated by a separate ops repo.

## The pipeline, end to end

1. **Push (or merge a PR) to `main`** on `hulubul-front`.
2. GitHub Actions runs `.github/workflows/ci.yml`:
   - Job `quality`: `npm run typecheck`, `npm run lint`, `npm run check:deps`
     (dependency-cruiser architecture check), `npm test`.
   - Job `trigger-staging-deploy` (only runs on a **push** to `main`, not on
     PRs, and only when `github.repository_owner == 'meaningfy-ws'`; depends
     on `quality` passing first): fires a cross-repo `workflow_dispatch` POST
     to `meaningfy-ws/infrastructure-stacks`'s `deploy-hulubul.yml` workflow,
     passing `{"repo": "<this repo>", "sha": "<the pushed commit>"}` as
     inputs. Auth is `secrets.CI_GH_TOKEN` (an org-level PAT).
3. **`infrastructure-stacks`** (separate repo, not cloned in this workspace)
   receives the dispatch and does the actual deploy — presumably: `docker
   build` this repo's `Dockerfile` at the given sha, then restart the
   container(s) on the Hetzner VM (`10.0.1.60`, per the backend repo's
   README). This repo has no visibility into that workflow's exact steps —
   treat `infrastructure-stacks` as the source of truth if you need to change
   deploy behavior itself (build args, restart strategy, etc.).

**There is no separate manual step from this repo.** Pushing to `main` (after
CI's `quality` job passes) is the entire trigger — no `vercel --prod`, no
manual SSH, no clicking "Deploy" anywhere in this repo's own tooling.

## What actually ships

`Dockerfile` is a 3-stage build (deps → builder → standalone runner,
`node:22-alpine`, non-root `nextjs` user, healthcheck on `:3000`). Build-time
`ARG`s baked into the client bundle at `npm run build` (Next.js inlines
`NEXT_PUBLIC_*` vars at build time — runtime env is too late for these):

| ARG | Purpose |
|---|---|
| `NEXT_PUBLIC_STRAPI_URL` | Strapi base URL (client bundle + ISR fetches) |
| `NEXT_PUBLIC_GA_ID` | GA4 measurement ID (unset → no tracker loads) |
| `NEXT_PUBLIC_SITE_URL` | Canonical URLs, sitemap, OG images |
| `NEXT_PUBLIC_AUTH_ENABLED` | Feature flag for the Zitadel auth buttons |
| `BUILD_SHA` | Inlined into the footer as a deployed-commit signature |
| `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` | Search-console meta tags |

`STRAPI_API_TOKEN` is **runtime-only** (server-side route handlers), not a
build arg — it must never end up in the client bundle.

Whoever owns `infrastructure-stacks`'s `deploy-hulubul.yml` is responsible for
forwarding these as `--build-arg`s from GitHub secrets / the ops repo's own
config — this repo's CI does not pass them itself, it only dispatches the
trigger.

## "Staging" vs "production"

The GitHub Actions job is literally named `trigger-staging-deploy`, and the
backend repo's own README table labels both the Strapi admin and the frontend
as **Tier: Staging** on that same Hetzner VM. As of this writing there is no
visible separate "production" pipeline distinct from this one — what's
labeled "staging" in the infra tooling is, in practice, the environment
serving the live site. If a genuinely separate production environment gets
stood up later, update this doc (and probably rename the CI job).

## Environments this repo itself doesn't manage

- **Backend (Strapi)**: deployed independently from
  `meaningfy-ws/strapi-cloud-template-blog-18c70c3ea8` — see that repo's own
  `docs/DEPLOY-RUNBOOK.md` for its deploy/permission-grant steps. A frontend
  push does **not** deploy the backend and vice versa.
- **Local dev**: `npm run dev`, reads `.env.local` (copy `.env.example`).
  Talking to the real backend requires a real `STRAPI_API_TOKEN` — see
  `design/spec-survey-sender-v2-backend.md` for how that collection's token
  permission works.

## Stale docs, corrected

This repo's `README.md` still has a "Live deployments" table saying
`Frontend | Vercel (free tier)` and a `## Deployment` section with a Vercel
subsection — both stale, contradicted by the actual `ci.yml` above. Fixed
alongside this doc; if you find another Vercel reference, it's leftover from
an earlier phase of the project, not the current path.
