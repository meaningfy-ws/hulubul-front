# Hulubul Landing — Design Element Inventory

> Source: `design/hulubul-landing-v2.html` (Romanian, `lang="ro"`).
> Purpose: a single reference of every visible element, the design tokens used, and the editable-vs-static classification. Use this file to drive the Strapi content model and the frontend reproduction. Every field marked **Editable** becomes a Strapi attribute; every field marked **Static** stays in code.

---

## 1. Document meta

| Key | Value | Status |
|---|---|---|
| `<html lang>` | `ro` | Static (locale could later drive i18n) |
| `<title>` | `hulubul.com — Trimite un colet acasă, fără bătăi de cap` | **Editable** (SEO) |
| `<meta name="description">` | `Platforma care conectează diaspora cu transportatorii care trec prin orașul tău. Un singur loc, fără telefoane nesfârșite prin grupurile de Facebook.` | **Editable** (SEO) |
| `<meta name="viewport">` | `width=device-width, initial-scale=1.0` | Static |
| Open Graph / Twitter cards | Not present in source | Gap — add editable OG image + og:title/og:description |
| Favicon | Not declared in head (repo has `favicon.png`) | Static (frontend) |

---

## 2. Typography

Loaded from Google Fonts via one `<link>`:

```
family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,600;0,9..144,800;1,9..144,400
family=Inter:wght@400;500;600;700
```

| Role | Family | Weights used | Notes |
|---|---|---|---|
| Body, UI | `Inter` | 400, 500, 600, 700 | `-apple-system` fallback |
| Display, serif accents | `Fraunces` | 400, 600, 800; italic 400 | Used for H1–H3, logo, stamps, postmark, step numbers, quote-style lines |

Type scale (from CSS):

| Element | Font | Size | Weight | Letter-spacing | Line-height |
|---|---|---|---|---|---|
| H1 hero | Fraunces | `clamp(44px, 6vw, 82px)` | 800 | -0.035em | 0.98 |
| H2 section | Fraunces | `clamp(36px, 4.5vw, 60px)` | 800 | -0.03em | 1.05 |
| Hero subtitle | Inter | 19px | 400 | — | 1.55 |
| Section intro | Inter | 18px | 400 | — | 1.6 (body) |
| Eyebrow / Section label | Inter | 12px | 600 | 0.15–0.2em upper | — |
| Problem number (01/02/03) | Fraunces italic | 48px | 800 | — | 1 |
| Step number | Fraunces | 32px | 800 | — | — |
| Audience card H3 | Fraunces | 30px | 700 | -0.02em | — |
| Trust item H3 | Fraunces | 22px | 700 | -0.01em | — |
| FAQ summary | Fraunces | 22px | 600 | -0.01em | — |
| Body | Inter | 16px (default) | 400 | — | 1.6 |

Italic emphasis within headlines: every H1/H2 uses a trailing italic span in `--turquoise-dark`, e.g. `Trimite un colet acasă, <em>fără bătăi de cap.</em>` This pattern must be preserved — it is the core typographic motif.

---

## 3. Color tokens

All colors are declared as CSS custom properties on `:root`. These must be reproduced 1:1.

| Token | Value | Role |
|---|---|---|
| `--cream` | `#F5EFE4` | Page background |
| `--cream-dark` | `#EDE4D3` | Cards, form fields, postcard base |
| `--ink` | `#1A1A1A` | Primary text, dark sections, buttons |
| `--ink-soft` | `#3D3D3D` | Body secondary text |
| `--turquoise` | `#0FB5BA` | Primary brand accent (dots, borders, stamp bird) |
| `--turquoise-dark` | `#0A8A8E` | Italic emphasis, CTA hover, link hover |
| `--turquoise-soft` | `#B8E8EA` | Hero glow, dark-section titles |
| `--stamp-red` | `#C8462C` | Stamp rectangle, section labels, eyebrow |
| `--postmark` | `#2C3E50` | Postmark circle ink |
| `--gold` | `#C9A961` | Reserved (declared, not actively used in markup) |
| `--line` | `#D4C9B5` | Dividers, dashed borders, input borders |

Additional non-token colors referenced inline:
- `rgba(245, 239, 228, 0.92)` — nav translucent background
- `rgba(255,255,255,0.04)` and `rgba(255,255,255,0.1)` — problem card bg/border on dark
- `rgba(245, 239, 228, 0.7/0.75/0.5)` — footer/dark-section muted text

---

## 4. Layout system

