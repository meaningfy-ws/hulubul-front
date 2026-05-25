# Backend spec — Add 2 FAQ entries to the landing page

**Status:** Frontend ready. Backend change **not yet done.**
**Owner:** Backend repo (separate).
**Why:** The donate page (`/doneaza`, `/donate`) no longer carries its own
FAQ — we consolidated donation Q&As into the main landing FAQ so visitors
can find all "how to support" info in one place. The frontend now links
from `/doneaza` to `/#faq` on the landing page.

Until the two entries below are added to Strapi, visitors clicking
"Întrebări frecvente" from `/doneaza` will land on the existing landing
FAQ which doesn't yet answer the donate-specific questions. The link
still works (anchor scroll to FAQ section); only the content needs the
new entries.

## Where to add them

Strapi collection / single-type: **`landing-page.faq.items`**
(the existing FAQ component on the landing single-type).

Add **two new items** at the end of the existing list (or at whichever
position editorial decides is best for the user journey).

Both items support `richtext`-style markdown in `answer` (existing FAQ
answers use the same `MarkdownText` renderer — confirmed in
`components/landing/Faq.tsx`). Inline `[text](url)` links work.

## Item 1 — RO

| Field      | Value                                                                                       |
|------------|---------------------------------------------------------------------------------------------|
| `question` | `Cum pot sprijini proiectul?`                                                               |
| `answer`   | (see Markdown below)                                                                        |

```markdown
Sunt mai multe moduri prin care ne poți ajuta:

- **Completează [sondajul pentru expeditori](/sondaj/expeditori)** — ne ajută să modelăm corect serviciul.
- **Înscrie-te pe [lista de așteptare](/#signup)** — ești printre primii anunțați la lansare.
- **[Donează](/doneaza)** — financiar, o singură dată sau lunar.
- **Spune și altora** — un share pe WhatsApp sau Facebook face mai mult decât crezi.
```

## Item 1 — EN (translation in Strapi i18n)

| Field      | Value                                                                                       |
|------------|---------------------------------------------------------------------------------------------|
| `question` | `How can I support the project?`                                                            |
| `answer`   | (see Markdown below)                                                                        |

```markdown
There are several ways you can help:

- **Fill out [the sender survey](/sondaj/expeditori)** — it helps us shape the service correctly.
- **Join the [waitlist](/#signup)** — be among the first notified at launch.
- **[Donate](/donate)** — financially, once or monthly.
- **Tell others** — a share on WhatsApp or Facebook goes further than you think.
```

## Item 2 — RO

| Field      | Value                                                                                       |
|------------|---------------------------------------------------------------------------------------------|
| `question` | `Pot dona?`                                                                                 |
| `answer`   | (see Markdown below)                                                                        |

```markdown
Da. Pe pagina [Donează](/doneaza) ai două opțiuni:

- **O singură dată** — alegi singur suma.
- **Lunar** — alegi un nivel; donația se reînnoiește automat și o poți anula oricând din e-mailul de confirmare Stripe.

Plata se face prin **Stripe** — Hulubul nu vede și nu stochează datele cardului tău. Stripe îți trimite automat o confirmare pe e-mail; pentru documente fiscale formale, scrie-ne și ne ocupăm manual.

Donațiile **nu sunt deductibile fiscal** momentan — Hulubul nu este înregistrat ca ONG sau asociație. Asta se poate schimba în viitor.
```

## Item 2 — EN (translation in Strapi i18n)

| Field      | Value                                                                                       |
|------------|---------------------------------------------------------------------------------------------|
| `question` | `Can I donate?`                                                                             |
| `answer`   | (see Markdown below)                                                                        |

```markdown
Yes. On the [Donate](/donate) page you have two options:

- **Once** — pick any amount.
- **Monthly** — pick a tier; the donation renews automatically and you can cancel anytime from your Stripe confirmation email.

The payment runs through **Stripe** — Hulubul never sees or stores your card data. Stripe automatically emails you a confirmation; for formal tax documents, write to us and we'll handle it manually.

Donations are **not currently tax-deductible** — Hulubul is not registered as a non-profit. That may change in the future.
```

## Acceptance

- Both items appear under the existing FAQ on `/` (RO) and would appear on `/en` (EN) when that route ships.
- Anchor link `/#faq` from `/doneaza` and `/donate` lands on the FAQ section (the frontend already sets `id="faq"` on the FAQ `<section>` — see `components/landing/Faq.tsx`).
- The `[Donează](/doneaza)` / `[Donate](/donate)` and `[sondajul pentru expeditori](/sondaj/expeditori)` / `[the sender survey](/sondaj/expeditori)` inline links render as clickable links (existing FAQ rows already render Markdown answers via `MarkdownText`).

## Permissions

No permission change required — the existing `STRAPI_API_TOKEN` already
has read access on `landing-page` (see `lib/strapi.ts`, `getLandingPage`).
