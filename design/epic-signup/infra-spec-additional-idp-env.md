# Infra spec — wire additional Zitadel IdP env vars

> **For:** `meaningfy-ws/infrastructure-stacks` (Hulubul stack).
> **Why:** the frontend already enables a provider button at runtime when its `ZITADEL_IDP_<X>` env var is non-empty (`getEnabledAuthProviders` in `lib/auth-env.ts`). Google + Facebook are already wired; adding Instagram or TikTok needs only env passthrough on the infra side.
> **Status:** pending — apply when product wants Instagram / TikTok buttons live.

## Scope

Two new env vars to forward from a GitHub secret all the way into the running `hulubul-frontend` container:

| Var | Used by | When |
|---|---|---|
| `ZITADEL_IDP_INSTAGRAM` | frontend (runtime) | when product wants the Instagram button |
| `ZITADEL_IDP_TIKTOK` | frontend (runtime) | when TikTok spike returns GO or CONDITIONAL |

Both are **runtime env only** (not build args). The frontend reads them per request via the dynamic Signup adapter — no `next build`-time inlining needed.

## Required changes

### 1. `hulubul/docker-compose.yml`

Add to the **`frontend` service `environment:` block** (alongside the existing `ZITADEL_IDP_GOOGLE` / `ZITADEL_IDP_FACEBOOK`):

```yaml
ZITADEL_IDP_INSTAGRAM: ${ZITADEL_IDP_INSTAGRAM:-}
ZITADEL_IDP_TIKTOK:    ${ZITADEL_IDP_TIKTOK:-}
```

Default `:-` makes them optional — absent secret = empty value = button stays hidden. Safe to add even before the secrets exist.

### 2. `.github/workflows/deploy-hulubul.yml`

In the **`Create .env on VM`** step, alongside the existing `set_var ZITADEL_IDP_FACEBOOK …` line, add:

```bash
set_var ZITADEL_IDP_INSTAGRAM "${{ secrets.ZITADEL_IDP_INSTAGRAM }}"
set_var ZITADEL_IDP_TIKTOK    "${{ secrets.ZITADEL_IDP_TIKTOK }}"
```

### 3. GitHub repo secrets

Add two new repository secrets (Settings → Secrets and variables → Actions):

- `ZITADEL_IDP_INSTAGRAM` — numeric IdP id from Zitadel (created per `design/epic-signup/zitadel-facebook-runbook.md` §6.2)
- `ZITADEL_IDP_TIKTOK` — numeric IdP id from Zitadel (created per `design/epic-signup/zitadel-tiktok-runbook.md` §3)

Either can be left **unset**; the corresponding button just won't render.

## Deploy + verify

1. Merge the compose + workflow changes to `infrastructure-stacks` main.
2. Set whichever secret(s) you have an IdP id for.
3. Manual dispatch **Deploy Hulubul Stack**.
4. Verify on `https://hulubul.com/`:
   ```bash
   curl -s https://hulubul.com/ | grep -oE 'auth-button--[a-z]+' | sort -u
   ```
   Expected: one line per enabled provider — `auth-button--google`, `auth-button--facebook`, and now `auth-button--instagram` / `auth-button--tiktok` as applicable.

## Out of scope

- **Frontend code** to render Instagram / TikTok buttons (constants, SVG glyphs, copy keys). TikTok constants already exist in `lib/auth-providers.ts`; Instagram requires a follow-on frontend PR per `zitadel-facebook-runbook.md` §6.3.
- **Zitadel + Meta / TikTok provider setup.** Operators follow the two existing runbooks (`zitadel-facebook-runbook.md` §6 for Instagram; `zitadel-tiktok-runbook.md` for TikTok).
- **Backend (Strapi) changes** — none. Strapi never sees these env vars (INV-1).

## Effort

~15 minutes once the GitHub secrets are populated. Compose + workflow edits are ~5 lines total.