- Global wrapper: `max-width: 1400px; margin: 0 auto; padding: 120px 40px;` on most `section`s.
- CSS Grid with `grid-template-columns` for every multi-column area. No Tailwind, no utility classes — vanilla CSS with BEM-ish class names.
- `body { overflow-x: hidden }`, `html { scroll-behavior: smooth }`.
- Fixed nav (`position: fixed; top: 0`) with `backdrop-filter: blur(12px)` and bottom 1px line.
- Breakpoints: single mobile breakpoint at `max-width: 900px` plus a smaller refinement at `max-width: 500px` (hero h1 drops to 40px). Use these exact values.
- Decorative elements rely on SVG inline (flight path in postcard) and pure CSS (stamp, postmark, step-line dashed gradient, striped problem-section borders via `repeating-linear-gradient`).

---

## 5. Motion & interactivity

| Behavior | Trigger | Implementation |
|---|---|---|
| Scroll reveal | Element with class `.reveal` enters viewport | `IntersectionObserver` adds `.visible`; transitions `opacity`+`translateY(30px → 0)` over 0.8s |
| Live-dot pulse | Always | `@keyframes pulse` 2s infinite, on hero `.social-proof .dot` |
| CTA hover | Pointer | `translateY(-2px)` + color swap ink → turquoise-dark + box-shadow |
| FAQ open | User click | Native `<details>` + rotating `+` glyph via `details[open] summary::after { transform: rotate(45deg) }` |
| Audience card accent | Hover | Top 6px bar grows from left (`transform: scaleX(0 → 1)`) |
| Form submit | Submit | JS disables button, stores via non-standard `window.storage.set(...)`, swaps form for `.form-success` |
| Audience-link → form prefill | Click on `.audience-link[data-role]` | JS pre-selects matching radio on the signup form |

All of the above are **Static** (code-owned). None become CMS fields.

---

## 6. Section-by-section inventory

Editable fields are what the editor will manage in Strapi. Static items live in the component templates.

### 6.1 Nav (`<nav>`)

- Structure: logo on the left (text + turquoise `.com` + dove emoji disc), single pill CTA on the right.
- **Editable**
  - `logoText` — e.g. `hulubul`
  - `logoAccent` — e.g. `.com`
  - `logoMark` — the glyph inside the turquoise circle (currently `🕊`), could be an image later
  - `ctaLabel` — `Mă înscriu`
  - `ctaHref` — `#signup`
- **Static**: fixed-position bar, backdrop blur, pill styling, hover behavior.

### 6.2 Hero (`<section class="hero">`)

Two-column grid (1.2fr / 1fr). Left: copy + CTA. Right: decorative postcard. A soft turquoise radial glow sits behind the postcard (absolute `::before`).

- **Editable**
  - `eyebrow` — small red-bordered stamp-style tag, e.g. `În pregătire pentru lansare`
  - `titleLead` — `Trimite un colet acasă,`
  - `titleEmphasis` — `fără bătăi de cap.` (rendered inside `<em>`, styled italic + turquoise-dark)
  - `subtitle` — the paragraph under the title (can contain em-dashes; plain text)
  - `primaryCtaLabel` — `Anunță-mă la lansare`
  - `primaryCtaHref` — `#signup`
  - `socialProofText` — `Primele persoane se înscriu zilele acestea — fii printre ele.`
- **Editable (postcard illustration content)**
  - `stampLabel` — `HULUBUL`
  - `stampGlyph` — `🕊`
  - `postmarkCity` — `Chișinău`
  - `postmarkYear` — `2026`
  - `postmarkLabel` — `Livrat`
  - `handwrittenLines` — repeatable list of short italic lines (currently 3):
    1. `Mamă, am trimis coletul săptămâna asta.`
    2. `Tolea pleacă miercuri, ajunge vineri la tine.`
    3. `Te sună înainte, să fii acasă.`
  - `routeFromCity` — `Luxembourg`
  - `routeFromMeta` — `plecare mier., 14 apr.`
  - `routeToCity` — `Chișinău`
  - `routeToMeta` — `sosire vin., 16 apr.`
- **Static**: radial glow, stamp/postmark geometry, dashed borders, SVG arc between cities with two endpoint dots, live-dot animation, `::before` decorative glow.

### 6.3 Problem (`<div class="problem-section">`)

Full-bleed dark band. Top and bottom of the section carry a decorative striped border via `repeating-linear-gradient` in red + turquoise (this is the strongest "postal" visual cue on the page).

- **Editable**
  - `label` — `Problema`
  - `titleLead` — `Cunoști situația,`
  - `titleEmphasis` — `nu-i așa?` (italic, turquoise-soft on dark)
  - `intro` — `Vrei să trimiți un colet acasă. Și începe povestea pe care toți o știm.`
  - `cards` — repeatable numbered cards (currently 3):
    - `number` — `01` / `02` / `03` (display string, not integer — allows curator to choose style)
    - `title` — e.g. `Cauți ore întregi`
    - `description` — one-paragraph body text
