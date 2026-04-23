# SSO / Identity Provider Comparison

> Purpose: help pick an authentication backend for hulubul's future authenticated product (post-waitlist). The landing page itself does **not** need SSO.
> Date: 2026-04-23. The IdP landscape moves quickly — verify against vendor docs before committing.
> Scope: OSS and OSS-compatible IdPs that can sit behind a Next.js frontend + Strapi backend. Managed-only options (Clerk, Auth0) included as reference points.

## Important up-front caveats

Before the matrices, three honest calls on your wishlist:

1. **"Sign in with WhatsApp" does not exist as a product.** WhatsApp doesn't expose an OAuth authorization endpoint. What some IdPs can do is *deliver login OTPs via WhatsApp* (as a message channel alongside SMS/email). That's not social login — the user still authenticates with a code, not a WhatsApp identity. Supported natively by Auth0, Clerk, and achievable in any IdP via the WhatsApp Business Cloud API. No OSS IdP has this turn-key today.
2. **Instagram as a standalone login provider is degraded.** Meta deprecated the Instagram Basic Display API and consolidated login into Facebook Login (Instagram permissions). Practically: you configure **Facebook** and request Instagram scopes. Direct "Sign in with Instagram" is not a first-class flow in any major IdP.
3. **TikTok Login Kit works but isn't universal.** TikTok's OAuth2-based Login Kit is available; some IdPs ship a native connector, others require you to wire it via generic OAuth2. Annoying but doable everywhere.

And:

4. **Payment integration is not an IdP concern.** No IdP on this list "integrates payments" as a core feature. Payments belong in your app layer (Stripe, Paddle, Lemon Squeezy). What IdPs *do* offer is an **organizations / billing hook** — a place to store subscription plan and seat count per org — which you then sync to Stripe. Clerk is the most built-out here; most OSS options leave it entirely to you.

## Shortlist

| Name | Type | Short read |
|---|---|---|
| **Keycloak** | OSS (Apache 2.0) | Industry standard. Heavy to run but does everything. Red Hat backed. |
| **Authentik** | OSS (MIT) | Modern Keycloak alternative. Lighter, better UX, fast-moving. |
| **Zitadel** | OSS (Apache 2.0) | Cloud-native, multi-tenant, B2B-focused. Managed option available. |
| **Logto** | OSS (MPL 2.0) | Developer-friendly, great docs, small footprint. Managed option. |
| **SuperTokens** | OSS (Apache 2.0) | SDK-first. Easiest Next.js integration. Managed option. |
| **Ory Kratos + Hydra** | OSS (Apache 2.0) | Microservices. Max flexibility, max ops. |
| **GoTrue (Supabase Auth)** | OSS (MIT) | Part of Supabase. Self-hostable, but lives best inside Supabase. |
| **FusionAuth** | Source-available, free CE | Full-featured single binary. CE is free forever; paid tiers for enterprise features. |
| **Casdoor** | OSS (Apache 2.0) | China-origin, huge list of built-in social providers including regional ones. |
| **Clerk** | Managed (not OSS) | Reference point: closed-source but best-in-class DX for Next.js. |
| **Auth0** | Managed (some OSS components) | Reference point: widest provider catalogue, generous free tier. |

Excluded: **Authelia** (forward-auth for reverse proxies, not a full IdP), **Hanko** (passkeys-only focus), **Stack Auth** (newer, smaller community — revisit in 12 months).

## Matrix 1 — Foundations

