# Zitadel + Google setup runbook (Stage 1)

> **Status:** Operational runbook. Run this once per Zitadel tenant.
> **Owner:** anyone setting up auth for `hulubul-front`.
> **Outcome:** a configured Zitadel project + Google OAuth credentials + a populated `.env.local` and committable `.env.example`, all verified end-to-end by `curl` before any application code exists.

## 0. Prerequisites

- A Zitadel Cloud tenant (provisioned but not configured). You should be able to log in at `https://<tenant>.zitadel.cloud/ui/console` as an admin.
- A Google account with access to **Google Cloud Console** (`console.cloud.google.com`).
- About 30 minutes of focused clicking.

> **Naming.** Use exact names below. They're referenced from the specs; deviating creates noise later.

## 1. Zitadel — create the project

1. Sign in to your Zitadel console.
2. **Default organisation** is fine. (Confirm it exists in the left rail; the free tier gives one.)
3. Top nav → **Projects** → **+ New**.
4. **Name:** `hulubul`. Save.
5. On the project page, scroll to **General settings**. Toggle **"Assert Roles on Authentication"** to **OFF** for now (we'll switch this on in Stage 3 when RBAC matters). Leave other toggles at defaults.

> **Why turn role-assertion off?** In Stage 1 we don't read roles. Asserting them puts a `urn:zitadel:iam:org:project:roles` claim into the ID token even when empty; that's noise we don't need yet. We'll turn it on in Stage 3 alongside the role definitions.

## 2. Zitadel — create the application

Inside the `hulubul` project:

1. **Applications** tab → **+ New**.
2. **Name:** `hulubul-web`.
3. **Type:** select **Web** (NOT "User Agent" / SPA — we run server-side in Next.js).
4. Click **Continue**.
5. **Authentication method:** select **Code** (the OIDC Authorization Code flow). PKCE is implicit at this layer; we add it on the client side via `openid-client`. **Do not pick "PKCE" by itself** — that radio is for *public* clients (no secret); we are a confidential client.
6. Click **Continue**.
7. **Redirect URIs** — add both, exactly:
   - `http://localhost:3000/api/auth/callback`
   - `https://hulubul.com/api/auth/callback`

   (Use your stable cloud-deploy URL; if your prod domain isn't `hulubul.com`, substitute it. **Only these two URIs. No wildcards.**)
8. **Post-logout redirect URIs** — leave empty for Stage 1 (no logout flow yet). We'll add `https://hulubul.com/` in Stage 3.
9. Click **Continue** → **Create**.
10. On the success screen, **Zitadel shows the client secret exactly once.** Copy it. Store it in your password manager — Zitadel will let you regenerate but not re-display.
11. Now click into the application → **Token Settings** sub-tab:
    - **Access token type:** **JWT** (not opaque). Save.
    - **Auth token role assertion:** OFF (Stage 1, same reason as project setting).
    - **ID token role assertion:** OFF (Stage 1).
    - **ID token userinfo assertion:** **ON** — embeds `given_name`, `family_name`, `email`, `picture` into the ID token, saving one HTTP round-trip to `/userinfo`.
    - **Clock skew:** **2 seconds** is fine. (We'll match this on our side.)
    - Save.

At this point you have:

- **Client ID** — visible on the application's overview tab. **Format varies by Zitadel version**: some tenants show `<numeric>@<projectname>` (e.g. `293384789343518755@hulubul`), others show **bare numeric** (e.g. `369906456570430286`). Use whatever the application's overview tab shows verbatim. If the `client_credentials`-style verification (§7b) is not feasible for your application type (see note in §7), validate the client_id by hitting the authorize endpoint in §7c — a `HTTP 302` redirect to the login UI proves the client is recognised; an `invalid_client` error in the redirect URL means the format is wrong.
- **Client secret** — what you copied at step 10.
- **Issuer URL** — `https://<tenant>.zitadel.cloud` (no path, no trailing slash). Confirm by visiting `https://<tenant>.zitadel.cloud/.well-known/openid-configuration` in a browser — you should see JSON.

## 3. Google Cloud Console — create OAuth credentials

1. Go to `https://console.cloud.google.com`.
2. Top bar → **Select a project** → **New Project**. **Name:** `hulubul-auth`. Create.
3. Wait ~30 seconds for it to provision, then **switch to it** (top bar).
4. Left rail → **APIs & Services** → **OAuth consent screen**.
5. **User type:** **External**. Create.
6. App information:
   - **App name:** `Hulubul`
   - **User support email:** your email
   - **App logo:** optional (skip for now; can add later when ready to publish)
7. **App domain** section — leave blank for now (only required when going from Testing → Production).
8. **Authorised domains** — add `zitadel.cloud` (Google redirects to Zitadel during the upstream OAuth dance — Zitadel is the OAuth client from Google's perspective).
9. **Developer contact information:** your email.
10. Continue. **Scopes:** add `.../auth/userinfo.email`, `.../auth/userinfo.profile`, and `openid`. (Click "Add or remove scopes", filter for those three, tick them, update.)
11. **Test users:** add your own Google email and 1–2 testers. (While the app is in *Testing* status, **only** these accounts can sign in. We'll publish to Production once Stage 1 is verified.)
12. Save.

Now the credentials:

13. Left rail → **APIs & Services** → **Credentials**.
14. **+ Create credentials** → **OAuth client ID**.
15. **Application type:** **Web application**.
16. **Name:** `hulubul-zitadel-broker`.
17. **Authorised JavaScript origins:** leave blank.
18. **Authorised redirect URIs:** add **one** — `https://<your-tenant>.zitadel.cloud/ui/login/login/externalidp/callback`. (Zitadel's callback when *it* is the OAuth client against Google. Confirm the exact path on your Zitadel tenant — it's printed by Zitadel in §4 below.)
19. Create. **Copy the Client ID and Client Secret shown** — these go into **Zitadel**, not into your app's `.env`.

## 4. Zitadel — add Google as an upstream Identity Provider

Back in Zitadel console:

1. Left rail (org level, not project): **Default Settings** → **Identity Providers** → **+ New**.
2. Pick **Google** from the list.
3. **Name:** `Google` (human-facing label; users will see it on Zitadel's picker if they ever land there — but they won't, because we'll use `idp_hint`).
4. **Client ID** / **Client Secret:** paste the values from step 3.19.
5. **Scopes:** `openid`, `profile`, `email` (defaults).
6. **Options:**
   - **Account creation allowed:** ON
   - **Account linking allowed:** ON (controls what happens if a user later signs in via a different upstream IdP with the same verified email)
   - **Auto creation:** ON (creates the Zitadel user automatically on first sign-in — this is the "registration for free" property)
   - **Auto update:** ON (keeps email/name fresh from Google)
7. Save.
8. Note the **IdP ID** shown on the IdP detail page — looks like `293384789343518756`. This goes into `ZITADEL_IDP_GOOGLE` so we can pass `idp_hint=<id>` and skip Zitadel's picker.
9. Activate Google for the **Login Policy**:
   - Default Settings → **Login Policy** → **Identity Providers** sub-tab.
   - Add `Google` to the list. Save.

> **Verify step 3.18.** Once the IdP exists in Zitadel, its detail page typically shows the *exact* redirect URI Google should send users back to. If it differs from what you put in Google Cloud step 3.18, update Google Cloud → Credentials → your OAuth client → Authorized redirect URIs to match. This is the #1 source of `Error 400: redirect_uri_mismatch` on first try.

## 5. Generate the cookie signing secret

On your laptop:

```bash
openssl rand -base64 32
```

Copy the output. This becomes `AUTH_COOKIE_SECRET`. Generate a **different** value for `.env.local` and for production.

## 6. Final `.env.example` and `.env.local` shape

Add this block to **both** files. The example file commits to git; the local file does not.

**`.env.example`** (commit-safe, placeholders only):

```dotenv
# ─── Zitadel OIDC (Stage 1 — Google prefill via Zitadel broker) ────────
# Tenant base URL, no path, no trailing slash.
# Get from Zitadel console → Settings (or inspect your console URL).
ZITADEL_ISSUER=

# Application credentials from Zitadel → Projects → hulubul → Applications → hulubul-web.
# Client secret is only shown once at creation — store in a password manager.
ZITADEL_CLIENT_ID=
ZITADEL_CLIENT_SECRET=

# Upstream IdP IDs (numeric strings) from Zitadel → Default Settings → Identity Providers.
# Used as `idp_hint` to skip Zitadel's picker. Leave Facebook blank for Stage 1.
ZITADEL_IDP_GOOGLE=
ZITADEL_IDP_FACEBOOK=

# Where Zitadel sends users back to. Must EXACTLY match a registered redirect URI.
# Dev:  http://localhost:3000/api/auth/callback
# Prod: https://hulubul.com/api/auth/callback
AUTH_REDIRECT_URI=

# HMAC secret for the short-lived prefill cookie (~10 min lifetime).
# Generate with: openssl rand -base64 32
# MUST be different per environment.
AUTH_COOKIE_SECRET=

# Master switch — when "false" or unset, the Google/Facebook buttons are not rendered
# and the auth routes return 404. Use this in preview environments or to kill-switch.
NEXT_PUBLIC_AUTH_ENABLED=
```

**`.env.local`** (your real values, never committed — already in `.gitignore`):

```dotenv
ZITADEL_ISSUER=https://<your-tenant>.zitadel.cloud
ZITADEL_CLIENT_ID=293384789343518755@hulubul
ZITADEL_CLIENT_SECRET=<paste from Zitadel step 2.10>
ZITADEL_IDP_GOOGLE=293384789343518756
ZITADEL_IDP_FACEBOOK=
AUTH_REDIRECT_URI=http://localhost:3000/api/auth/callback
AUTH_COOKIE_SECRET=<paste from `openssl rand -base64 32`>
NEXT_PUBLIC_AUTH_ENABLED=true
```

For your cloud-deploy environment file: same keys, with `AUTH_REDIRECT_URI=https://hulubul.com/api/auth/callback`, a *different* `AUTH_COOKIE_SECRET`, and `NEXT_PUBLIC_AUTH_ENABLED=true`.

> **Why `NEXT_PUBLIC_AUTH_ENABLED` is `NEXT_PUBLIC_`:** the button-render check happens client-side. The *behaviour* (auth routes 404 when disabled) is server-side and reads the same value via `process.env`. Two checks, one source of truth.

## 7. Verify the setup before any code is written

These four checks confirm Zitadel is correctly configured. Run them after step 6.

### (a) Discovery document is reachable

```bash
curl -s "$ZITADEL_ISSUER/.well-known/openid-configuration" | jq '.issuer, .authorization_endpoint, .token_endpoint, .jwks_uri'
```

Expect four URLs, the first being `ZITADEL_ISSUER`. If you get HTML or a 404, the issuer URL is wrong.

### (b) Client credentials are accepted — ⚠️ Web-app caveat

```bash
curl -s -u "$ZITADEL_CLIENT_ID:$ZITADEL_CLIENT_SECRET" \
  -X POST "$ZITADEL_ISSUER/oauth/v2/token" \
  -d "grant_type=client_credentials&scope=openid"
```

**This check only works for "API"-type applications.** Our `hulubu0-app` is a **Web** application (Authorization Code + PKCE), and Zitadel does not allow `client_credentials` for Web apps — the response will be `{"error":"invalid_client","error_description":"client not found"}` even when your credentials are perfectly correct. That is **expected**, not a failure. Skip this check and rely on §7c instead.

A separate `HTTP 302` probe of the authorize endpoint is a better lightweight check that the client is recognised:

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" \
  "$ZITADEL_ISSUER/oauth/v2/authorize?client_id=$ZITADEL_CLIENT_ID&response_type=code&scope=openid&redirect_uri=$AUTH_REDIRECT_URI&state=probe&nonce=probe&idp_hint=$ZITADEL_IDP_GOOGLE"
```

`HTTP 302` = client recognised (proceeds to login). Anything else = client_id wrong.

### (c) Manual end-to-end Google round-trip (no app code yet)

Construct this URL by hand (one line, no spaces — replace the placeholders):

```
https://<tenant>.zitadel.cloud/oauth/v2/authorize?client_id=<CLIENT_ID>&response_type=code&scope=openid%20email%20profile&redirect_uri=http://localhost:3000/api/auth/callback&state=test&nonce=test&idp_hint=<GOOGLE_IDP_ID>
```

Paste into a browser. You should be redirected **straight to Google's consent screen** (not Zitadel's picker — if you see the picker, `idp_hint` isn't being honoured; double-check the IdP ID and that the IdP is enabled in Login Policy). After consenting, you'll land on `http://localhost:3000/api/auth/callback?code=…&state=test`. Your local dev server isn't running, so you'll see a "Cannot GET" / refused-connection — **that's the expected outcome at this stage.** The browser address bar shows `code=...&state=test`, which proves the round-trip works.

### (d) JWKS is fetchable

```bash
curl -s "$ZITADEL_ISSUER/oauth/v2/keys" | jq '.keys | length'
```

Expect a number ≥ 1. This is what `openid-client` will fetch to verify ID-token signatures.

## 8. Troubleshooting cheat-sheet

| Symptom | Most common cause |
|---|---|
| `redirect_uri_mismatch` from Google | URI in Google Cloud Credentials doesn't match the one Zitadel prints on its IdP page. They must be **byte-identical**. |
| `redirect_uri_mismatch` from Zitadel | The `AUTH_REDIRECT_URI` in your `.env.local` doesn't match a URI in the Zitadel application's Redirect URIs list. Case-sensitive, trailing-slash sensitive. |
| Zitadel picker appears instead of going to Google | `idp_hint` missing or the IdP ID is wrong. Verify by inspecting the authorize URL. |
| `invalid_client` from `/oauth/v2/token` | Client secret was regenerated since you copied it, or you have an old value cached. |
| Browser redirected to Google, then back to Zitadel with "user denied" or generic error | The Google project is still in *Testing* status and you're signing in with an account that's not on the test-users list. Add the email, or publish the OAuth consent screen to Production. |
| JWKS has 0 keys | Tenant misconfigured — open a Zitadel support ticket. |
| Browser shows "API endpoint does not exist" after the Google redirect chain | Application is configured to use Zitadel **Login UI v2**, which may not be provisioned on Cloud free-tier tenants. Switch the application's **Login Version** to **v1** in the application's General settings (location varies by Zitadel version). Probe with `curl -sS -o /dev/null -w "%{http_code}\n" "$ZITADEL_ISSUER/ui/login/login"` — v1 returns `302`, v2 returns `400` on tenants where v2 is not live. |
| `invalid_client / client not found` from `/oauth/v2/token` with `client_credentials` grant | **Expected for Web applications.** See §7(b) caveat. Not a real failure. |

---

## 9. What happens next

When all four verification checks pass:

1. Commit `.env.example` (with the empty-value block above). Do **not** commit `.env.local`.
2. Tell the implementer (or your future self) that the Zitadel side is ready.
3. The implementer reads `design/epic-signup/01-google-prefill.md` and follows its TDD plan.

This runbook is referenced from:

- `design/epic-signup/00-architecture.md` — for the broader architectural context.
- `design/epic-signup/01-google-prefill.md` — for the Stage 1 implementation.
- Future Stage 2 will extend §4 with Facebook (and possibly TikTok) IdP entries.
- Future Stage 3 will add post-logout redirect URIs and turn on role assertion.
