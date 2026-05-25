# Donate placement — ideas, ranked

We want Donate to be *findable*, not *intrusive*. Hulubul's primary call to
action is the waitlist / survey; Donate must never out-shout it. Below are
all the places a Donate entry point could live, ranked by recommendation.

## Strongly recommended (ship in the quick win)

### 1. Dedicated page `/doneaza` + footer link
- Footer link reads `Donează` — short, in the existing footer styling.
- Page is the home for everything Donate: why, what the money does, FAQ,
  CTA button to Stripe.
- **Why:** matches user expectation ("where do I support this?"),
  discoverable from any page, has zero visual cost on the main funnel.
- Analytics source: `"footer"` on the footer link, `"donate-page"` on the
  page CTA.

### 2. Soft mention on `/despre-proiect`
- Short paragraph at the bottom: "Hulubul e construit de o echipă mică.
  Dacă vrei să ne susții, poți face o donație."
- `DonateButton variant="ghost" source="about-page"`.
- **Why:** people who read the about page are already invested. Conversion
  from this surface tends to be higher per impression than from the nav.

## Maybe (revisit after we see analytics)

### 3. End of editorial articles (if we add a blog later)
- Inline DonateButton after the article body, framed as "Ți-a plăcut?".
- **Why:** classic newsroom-style placement. Only useful once we actually
  publish recurring content.

### 4. After waitlist signup confirmation
- A small "Vrei să faci mai mult? Donează" link on the signup-success
  screen.
- **Why:** the user just committed to us; ask only *after* the primary
  goal is achieved. Carries a real risk of feeling transactional —
  needs careful copy and probably an A/B test.

### 5. After survey submission (`/sondaj/*` thank-you state)
- Same logic as #4. Same risk.

## Not recommended (yet)

### 6. Main navigation bar
- A Donate button in the top nav competes with the primary CTA (waitlist
  signup). Standard public-benefit pattern is *footer-first*; nav-bar
  Donate is appropriate for organisations whose donations are the
  primary conversion (Wikipedia, NPR), which is not us.
- Revisit only if Donate becomes a strategic revenue source.

### 7. Hero / above-the-fold on the landing page
- Same reason as #6, amplified. Would dilute the signup funnel.

### 8. Persistent floating "Donate" widget
- Visual noise, looks like an ad, has a real measurable cost on the
  primary CTA's conversion. Don't.

### 9. Modal / interstitial
- Hostile UX. Hard no.

## Summary table

| Surface                          | Ship now? | Source tag       |
|----------------------------------|-----------|------------------|
| `/doneaza` page CTA              | Yes       | `donate-page`    |
| Footer link                      | Yes       | `footer`         |
| `/despre-proiect` soft mention   | Yes       | `about-page`     |
| Article footers (future blog)    | Later     | `article-end`    |
| Post-signup confirmation         | Later/AB  | `post-signup`    |
| Post-survey confirmation         | Later/AB  | `post-survey`    |
| Main nav                         | No        | —                |
| Hero                             | No        | —                |
| Floating widget                  | No        | —                |
| Modal                            | No        | —                |