| IdP | License | Runtime | Requires DB? | Self-host footprint | Managed SaaS |
|---|---|---|---|---|---|
| Keycloak | Apache 2.0 | Java (JVM) | Yes (Postgres/MySQL/MariaDB) | ~512 MB–1 GB RAM min; Quarkus since v17 is lighter than old Wildfly | No official; Red Hat SSO (paid) |
| Authentik | MIT | Python (Django) + Go proxy | Yes (Postgres + Redis) | ~300–500 MB; 2–3 containers | No official managed offering |
| Zitadel | Apache 2.0 | Go | Yes (CockroachDB or Postgres) | Single binary; ~150 MB RAM | Zitadel Cloud (free + paid tiers) |
| Logto | MPL 2.0 | Node.js | Yes (Postgres) | Single container; ~200 MB | Logto Cloud (free + paid) |
| SuperTokens | Apache 2.0 | Java core + Node SDK | Yes (Postgres/MySQL) | ~300 MB core + SDK in your app | SuperTokens managed (free + paid) |
| Ory (Kratos+Hydra+Keto) | Apache 2.0 | Go | Yes (Postgres/MySQL) | 3 services + DB; heaviest of the Go options | Ory Network (managed) |
| GoTrue | MIT | Go | Yes (Postgres) | Single binary; minimal | Supabase (free + paid) |
| FusionAuth | Source-available | Java | Yes (Postgres/MySQL) | Single binary; ~400 MB | FusionAuth Cloud (paid) |
| Casdoor | Apache 2.0 | Go | Yes (many options) | Single binary; ~100 MB | Casdoor Cloud (paid) |
| Clerk | Proprietary | — | — | N/A | Only option |
| Auth0 | Proprietary | — | — | N/A | Only option |

**Ops-effort ranking** (low → high): Clerk / Auth0 (managed, zero ops) → Logto Cloud / Zitadel Cloud / Supabase → Logto / Zitadel / Casdoor / FusionAuth (single binary) → SuperTokens → GoTrue standalone → Authentik → Keycloak → Ory stack.

## Matrix 2 — Protocols, flows, and auth factors

| IdP | OIDC | SAML | LDAP upstream | LDAP downstream | SCIM | Passkeys / WebAuthn | TOTP MFA | SMS / Email OTP | Magic link | Passwordless |
|---|---|---|---|---|---|---|---|---|---|---|
| Keycloak | Yes | Yes | Yes | Yes | Via plugin | Yes | Yes | Yes (plugin) | Via flow | Yes |
| Authentik | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Zitadel | Yes | Yes | Yes | No (SCIM in roadmap) | Paid tier | Yes | Yes | Yes | Yes | Yes |
| Logto | Yes | Yes (v1.14+) | No | No | Paid | Yes | Yes | Yes | Yes | Yes |
| SuperTokens | Yes | Yes (paid) | No | No | No | Yes | Yes | Yes | Yes | Yes |
| Ory | Yes | Via add-on | No | No | Yes (Kratos) | Yes | Yes | Yes | Yes | Yes |
| GoTrue | Yes | Yes (Supabase paid) | No | No | No | Via Supabase | Yes | Yes | Yes | Yes |
| FusionAuth | Yes | Yes | Yes | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Casdoor | Yes | Yes | Yes | Yes | No | Yes | Yes | Yes | Yes | Yes |
| Clerk | Yes (client) | Yes | Limited | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Auth0 | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes |

"LDAP downstream" = your IdP acts as an LDAP server for legacy apps. Rare need.
SCIM lets other systems (HR tools, provisioning) push user changes to your IdP automatically.

## Matrix 3 — Operational features (multi-app, orgs, DX)

| IdP | Multi-tenant | Multiple apps / clients | Organizations / Groups | Custom domains | Audit logs | Admin UI quality | Next.js SDK | Docs quality |
|---|---|---|---|---|---|---|---|---|
| Keycloak | Yes (realms) | Unlimited | Yes (groups, roles) | Yes | Yes | Dated but functional | Community `next-auth` | Exhaustive, sometimes dense |
| Authentik | Partial (tenants add-on) | Unlimited | Yes (groups) | Yes | Yes | Best-in-class modern | Via OIDC / `next-auth` | Very good |
| Zitadel | Yes (orgs) | Unlimited | Yes (orgs + grants) | Yes | Yes | Modern, clean | Official Next.js SDK | Good, improving |
| Logto | Yes (orgs) | Unlimited | Yes | Yes | Yes | Excellent | Official Next.js SDK | Excellent |
| SuperTokens | Yes (multi-tenant, paid) | Unlimited | Yes (paid) | Via reverse proxy | Paid | Minimal | Best-in-class official SDK | Good |
| Ory | Yes (Network) | Unlimited | Yes (Keto) | Paid | Paid | Minimal (API-first) | Community | Good but fragmented |
| GoTrue | Via Supabase projects | Multiple via Supabase | No (build in app) | Supabase paid | Paid | Supabase UI | Supabase SSR helpers | Excellent |
| FusionAuth | Yes (tenants) | Unlimited | Yes | Yes | Yes | Solid, classic | Community | Very good |
| Casdoor | Yes (orgs) | Unlimited | Yes | Yes | Yes | Functional | Community | OK (some zh-CN gaps) |
| Clerk | Yes (orgs) | Yes | Yes (first-class) | Paid | Yes | Best-in-class | Gold-standard official | Excellent |
| Auth0 | Yes | Yes | Yes | Paid | Yes (paid tiers) | Mature | Official | Excellent |

