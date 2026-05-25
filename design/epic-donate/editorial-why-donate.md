# Editorial — Why donate (page `/doneaza`)

This document is the content brief for the editorial page. Tone is
**gratitude-first, not guilt-tripping**. We thank, we explain, we ask once.

## Voice and tone

- Warm, plain Romanian. Avoid NGO-jargon ("misiune", "impact strategic").
- First person plural ("noi", "echipa Hulubul"). Direct address ("tu").
- Concrete, not aspirational: say *what the next euro pays for*.
- Never apologise for asking; never beg.

## Page structure (Markdown sections)

### `# Susține Hulubul`
One-paragraph hook (≤ 3 sentences):
> Hulubul e construit de o echipă mică, în timpul liber, fără reclame și
> fără investitori. Dacă platforma ți-e utilă — sau crezi că ar putea fi,
> pentru transportatori și expeditori din România — ne poți susține cu o
> donație printr-un singur clic.

### `## Mulțumim. Serios.`
Short paragraph addressed to anyone who already donated, shared, sau
completed surveys. The point: *gratitude comes before the ask*.

### `## La ce folosim banii`
Bulleted, concrete:
- **Servere și infrastructură** — hosting, baza de date, e-mail, monitorizare.
- **Domenii și certificate** — `hulubul.com`, certificat SSL, servicii de e-mail.
- **Unelte de lucru** — licențe necesare pentru a dezvolta și opera platforma.
- **Cercetare** — interviuri cu transportatori și expeditori, plata
  micilor stimulente pentru participanți la sondaje.
- **Ce nu folosim** — salarii. Acum lucrăm voluntar. Dacă acest lucru se
  schimbă, vom spune deschis pe această pagină.

### `## De ce nu avem reclame`
Două propoziții. Reclamele ar polua datele și ar schimba la cine ne uităm
("clienții sunt advertiserii, nu utilizatorii"). Donațiile ne țin
aliniați cu utilizatorii reali.

### `## Cum funcționează plata`
> Plata se face prin **Stripe**, un procesator securizat folosit de mii de
> organizații în Europa. Hulubul nu vede și nu stochează datele cardului
> tău. Vei fi redirecționat către pagina securizată Stripe; după plată poți
> reveni pe site.

### `## Întrebări frecvente`

- **Pot dona lunar?** Nu încă. Lucrăm la asta. Pentru moment doar donații
  unice.
- **Pot primi factură / chitanță?** Stripe îți trimite automat o
  confirmare pe e-mail. Pentru documente fiscale formale, scrie-ne la
  `<email>` și ne ocupăm manual.
- **Pot dona prin transfer bancar?** Scrie-ne la `<email>` și îți trimitem
  datele.
- **Donațiile sunt deductibile fiscal?** Nu, momentan Hulubul nu este
  ONG / asociație înregistrată. Asta se poate schimba în viitor.

### `## Donează acum`
CTA paragraph + the `DonateButton` rendered in `footerSlot` (see
`quick-win-plan.md` §3).

Disclaimer line, visible:
> Vei fi redirecționat către pagina securizată Stripe. Hulubul nu vede
> datele cardului tău.

### `## Altă formă de sprijin`
For people who can't or won't donate money:
- Completează **sondajul** (`/sondaj/expeditori`).
- Înscrie-te pe **lista de așteptare**.
- Spune-le și altora despre Hulubul.

## Strapi field mapping

| Field             | Value                                                                          |
|-------------------|--------------------------------------------------------------------------------|
| `slug`            | `doneaza`                                                                      |
| `title`           | `Susține Hulubul`                                                              |
| `lastUpdated`     | Editorial owner sets manually each revision.                                   |
| `body`            | Sections above, as Markdown.                                                   |
| `metaDescription` | `Hulubul e construit de o echipă mică, fără reclame. Susține proiectul printr-o donație unică.` |
| `ctaLabel`        | `Donează prin Stripe`                                                          |
| `ctaNote`         | `Vei fi redirecționat către pagina securizată Stripe.`                         |

## Fallback in `lib/editorial-fallback.ts`

Use the sections above verbatim. Keep the fallback short enough that the
file stays readable — drop the FAQ section in the fallback if it makes the
file too long; the FAQ can wait for the CMS entry.