- **Static**: dark background, striped edge borders, card hover (translateY + turquoise border), italic Fraunces number styling.

### 6.4 How it works (`<section class="how-section">`)

Three evenly-spaced steps connected by a dashed horizontal line on desktop.

- **Editable**
  - `label` — `Cum funcționează`
  - `titleLead` — `Trei pași.`
  - `titleEmphasis` — `Atât.`
  - `intro` — the supporting paragraph
  - `steps` — repeatable (currently 3):
    - `number` — `1` / `2` / `3`
    - `title` — e.g. `Spune ce vrei să trimiți`
    - `description` — short body
  - `note` — the stamp-red bordered callout: `Fără comisioane ascunse. Plătești direct transportatorului…`
- **Static**: dashed connector line, step number circle with inner dashed ring, step-2 turquoise fill variant (decided positionally in CSS via `:nth-child(2)` — keep that rule even if content order changes).

### 6.5 Audience (`<section class="audience-section">`)

Two-card grid. Each card has a circular emoji icon, an H3 with a split lead + italic tail, body text, and an underlined "Mă înscriu ca X →" link that prefills the signup form.

- **Editable**
  - `label` — `Pentru cine`
  - `titleLead` — `Cine ești?`
  - `titleEmphasis` — `Cel care...`
  - `cards` — repeatable (currently 2):
    - `iconEmoji` — `📦` or `🚐`
    - `titleLead` — `...` (e.g. `...`)
    - `titleEmphasis` — italic tail (e.g. `trimite pachete`)
    - `description` — body paragraph
    - `linkLabel` — e.g. `Mă înscriu ca expeditor →`
    - `linkHref` — `#signup`
    - `role` — **enum**: `expeditor` | `transportator` | `ambele` (drives the JS prefill via `data-role`)
- **Static**: icon circle color flips (`:nth-child(2)` gets stamp-red), top-border scale-in on hover, layout.

### 6.6 Trust (`<div class="trust-section">`)

Cream-dark band. 2×2 grid of trust items: small circular glyph badge + title + short body.

- **Editable**
  - `label` — `De ce hulubul`
  - `titleLead` — `Ce facem`
  - `titleEmphasis` — `diferit.`
  - `items` — repeatable (currently 4):
    - `glyph` — single-character serif glyph: `€`, `◷`, `✦`, `✎`
    - `title` — e.g. `Fără intermediari lacomi`
    - `description` — body paragraph
- **Static**: cream-dark panel, circular glyph badge styling.

### 6.7 Signup (`<div class="signup-section" id="signup">`)

Anchor target for all CTAs. Two radial-gradient halos behind a 620px centered form card with a 12px turquoise offset shadow. Contains the form **and** the hidden success state.

- **Editable (section copy)**
  - `label` — `Lista de așteptare`
  - `titleLead` — `Intră pe listă, fii`
  - `titleEmphasis` — `primul`
  - `titleTrail` — ` anunțat.` (kept as a third slot because the emphasis lands mid-sentence here, unlike other sections)
  - `intro` — supporting paragraph
- **Editable (form copy)**
  - `nameLabel` — `Nume`
  - `nameHint` — `(ca să îți scriem pe nume)`
  - `namePlaceholder` — `Ex: Ion Popescu`
  - `contactLabel` — `Email sau WhatsApp`
  - `contactPlaceholder` — `email@exemplu.com sau +373...`
  - `roleLabel` — `Cine ești?`
  - `roleOptions` — repeatable (3 currently): `{ value: expeditor|transportator|ambele, label: "Trimit pachete"|"Sunt transportator"|"Ambele" }`
  - `roleDefault` — enum, default selected (`expeditor`)
  - `routeLabel` — `Ruta care te interesează`
  - `routeHint` — `(opțional)`
  - `routePlaceholder` — `Ex: Luxembourg → Chișinău`
  - `submitLabel` — `Mă înscriu pe listă →`
  - `privacyNote` — `Datele tale rămân la noi. Le folosim doar ca să te anunțăm la lansare.`
- **Editable (success state)**
  - `successTitle` — `Te-am adăugat pe listă!`
  - `successMessage` — the thank-you paragraph
- **Static**: radial-gradient halos, 12px offset turquoise shadow, radio button styling, success icon check mark animation, success-state layout.
- **Dynamic data (new)**: submission is currently sent to a non-standard `window.storage.set(...)` placeholder. In Strapi this becomes a POST to a `waitlist-submission` collection type (see §7).

### 6.8 FAQ (`<section class="faq-section">`)

Narrow (`max-width: 900px`). Native `<details>`/`<summary>` with rotating `+` glyph.