## Matrix 4 — Social / identity-provider integrations

"Yes" means a first-class built-in connector. "Generic OAuth2" means you can add it yourself via the IdP's OAuth2 plumbing (~30 min of config, always works for OIDC/OAuth2-compliant providers).

| IdP | Google | Facebook | Apple | Microsoft | GitHub | LinkedIn | Twitter/X | Discord | TikTok | Instagram† | WhatsApp‡ | Generic OIDC / OAuth2 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Keycloak | Yes | Yes | Via OIDC | Yes | Yes | Yes | Yes | Via OIDC | Generic OAuth2 | Via Facebook | No login, OTP only via plugin | Yes |
| Authentik | Yes | Yes | Yes | Yes | Yes | Generic | Yes | Yes | Generic OAuth2 | Via Facebook | No | Yes |
| Zitadel | Yes | Generic | Yes | Yes | Yes | Generic | Generic | Generic | Generic OAuth2 | Via Facebook | No | Yes |
| Logto | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes (connector) | Via Facebook | No login | Yes |
| SuperTokens | Yes | Yes | Yes | Yes (Entra/AD) | Yes | Yes | Yes | Yes | Generic OAuth2 | Via Facebook | No | Yes |
| Ory | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Generic OAuth2 | Via Facebook | No | Yes |
| GoTrue | Yes | Yes | Yes | Yes (Azure) | Yes | Yes | Yes | Yes | Generic OAuth2 | Via Facebook | No | Yes |
| FusionAuth | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Generic | Generic OAuth2 | Via Facebook | No login, SMS-over-WhatsApp via plugin | Yes |
| Casdoor | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Generic | Yes (connector) | No | Yes |
| Clerk | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Yes | No login, OTP via WhatsApp (paid add-on) | Yes |
| Auth0 | Yes | Yes | Yes | Yes | Yes | Yes | Yes | Via marketplace | Yes | Yes (Facebook or custom) | No login, OTP via WhatsApp | Yes |

† Instagram: every "Yes" here really means "Facebook Login with Instagram permissions." Meta does not support standalone Instagram OAuth for new apps.
‡ WhatsApp: no provider offers "Sign in with WhatsApp" — it doesn't exist. What's listed is whether the IdP can deliver OTP login codes via WhatsApp (a message channel, not an identity provider).

**If regional providers matter** (Kakao, Naver, Line, WeChat, Alipay, VK, Yandex, QQ, Weibo):
- **Casdoor** has the broadest native list (Chinese and Korean providers included).
- **Logto** has Kakao, Naver, Line, WeChat, Alipay natively.
- Others require generic OAuth2 plumbing.

## Matrix 5 — What's free, where paid starts (as of early 2026)

Each IdP in this list has a "self-host for free" story, but they differ in **what gets paywalled inside self-host** versus "everything is free, pay only for support / managed hosting." Pricing figures are rough estimates; verify before committing.

### Self-hosted: what's free vs paid

