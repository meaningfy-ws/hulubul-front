# Zitadel + TikTok setup runbook (Stage 2 — TikTok track)

> **Status:** Operational runbook. **Do not execute until the TikTok feasibility spike (`02-facebook-tiktok-plan.md` Step T0) returns GO or CONDITIONAL.** If the spike returns NO-GO, this runbook is archived without removing it (kept for future re-attempts).
> **Owner:** anyone adding TikTok as a third upstream IdP for `hulubul-front`.
> **Outcome:** a populated `ZITADEL_IDP_TIKTOK` — verified end-to-end by browser. Stage 2's TikTok track is **config + UI only** for the GO branch; the CONDITIONAL branch additionally tweaks the callback's no-email path (the only Stage-2 exception to byte-invariance, see Step T5 in the plan).

## 0. Why this runbook is gated on a spike

Unlike Google and Facebook, TikTok's OIDC behaviour is **not stable enough to bet on without verification**:

1. Zitadel Cloud's free tier may or may not list TikTok as a built-in upstream IdP, depending on plan and tenant version. If absent, you fall back to **Generic OIDC**, which works but means you maintain the endpoint URLs yourself.
2. TikTok Developer account approval can take days to weeks. You may discover this only after committing to the integration.
3. **TikTok historically does not return an `email` claim** on the standard `user.info.basic` scope. The prefill use case is degraded: only `name` (and sometimes `username`) is available. If email is critical to your funnel, ship TikTok with a banner that says "we'll ask for your email after" — not an automatic prefill.

The spike at `design/epic-signup/spike-tiktok.md` (created when the spike runs) records the outcome. **Re-read it before proceeding.** If you can't find it, you haven't done the spike — go back to `02-facebook-tiktok-plan.md` Step T0.

## 1. Prerequisites

- Stage 1 deployed; Stage 2 Facebook track ideally complete too (gives you a known-good two-button baseline to diff against).
- Admin access to https://developers.tiktok.com (sign up with a personal TikTok account; org-level accounts also work but are slower to provision).
- Admin access to the same Zitadel tenant used by Stages 1 and 2.
- About 45 minutes of clicking + however long TikTok takes to approve your app (commonly 1–3 business days).
- A privacy policy at https://hulubul.com/confidentialitate and a 200×200 PNG app icon.

## 2. TikTok Developers — create the app

1. Sign in to https://developers.tiktok.com.
2. Top right → **Manage apps** → **Connect an app**.
3. **App name:** `Hulubul`
4. **Category:** `Lifestyle & Local Services` (or whichever fits — not load-bearing for OAuth).
5. **Description:** one sentence about Hulubul.
6. **Platform:** **Web**
7. **App icon:** upload PNG.
8. **Privacy policy URL:** `https://hulubul.com/confidentialitate`
9. **Terms of service URL:** `https://hulubul.com/termeni`
10. Create the app. You'll land on the app dashboard.

### 2.1 Add **Login Kit** product

1. From the app dashboard → **Add products** → **Login Kit** → **Add**.
2. Inside Login Kit, **Configuration**:
   - **Login methods:** **Web** (NOT mobile)
   - **Redirect URI:** the *Zitadel* callback (same shape as Google/Facebook in their runbooks):
     - `https://<tenant>.zitadel.cloud/idps/callback` (Login UI v2)
     - `https://<tenant>.zitadel.cloud/ui/login/login/externalidp/callback` (Login UI v1)

     TikTok only accepts a single redirect URI per environment historically — pick the one Zitadel's Facebook IdP detail page showed. (If Zitadel changes Login UI version, you'll have to update this manually.)
3. **Scopes:** request `user.info.basic` (always available). If you need email, also request `user.info.email` — **this scope requires App Review approval** and TikTok may refuse depending on your declared use case.
4. Save.

### 2.2 Note the credentials

From the app's **Manage** page:

- **Client key** (TikTok's name for client_id) — copy.
- **Client secret** — click "Show", authenticate, copy. Treat as a secret. This goes into Zitadel.

### 2.3 Submit for review (if you need email)

If your spike outcome is **GO** (email available):

1. App Dashboard → **App review** → submit for `user.info.email`.
2. Provide use case: "Sign-in to a waitlist; email is used to confirm the user's identity at signup."
3. Wait. (Pessimistic: 5 business days. Optimistic: 24 hours.)
4. While waiting, your app stays in **Sandbox** mode — only test users you add via Manage → **Sandbox users** can sign in.

If your spike outcome is **CONDITIONAL** (no email available): skip review for `user.info.email`. The frontend will handle the empty-email case (see Step T5 in the plan).

## 3. Zitadel — add TikTok as an upstream IdP

### 3.1 If Zitadel has a built-in TikTok IdP

1. Zitadel console → **Default Settings** → **Identity Providers** → **+ New**.
2. Pick **TikTok**.
3. Fields are the same as Facebook: Name, Client ID = TikTok Client key, Client Secret = TikTok Client secret, Scopes per spike outcome.
4. Options: Account linking ON, Auto creation ON, Auto update ON.
5. Save; note the IdP ID → `ZITADEL_IDP_TIKTOK`.
6. Activate in Login Policy.

### 3.2 If Zitadel does NOT have a built-in TikTok IdP

Fall back to **Generic OIDC**.

1. Default Settings → Identity Providers → + New → **Generic OIDC**.
2. **Name:** `TikTok`
3. **Issuer:** TikTok doesn't advertise a `.well-known/openid-configuration` — leave issuer pointed at `https://www.tiktok.com` if Zitadel insists; the fields below override discovery.
4. **Authorization endpoint:** `https://www.tiktok.com/v2/auth/authorize`
5. **Token endpoint:** `https://open.tiktokapis.com/v2/oauth/token`
6. **Userinfo endpoint:** `https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,display_name,avatar_url` (add `email` to fields only if review approved).
7. **Scopes:** `user.info.basic` (and `user.info.email` if approved).
8. **Client ID / Secret:** from §2.2.
9. **Token endpoint auth method:** `client_secret_post` (TikTok rejects `client_secret_basic`).
10. **Mapping:** map TikTok's `display_name` to Zitadel's `name`. Map `open_id` to `sub`. (If you have `email`, map it to `email`; otherwise the user record will have no email and account-linking will silently not fire.)
11. Save; note the IdP ID → `ZITADEL_IDP_TIKTOK`.
12. Activate in Login Policy.

## 4. Update `.env` files

```dotenv
ZITADEL_IDP_TIKTOK=499812345678901234   # from §3 step 5 or 11
```

`.env.example` needs a new placeholder line (`ZITADEL_IDP_TIKTOK=`); also extend `tests/lib/env-shape.test.ts` to include the key. These are tiny PR-scoped edits, done in Step T2 of the plan.

## 5. Verify before any application code change

### 5.1 Manual TikTok round-trip

```
https://<tenant>.zitadel.cloud/oauth/v2/authorize?client_id=<ZITADEL_CLIENT_ID>&response_type=code&scope=openid%20email%20profile&redirect_uri=http://localhost:3000/api/auth/callback&state=test&nonce=test&idp_hint=<TIKTOK_IDP_ID>
```

Open in a browser signed into TikTok. Expected: TikTok's consent screen → approve → callback URL with `code=...&state=test`. If you see Zitadel's picker instead, `idp_hint` isn't being honoured — same diagnosis as Google/Facebook (wrong IdP ID, or IdP not enabled in Login Policy).

### 5.2 Inspect the returned claims

Use a quick curl with the returned code (manually, before any Hulubul code change) to confirm what TikTok actually returns:

```bash
curl -s -u "$ZITADEL_CLIENT_ID:$ZITADEL_CLIENT_SECRET" \
  -X POST "$ZITADEL_ISSUER/oauth/v2/token" \
  -d "grant_type=authorization_code&code=<CODE>&redirect_uri=$AUTH_REDIRECT_URI" \
  | jq .
```

Decode the `id_token` (e.g. on https://jwt.io) and confirm whether `email` is present. **This is the moment of truth** for the GO/CONDITIONAL branch — verify in production-equivalent claims, not in TikTok's docs.

## 6. Troubleshooting cheat-sheet

| Symptom | Most common cause |
|---|---|
| `redirect_uri not registered` from TikTok | TikTok's Login Kit redirect URI doesn't match Zitadel's IdP callback. Copy from Zitadel verbatim. |
| TikTok refuses `client_secret_basic` | TikTok requires `client_secret_post`. If you used the built-in Zitadel TikTok IdP and hit this, file a Zitadel bug; for Generic OIDC, set the auth method in step 3.2 line 9. |
| `user.info.email` scope rejected | App still in Sandbox / not approved. Add the failing user under Manage → Sandbox users, or wait for review. |
| ID token signature fails to verify in Zitadel | TikTok rotates JWKS less predictably than Google/Facebook. Make sure Zitadel's IdP cache is fresh; sometimes you need to disable and re-enable the IdP to force a JWKS refetch. |
| Prefill cookie set but `email` is empty string | **CONDITIONAL branch behaviour** — expected. The form leaves the email editable. |
| Browser shows "Login error" with no detail | TikTok's error responses are sparse. Open the network tab; the `error_description` is usually present even if the UI hides it. |

## 7. What happens next

When §5.1 succeeds and you've decoded the claims per §5.2:

1. **GO branch:** proceed with `02-facebook-tiktok-plan.md` Steps T2–T4 (constants + button visibility test). No callback code change.
2. **CONDITIONAL branch:** proceed with Steps T2–T4 **and** T5 (callback accepts empty email when `provider===PROVIDER_TIKTOK`). This is the **one** Stage-2 exception to byte-invariance — call it out explicitly in the PR description with the spike outcome attached.
3. **NO-GO:** archive `spike-tiktok.md` with the negative result, leave this runbook in place for a future attempt, and do not add `PROVIDER_TIKTOK` to the production constants.

This runbook is referenced from:

- `02-facebook-tiktok.md` — Stage 2 spec
- `02-facebook-tiktok-plan.md` — implementation plan (TikTok track)
- `zitadel-google-runbook.md`, `zitadel-facebook-runbook.md` — sibling runbooks