- **Editable**
  - `label` — `Întrebări frecvente`
  - `titleLead` — `Ce ne`
  - `titleEmphasis` — `întreabă`
  - `titleTrail` — ` lumea.`
  - `items` — repeatable (currently 6):
    - `question` — e.g. `Când lansați?`
    - `answer` — richtext (allows inline `<a>` links; one current item links to `#` a map)
- **Static**: `<details>` open/close animation, `+` → `×` rotation, top/bottom dividing lines.

### 6.9 Footer (`<footer>`)

Dark band with the same striped top-border pattern as the problem section. Three-column layout on desktop: brand + 2 link columns.

- **Editable**
  - Brand: `logoText`, `logoAccent`, `logoMark` (can reuse nav's), `tagline` — `Conectăm oameni, locuri și povești…`
  - `columns` — repeatable (currently 2):
    - `title` — `Platformă` / `Contact`
    - `links` — repeatable `{ label, href }`
  - `copyrightText` — `© 2026 hulubul.com — Toate drepturile rezervate.`
  - `locationLine` — `Construit cu grijă, în Luxembourg și Chișinău.`
- **Static**: striped top bar, 3-column grid, link hover color.

---

## 7. Dynamic data (not in the HTML — needs a new content type)

The signup form must persist submissions. Proposed `waitlist-submission` collection type fields:

| Field | Type | Constraints | Source in HTML |
|---|---|---|---|
| `name` | string | required | `#name` |
| `contact` | string | required; accept email or phone format | `#contact` |
| `role` | enum `expeditor` \| `transportator` \| `ambele` | required, default `expeditor` | radio group |
| `route` | string | optional | `#route` |
| `submittedAt` | datetime | auto — use Strapi's built-in `createdAt` | JS `submitted_at` |

Public permissions: `create` allowed; `find`/`findOne`/`update`/`delete` denied. Only authenticated admins list/export.

---

## 8. Cross-cutting rules for reproduction

1. **Preserve the italic-tail headline motif.** Every H1/H2 (and most card H3s) splits into a Fraunces 800 lead + a Fraunces 400 italic tail colored `--turquoise-dark` (or `--turquoise-soft` on dark sections). The content model reflects this with paired `titleLead` / `titleEmphasis` string fields rather than a single freeform string.
2. **Do not introduce a new styling system.** The original is vanilla CSS with custom properties; the Strapi frontend must inline/import these tokens as-is.
3. **Emoji glyphs are content, not icons.** Keep them as strings (`iconEmoji`, `stampGlyph`, `logoMark`) so editors can change them without code changes. Leave the *circle styling* and *size* in CSS.
4. **Repeating groups are components, not textareas.** Problem cards, steps, audience cards, trust items, FAQ items, footer columns and role options are all repeatable components with typed fields — never rendered from a loose markdown blob.
5. **Only the FAQ answer and (optionally) the privacy note need richtext.** Everything else is plain string/text.
6. **Order matters.** Sections render in the HTML's top-to-bottom order. We lock that order via fixed component fields on the `landing-page` single type (no dynamic zone for v1) — reordering is a code change, editing copy is not.
7. **Language is Romanian** (`lang="ro"`). If/when i18n is added, apply it at the field level on localizable text attributes; do not duplicate the whole single type.

---

## 9. Asset checklist (for Strapi Media Library)

Currently the page uses **no bitmap assets**. Everything visual is CSS + emoji. That keeps Story 7 (asset & media strategy) minimal:

- [ ] `favicon.png` — already in repo root; move to frontend `app/` or `public/`.
- [ ] Future OG image (1200×630) — not present; add an editable `shareImage` on SEO.
- [ ] If the logo ever replaces the emoji with an SVG/PNG, add a `logoImage` media field.

No `next/image` `remotePatterns` entries are needed for v1.

---

## 10. What this inventory maps to in Strapi (preview)

A one-line preview of how §6 becomes schema — full schema is defined in the migration plan, not here:

```
Single Type  landing-page
 ├── seo              → shared.seo (reuse)
 ├── nav              → landing.nav
 ├── hero             → landing.hero  ( + landing.postcard-line[] )
 ├── problem          → landing.section-problem   ( + landing.numbered-card[] )
 ├── howItWorks       → landing.section-how       ( + landing.step[] )
 ├── audience         → landing.section-audience  ( + landing.audience-card[] )
 ├── trust            → landing.section-trust     ( + landing.trust-item[] )
 ├── signup           → landing.section-signup    ( + landing.role-option[] )
 ├── faq              → landing.section-faq       ( + landing.faq-item[] )
 └── footer           → landing.footer            ( + landing.footer-column[] +
                                                    shared.link[] )

Collection Type  waitlist-submission  (public create-only)
```

End of inventory.