| IdP | Self-host licence | 100% free self-hosted? | Features that require a paid licence when self-hosted |
|---|---|---|---|
| **Keycloak** | Apache 2.0 | Yes, everything | Nothing. Paid only if you buy Red Hat Build of Keycloak for commercial support. |
| **Authentik** | MIT (CE) + Enterprise add-on | Core yes; some features locked | Enterprise RBAC in admin, push MFA, priority support, advanced reporting, remote access. Pricing per seat, quote-based. |
| **Zitadel** | Apache 2.0 | Yes, all features | Paid only for commercial support (Zitadel Enterprise licence) or managed cloud. |
| **Logto** | MPL 2.0 | Core yes; some limits | SSO upstream connectors (SAML/OIDC enterprise IdPs), organisations at scale, and some advanced features nudge you toward Logto Cloud. Core OIDC + social free. |
| **SuperTokens** | Apache 2.0 (core) | Partial | Paid when self-host: multi-tenancy, MFA/TOTP, account linking, user-management dashboard, SAML, attack protection. Core email/password + social free. |
| **Ory (Kratos/Hydra/Keto)** | Apache 2.0 | Yes, everything | Nothing locked; paid only for Ory Network managed tier or enterprise support. |
| **GoTrue** | MIT | Yes, everything | Nothing in GoTrue itself; paid tiers are Supabase-platform features (SAML SSO, analytics, advanced DB). |
| **FusionAuth** | Source-available "Community" licence | Most yes | Paid tiers unlock: multiple tenants, themable admin, advanced registration forms, SCIM v2, enterprise connectors, support. Starts ~$825/year Starter, scales up. |
| **Casdoor** | Apache 2.0 | Yes, everything | Paid only for Casdoor Cloud managed or commercial support. |
| **Clerk** | Proprietary | N/A (no self-host) | — |
| **Auth0** | Proprietary | N/A (managed only; Okta offers private cloud at enterprise pricing) | — |

### Managed / cloud tiers: free allowance and paid trigger points

Figures below reflect approximate late-2025 / early-2026 pricing pages. All move, check before signing.

| IdP | Free tier cap | First paid tier (monthly) | What triggers the upgrade |
|---|---|---|---|
| **Zitadel Cloud** | 25,000 MAU, 10k auth req/mo, 1 domain, 1 external IdP | ~$0.02 per extra auth request + $50 base | More external IdPs, custom domains, higher traffic, SLA |
| **Logto Cloud** | 7,500 MAU, 3 organisations, basic social | ~$16/mo Pro + per-MAU over quota | MAU over free, SSO connectors, audit logs retention, team members |
| **SuperTokens Cloud** | 5,000 MAU, community support | ~$0.02/MAU beyond, + feature add-ons | MAU over free, MFA, multi-tenancy, dashboard, SAML (each is a paid line item) |
| **Ory Network** | 1 project, limited MAU | ~$29/mo Developer | More projects, custom domains, SCIM, higher MAU |
| **Supabase (incl. GoTrue)** | 50,000 MAU, 500 MB DB, 1 GB storage | $25/mo Pro | MAU over free, custom SMTP, daily backups, PITR. SAML SSO only on Team+ ($599/mo) |
| **FusionAuth Cloud** | No free tier for Cloud (Community is free self-host) | ~$37/mo Basic Cloud | Choice of managed vs. self-host Starter ~$69/mo billed annually |
| **Casdoor Cloud** | Free tier varies | ~$19/mo | MAU, customisation, support |
| **Clerk** | 10,000 MAU, 100 MAO (monthly active orgs), 3 social providers, email+password, passkeys | $25/mo Pro + $0.02 per extra MAU | SAML SSO, custom domains, HIPAA, role-based perms, removes Clerk branding |
| **Auth0** | 7,500 active users on Free plan (Okta-brand now), social + DB + passwordless | ~$35/mo Essentials (B2C) / $150/mo B2B | SSO/SAML, enterprise connections, custom domains, MFA variants, organisations |
| **Authentik Enterprise** | N/A (CE is free, EE is the paid SKU) | Quote-based per seat | Push MFA, advanced RBAC, priority support |
| **Keycloak managed (Red Hat)** | N/A — enterprise only | Quote-based | Red Hat SSO subscription, 24/7 support, certified builds |

