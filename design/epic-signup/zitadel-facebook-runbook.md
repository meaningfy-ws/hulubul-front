# Zitadel + Facebook (and Instagram) setup runbook (Stage 2)

> **Status:** Operational runbook. Run after `zitadel-google-runbook.md`; reuses the same Zitadel tenant and `hulubul-web` application created there.
> **Owner:** anyone adding a Meta-owned IdP for `hulubul-front`.
> **Outcome:** a populated `ZITADEL_IDP_FACEBOOK` (and optionally `ZITADEL_IDP_INSTAGRAM`) — verified end-to-end by browser before any application code path changes. Stage 2 is **config + UI only** (per `02-facebook-tiktok.md` §2.1); zero new code is required if Stage 1 was implemented correctly.

## 0. Scope of this runbook

This document covers **two distinct Meta OAuth products**:

| Product | What it authenticates | Maps to | Result for the user |
|---|---|---|---|
| **Facebook Login** | The visitor's Facebook account (also covers Messenger users with a linked FB account, which is virtually all of them) | `PROVIDER_FACEBOOK` → `ZITADEL_IDP_FACEBOOK` | One "Continuă cu Facebook" button. |
| **Instagram Login** (optional) | An Instagram account that is **not** linked to Facebook (e.g. Gen-Z users who only ever signed up with Instagram) | `PROVIDER_INSTAGRAM` (new constant) → `ZITADEL_IDP_INSTAGRAM` (new env var) | A separate "Continuă cu Instagram" button. |

Why two buttons even though both are Meta?

- A user with a Facebook account that *also* uses Instagram can sign in with Facebook Login; the same identity covers both. No second button needed for them.
- A user who **only** has an Instagram account (no FB profile) can only sign in via Instagram Login.
- Zitadel treats them as **distinct upstream IdPs**. With **Account linking allowed** turned on (§3 step 6 below), Zitadel auto-merges the two into the same Zitadel user *when the email matches and is verified by both sides* — so the visitor ends up with one Hulubul identity even if they used different buttons at different times.

**Strict Stage-2 scope** (per `02-facebook-tiktok.md`): only Facebook is in the plan. Adding Instagram is a follow-on; this runbook describes it for future operators so the architecture is clear. The frontend changes for Instagram are listed in §6 below — they mirror the Stage-2 Facebook track precisely (config + UI only).

## 1. Prerequisites

- Stage 1 is **deployed and operational** (Google button works end-to-end on production).
- You have admin access to the Zitadel tenant used by Stage 1.
- You have admin access to `https://developers.facebook.com` (use a personal Facebook account that owns or is admin of a Business account — recommended).
- A Stage-1 `.env.local` already populated; we'll only add `ZITADEL_IDP_FACEBOOK` (and optionally `ZITADEL_IDP_INSTAGRAM`).
- About 30 minutes for Facebook; +15 minutes for Instagram if you do both.

> **Privacy.** Meta requires a privacy policy URL and a public app icon before the app can leave **Development** mode and accept users outside your test list. Have https://hulubul.com/confidentialitate and a 1024×1024 PNG ready.

## 2. Meta — create the Facebook app

Meta apps are the umbrella under which both Facebook Login and Instagram Login are configured. One Meta app can host both products.

1. Sign in to https://developers.facebook.com.
2. Top right → **My Apps** → **Create App**.
3. **App type:** **Consumer**. (Business is for B2B integrations like WhatsApp / Marketing API; Consumer is the right fit for user sign-in.)
4. **App details:**
   - **App name:** `Hulubul`
   - **App contact email:** the same address used for the Google Cloud project.
   - **Business portfolio:** create one if prompted (`Meaningfy` is fine); not load-bearing here.
5. Create the app. You'll land on the **App Dashboard**.

### 2.1 Note the credentials

Left rail → **App settings → Basic**:

- **App ID** — numeric, e.g. `1234567890123456`. Public, but treat as config.
- **App Secret** — click "Show", authenticate, copy. **Treat as a secret.** This goes into Zitadel, never into the Hulubul `.env`.

Also on this page:

- **Display name:** `Hulubul`
- **App domains:** `hulubul.com` (and `localhost` while you're testing locally — Meta lets you add multiple).
- **Privacy Policy URL:** `https://hulubul.com/confidentialitate`
- **Category:** `Business and Pages` (or whichever best fits; not load-bearing).
- **App icon:** upload the 1024×1024 PNG.
- Save changes (button at the bottom).

## 3. Meta — add **Facebook Login** product

1. Left rail → **+ Add Product**.
2. Find **Facebook Login** → **Set up**. (Pick the "Web" platform if it asks; you can skip the wizard's "QuickStart" steps — we don't need them.)
3. Now in the left rail under **Facebook Login**, click **Settings**.
4. **Client OAuth Login:** **Yes**
5. **Web OAuth Login:** **Yes**
6. **Enforce HTTPS:** **Yes** (production); leave **Use Strict Mode for Redirect URIs:** **Yes**.
7. **Valid OAuth Redirect URIs** — this is the *Zitadel* IdP callback (same shape as Google in `zitadel-google-runbook.md` §3 step 18). Add **both**:

   - `https://<tenant>.zitadel.cloud/idps/callback` (Login UI v2 — current `eu1` default)
   - `https://<tenant>.zitadel.cloud/ui/login/login/externalidp/callback` (Login UI v1 — legacy fallback)

   You can find the exact value to use by creating the Zitadel IdP first (§4 below) and reading its **Callback URL** field, then come back here. Registering both is safer than guessing.

8. **Allowed Domains for the JavaScript SDK:** leave empty — we don't use the JS SDK.
9. **Login from Devices:** **No**.
10. **Save changes.**

> **Note on App Review.** Until your Meta app is in **Live** mode (toggle at the very top of the dashboard), only **App roles** members (admin/developer/tester) can sign in. To go Live: add a Privacy URL (already done), confirm contact email, and toggle the slider at the top. **Live mode does not require formal App Review** for the `email` + `public_profile` scopes we use — those are *Standard Access* permissions, granted by default.

## 4. Zitadel — add Facebook as an upstream IdP

In the Zitadel console, **at the Org level** (not project level — IdPs are tenant-wide):

1. Left rail → **Default Settings** → **Identity Providers** → **+ New**.
2. Pick **Facebook** from the list. (If your Zitadel version doesn't show Facebook as a built-in IdP, use **Generic OIDC** with the Facebook OIDC endpoints — but the built-in option is preferred when present because it knows Meta's quirks around `email` scope.)
3. **Name:** `Facebook` (this is the human-facing label on Zitadel's picker — but visitors won't see the picker because we use `idp_hint`).
4. **Client ID** / **Client Secret:** paste the **App ID** and **App Secret** from §2.1.
5. **Scopes:** `email`, `public_profile`. (Do **not** add `user_birthday` or anything from the Restricted Access list — that triggers App Review and we don't need it for prefill.)
6. **Options:**
   - **Account creation allowed:** ON
   - **Account linking allowed:** ON ← this is what auto-merges a Facebook sign-in with an existing Google-signed-in user when emails match
   - **Auto creation:** ON
   - **Auto update:** ON
7. Save.
8. **Note the IdP ID** shown on the IdP detail page — looks like `374510689814852766`. This is what goes into `ZITADEL_IDP_FACEBOOK`.
9. **Activate Facebook for the Login Policy:**
   - Default Settings → **Login Policy** → **Identity Providers** sub-tab.
   - Add `Facebook` to the list. Save.

> **Confirm the redirect URI.** On the Facebook IdP detail page in Zitadel, copy the **Callback URL** value verbatim. If it differs from what you put in Meta in §3 step 7, update Meta to match. This is the #1 cause of `URL Blocked: This redirect failed because the redirect URI is not whitelisted` errors.

## 5. Update `.env` files

Add to `.env.example` (commit-safe — already there from Stage 1 as an empty placeholder, no change needed) and to `.env.local` / cloud env:

```dotenv
ZITADEL_IDP_FACEBOOK=374510689814852766   # from §4 step 8
```

## 6. (Optional) Instagram Login as a separate IdP

Skip this section if you only want one Meta button.

Instagram Login authenticates via an **Instagram account that may not have a linked Facebook profile** — useful for Gen-Z users. As of 2026, the Instagram Basic Display API is **retired**; the supported approach is **Instagram Login with the Instagram API**.

### 6.1 Meta — add **Instagram Login** product

1. From the same Meta app (§2), left rail → **+ Add Product** → **Instagram** → set up "Instagram Login" (not "Instagram Graph API for Business").
2. Under **Instagram → Settings**:
   - **Valid OAuth Redirect URIs:** same Zitadel callback as Facebook (§3 step 7). Both URI shapes.
   - **Deauthorize Callback URL** and **Data Deletion Request URL:** leave empty for Stage-2 prefill scope. Add them later if you ever need to comply with proactive data-removal flows.
3. Save changes.
4. Use the **same App ID + App Secret** from §2.1 — Meta scopes credentials at the app level.

### 6.2 Zitadel — add Instagram as a Generic OIDC IdP

Zitadel doesn't (yet) ship a built-in Instagram template. Use Generic OIDC:

1. Default Settings → Identity Providers → + New → **Generic OIDC**.
2. **Name:** `Instagram`
3. **Issuer:** `https://api.instagram.com` (this is the OAuth endpoint base; Instagram does not advertise a `.well-known/openid-configuration` document — you'll fill in the discovery fields manually below)
4. **Authorization endpoint:** `https://api.instagram.com/oauth/authorize`
5. **Token endpoint:** `https://api.instagram.com/oauth/access_token`
6. **Userinfo endpoint:** `https://graph.instagram.com/me?fields=id,username,name,email`
7. **Scopes:** `user_profile,user_media` (Instagram's scope syntax is comma-separated, not space-separated).
8. **Client ID / Secret:** the same App ID and App Secret from §2.1.
9. **Options:** same as Facebook (§4 step 6) — Account linking ON, Auto creation ON.
10. Save. Note the IdP ID → goes into `ZITADEL_IDP_INSTAGRAM`.
11. Activate in Login Policy as in §4 step 9.

> **Email caveat.** Instagram does **not** return an email claim by default. Visitors signing in with Instagram will get a *partial* prefill: name only. The signup form's email field will remain empty for them to type. If this is unacceptable, gate Instagram behind a "prefill is just name" UX banner — but that's a Stage-3 decision.

### 6.3 Frontend changes for Instagram (Stage 2.5 scope, not Stage 2)

To expose Instagram as its own button, the **only** code changes needed are:

- `lib/auth-providers.ts`: add `PROVIDER_INSTAGRAM = "instagram" as const` and include it in `AUTH_PROVIDERS`.
- `lib/auth-env.ts`: add `[PROVIDER_INSTAGRAM]: "ZITADEL_IDP_INSTAGRAM"` to `PROVIDER_ENV_KEY`.
- `lib/auth-copy.ts`: add `instagram: "Continuă cu Instagram"` (etc.) to the `AUTH_COPY` literal.
- `components/landing/AuthButtons.tsx`: add an Instagram SVG glyph branch in `ProviderGlyph`.
- `tests/components/AuthButtons.test.tsx`: extend the parametrised tests with Instagram cases.

No route handler, no `lib/zitadel.ts`, no cookie code changes. (If you find yourself editing those, stop — the Stage-1 architecture is wrong, see `02-facebook-tiktok.md` §1.)

## 7. Verify before any application code change

Three browser checks confirm the Meta side is healthy. Run them after §5 (and §6 if you added Instagram).

### 7.1 Manual Facebook round-trip

Open in a browser:

```
https://<tenant>.zitadel.cloud/oauth/v2/authorize?client_id=<ZITADEL_CLIENT_ID>&response_type=code&scope=openid%20email%20profile&redirect_uri=http://localhost:3000/api/auth/callback&state=test&nonce=test&idp_hint=<FACEBOOK_IDP_ID>
```

Expected: straight to Facebook's "Continue as <name>" screen (not Zitadel's picker — if you see the picker, `idp_hint` isn't being honoured: re-check the IdP ID and that Facebook is enabled in the Login Policy). Approve → redirected to `http://localhost:3000/api/auth/callback?code=...&state=test`. Your local dev server doesn't need to be running — seeing the URL with `code=...` in your address bar is proof the round-trip works.

### 7.2 Email returned in claims

A common Meta pitfall: Facebook only returns `email` if the user has a confirmed email on their Facebook account **and** approves the email scope. Quick sanity check with a sign-in via the app once Stage-2 code is deployed: the structured log should show `auth.callback.success.no_email` (per `04-user-error-bubble.md`) for accounts where Meta withheld the email. Mitigation is product copy, not code.

### 7.3 (Optional) Manual Instagram round-trip

Same URL as §7.1 but with `idp_hint=<INSTAGRAM_IDP_ID>`. Expected: Instagram's authorize screen → approve → callback URL. Note that the prefill will lack email; that's expected (see §6.2 note).

## 8. Troubleshooting cheat-sheet

| Symptom | Most common cause |
|---|---|
| `URL Blocked: This redirect failed because the redirect URI is not whitelisted` | Zitadel's actual callback URL isn't in Meta's **Valid OAuth Redirect URIs** list. Copy the URL from the Zitadel IdP detail page → paste into Meta → Save. Same fix as Stage 1's Google `redirect_uri_mismatch`. Don't forget to register **both** Login UI v1 and v2 callback shapes. |
| Zitadel picker appears instead of going straight to Facebook | `idp_hint` missing or the IdP ID is wrong. Verify by reading the authorize URL. |
| Facebook returns an empty `email` claim | The user's FB account either has no confirmed email, or they un-ticked the email permission on consent. Not a code bug. Surface gracefully via the no-email branch (existing in callback). |
| `Can't load URL: The domain of this URL isn't included in the app's domains` | Add the relevant domain (e.g. `hulubul.com`, `localhost`) to **App Settings → Basic → App Domains** in Meta. |
| Login works for you but no one else | The Meta app is still in **Development** mode. Top of dashboard → flip to **Live**. (Only needs Privacy URL + contact email + icon; no formal App Review for `email`/`public_profile`.) |
| Instagram returns `name` but not `email` | Expected. See §6.2. Stage-2 callback already handles this — the prefill cookie is written with `email=""` and the form remains editable. |
| Browser shows "App not setup: This app is still in development mode" | Same as above; flip to Live, or add the failing user under App Roles → Testers. |

## 9. What happens next

When §7.1 (and §7.3 if you set up Instagram) succeeds:

1. Tell the implementer that `ZITADEL_IDP_FACEBOOK` is ready and they can deploy.
2. Re-trigger the deploy workflow. The Facebook button auto-appears (per the Option-C architecture: `getEnabledAuthProviders()` reads the new runtime env at request time).
3. Smoke-test the live `https://hulubul.com/#signup` — both Google and Facebook buttons should render; both should complete a full prefill round-trip.

This runbook is referenced from:

- `02-facebook-tiktok.md` — Stage 2 spec
- `02-facebook-tiktok-plan.md` — implementation plan
- `zitadel-google-runbook.md` — sibling runbook (Stage 1)
- `zitadel-tiktok-runbook.md` — sibling runbook (Stage 2, TikTok track)