### Feature-by-feature: when does each capability move from free to paid?

| Feature | Free everywhere | Often paid in managed tiers | Usually paid in self-host EE |
|---|---|---|---|
| OIDC + OAuth2 + basic social | Yes (all listed) | — | — |
| SAML 2.0 | Free self-host: Keycloak, Authentik, Zitadel, Casdoor, FusionAuth CE, Ory. | Paid: Auth0 Essentials+, Clerk Pro+, Supabase Team+, Logto Cloud Pro, SuperTokens add-on | SuperTokens self-host (add-on) |
| Passkeys / WebAuthn | Yes everywhere in base tiers | — | — |
| TOTP MFA | Yes everywhere | — | — |
| SMS / WhatsApp OTP delivery | Rarely free (you pay the SMS/WA vendor regardless) | Yes — surcharge per message | Yes — surcharge per message |
| Multi-tenant / multi-org | Free: Keycloak (realms), Authentik, Zitadel, Logto, FusionAuth (limit), Casdoor, Ory | Paid tier: Clerk Pro, Auth0 B2B, Supabase | SuperTokens (paid add-on), FusionAuth advanced |
| Custom domains | Free self-host (you own DNS) | Paid: Clerk Pro, Auth0, Supabase paid | — |
| SCIM (inbound provisioning) | Free: Authentik, FusionAuth (Essentials+), Ory Kratos | Paid: Clerk, Auth0, Supabase | Keycloak (plugin), Logto paid |
| Audit logs with retention | Free with local storage everywhere | Paid for long-retention + export in managed tiers | — |
| Admin push MFA (Duo-style) | — | Paid add-ons everywhere | Authentik Enterprise |
| 24/7 commercial support / SLA | None free | Always paid | Always paid |
| Remove vendor branding on login pages | Free self-host | Clerk Pro, Auth0 Professional required | — |

### Practical pricing shortcuts

- **"I want zero dollars forever and I have ops capacity":** Keycloak, Zitadel, Casdoor, Ory — all 100% free self-host, no EE paywalls.
- **"I want free self-host but expect to outgrow it":** Logto or Authentik. Core is free forever; enterprise features are opt-in.
- **"I want the cheapest managed option under ~10k MAU":** Clerk free tier or Zitadel Cloud free tier. Both are genuinely usable for a launched product.
- **"I need SAML SSO on day one":** Keycloak, Authentik, FusionAuth CE, Casdoor, Zitadel — free self-host. Managed equivalents cost real money (Clerk Pro, Auth0 B2B, Supabase Team).
- **"I want passkeys and don't care about the rest":** Every option listed supports them in the free tier. Not a differentiator anymore.

## Per-provider takeaways

**Keycloak.** The default enterprise answer. Nothing is paywalled, everything is configurable, documentation is exhaustive. Downsides: JVM footprint, dated admin UX relative to newer entrants, Quarkus migration churn. Pick when SAML-heavy B2B or regulated environment. Don't pick if your team is small and the ops burden matters.

**Authentik.** Feels like what Keycloak would be if rewritten today. Rich provider list, polished UI, active development. EE paywall is light and fair (push MFA, advanced RBAC). Very good default for a team that wants modern tooling without SaaS lock-in.

**Zitadel.** Best choice if you're building a B2B SaaS with multi-tenant orgs as a first-class concern. Single Go binary is easy to operate. Growing provider catalogue but smaller than Logto/Keycloak/Authentik. Cloud tier is generous.

**Logto.** Best-in-class DX among OSS options. Excellent Next.js SDK, clean admin UI, docs at Stripe-quality level. Smaller feature surface than Keycloak (no LDAP downstream, less SAML maturity historically). Right pick for a developer-led product launching quickly.

**SuperTokens.** SDK-first philosophy — you embed auth into your app rather than redirect to a hosted login. Great if you want login UI to match your app exactly without theming fights. Feature paywalls in self-host are the tightest on this list (MFA, SAML, multi-tenancy, account linking all paid). Cheaper with the managed tier.

**Ory (Kratos + Hydra + Keto).** Most powerful and most complex. API-first, no default UI — you build the login pages. Microservices architecture (three services + DB + your UI). Pick when you have a platform team that wants maximum flexibility and can swallow the ops cost.

**GoTrue / Supabase Auth.** Makes most sense if you've already committed to Supabase for the database. Standalone GoTrue works but feels stripped (no admin UI without Supabase). Free tier is generous; SAML is Team-plan-only which is a steep step.

**FusionAuth.** Underrated. Single Java binary, free Community licence covers 95% of needs, paid tiers are reasonably priced and don't hostage-take critical features. Admin UI feels like enterprise software from 2018 — functional and unsurprising. Good if you want a turnkey product with a paid escape hatch for support.

**Casdoor.** Strong regional-provider catalogue (WeChat, Alipay, Kakao, Naver, DingTalk, Feishu), fully Apache-licensed, small Go binary. Documentation has rough edges in English. Pick if Chinese/Korean user base or if you want maximal provider breadth.

**Clerk.** If money is no object and you want the smoothest Next.js experience in the industry, Clerk wins. Hosted only. Free tier is extremely usable (10k MAU). Costs climb fast at scale, and "we built our auth on Clerk" is a migration project if you ever leave.

**Auth0 (Okta).** The elder statesman. Widest provider catalogue, mature SOC/HIPAA/etc. compliance story, decent free tier. Gets expensive quickly — B2B Organisations pricing is painful below a few thousand seats. Pick when you need enterprise connector breadth and you're OK with vendor lock.

## Recommendation for hulubul

**Right now (pre-launch, anonymous waitlist):** none. Don't deploy an IdP for a landing page. Ship the current stack.

**When the authenticated product launches (users sign in, expeditori manage shipments, transportatori see requests):** two paths, pick by team size and budget.

| Team shape | Recommendation | Why |
|---|---|---|
| 1–2 devs, ship fast, prefer managed | **Logto Cloud** free tier, migrate to Cloud Pro when MAU > 7,500 | Best Next.js DX, clean admin, realistic self-host escape hatch (MPL licence, single container) if pricing bites later. |
| Small team, want zero recurring cost, have basic ops | **Zitadel** self-host | Apache-licensed, single Go binary, multi-tenant out of the box (good for "expeditor" vs "transportator" org separation), no EE paywalls. |
| Enterprise-ish deal requires SAML + audit | **Keycloak** self-host or **Authentik** | Both free, both production-proven, both talk SAML natively. Authentik is easier to run. |
| Already on Supabase for DB | **GoTrue via Supabase** | Don't add a second auth system; use what's already there. |

**What I'd avoid for hulubul specifically:**
- **Ory stack** — too much ops overhead for this scale.
- **SuperTokens self-host** — the MFA/multi-tenant/SAML paywalls hit exactly the features you'll want for a B2B-ish marketplace.
- **Auth0** — cost curve is unfriendly below enterprise scale; Clerk gives better DX per euro at this tier.

**Migration-proofing tip.** Every option on this list speaks OIDC. As long as your Next.js layer authenticates against a standard OIDC discovery URL (using `next-auth`, `@logto/next`, or equivalent), the concrete IdP is swappable in ~an afternoon. Don't over-invest in provider-specific SDKs for features you don't actually need yet.

## Sources / verify before deciding

- Vendor pricing pages — all change quarterly:
  - keycloak.org, goauthentik.io, zitadel.com/pricing, logto.io/pricing, supertokens.com/pricing, ory.sh/pricing, supabase.com/pricing, fusionauth.io/pricing, casdoor.org, clerk.com/pricing, auth0.com/pricing
- OWASP ASVS for which features are actually required for your compliance posture.
- Your own rough MAU forecast for 12–18 months out — free tiers are loss leaders, they all price-step at the cap.

---

*This document is a snapshot; the IdP market is moving fast. Re-check any shortlisted vendor's pricing and feature matrix directly before signing anything.*
