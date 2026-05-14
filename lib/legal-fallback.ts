import type { LegalPage } from "./types";

// Fallback legal copy used until the Strapi `legal-confidentialitate` /
// `legal-termeni` single-types are populated (see design/spec-legal-pages.md).
// When the backend ships the content types and editors publish entries, the
// CMS values win automatically and this file becomes dead code.

export const LEGAL_FALLBACK: Record<LegalPage["slug"], LegalPage> = {
  confidentialitate: {
    slug: "confidentialitate",
    title: "Politica de confidențialitate",
    lastUpdated: "23 aprilie 2026",
    metaDescription:
      "Ce date colectăm, de ce, și cum le poți gestiona pe hulubul.com.",
    body: `Această pagină descrie ce date colectăm pe hulubul.com, de ce, unde se păstrează, și cum le poți gestiona. Dacă ai întrebări, scrie-ne la [contact@hulubul.com](mailto:contact@hulubul.com).

## Ce reținem pe dispozitivul tău

Când completezi formularul de înscriere pe lista de așteptare și bifezi *„Reține-mă pe acest dispozitiv"*, salvăm local pe browser-ul tău numele și contactul pe care le-ai introdus, ca să găsești formularul deja completat data viitoare. Atât.

- **Ce stocăm:** numele tău și contactul (email sau număr de telefon), exact cum le-ai scris.
- **De ce:** doar ca să îți economisim timpul când revii pe site.
- **Unde:** în \`localStorage\`-ul browserului tău, pe acest dispozitiv. Nu ajunge pe serverele noastre, nu ajunge la terți, nu intră în nicio bază de date.
- **Cât timp:** maxim 365 de zile de la ultima completare. După aceea, datele sunt șterse automat când deschizi pagina.
- **Cum ștergi manual:** apasă butonul *„Nu ești tu? Șterge."* de lângă câmpul de nume, sau folosește opțiunea „Clear site data" din browser-ul tău pentru hulubul.com.
- **Este opțional:** funcționalitatea se activează doar dacă bifezi căsuța. Dacă nu o bifezi, nu salvăm nimic pe dispozitivul tău.

## Formularul de înscriere

Când trimiți formularul, datele pe care le-ai introdus (nume, contact, rolul ales, opțional ruta de interes) ajung la noi, pe serverul backend, ca să te putem anunța la lansare. Nu le împărtășim cu terți și nu le folosim pentru altceva decât scopul declarat.

## Cookie-uri

hulubul.com nu folosește cookie-uri pentru tracking. Singurele date păstrate pe dispozitivul tău sunt cele descrise mai sus, în \`localStorage\`, doar cu acordul tău explicit.

## Drepturile tale

Conform GDPR, ai dreptul să ne ceri să-ți accesăm, corectăm sau ștergem datele. Trimite-ne un email la [contact@hulubul.com](mailto:contact@hulubul.com).

*Acest text este un proiect inițial, supus revizuirii juridice înainte de lansarea oficială. Conținutul poate evolua; dacă există schimbări materiale, te vom anunța.*`,
  },

  termeni: {
    slug: "termeni",
    title: "Termeni și condiții",
    lastUpdated: "14 mai 2026",
    metaDescription:
      "Termenii de utilizare ai platformei hulubul.com — proiect inițial, supus revizuirii.",
    body: `hulubul.com este în prezent o pagină de prezentare și o listă de așteptare. Aceasta este o versiune inițială a termenilor, publicată ca să poți avea un punct de referință până când lansăm versiunea completă a serviciului.

## Despre platformă

hulubul.com își propune să conecteze expeditori, destinatari și transportatori care fac curse între diaspora moldovenească și Republica Moldova. La momentul publicării acestei pagini, platforma nu este încă activă — colectăm doar înscrieri pe lista de așteptare și răspunsuri la sondajul pentru expeditori.

## Înscrierea pe lista de așteptare

Înscrierea este gratuită și nu creează nicio obligație. Datele tale sunt folosite doar pentru a te anunța la lansare și pentru a contura serviciul împreună. Detaliile despre ce date colectăm și cum le gestionăm sunt în pagina de [confidențialitate](/confidentialitate).

## Conținutul site-ului

Textele, imaginile și materialele de pe hulubul.com sunt proprietatea autorilor lor. Le poți cita cu sursa atribuită. Nu reproduce conținut substanțial fără acord prealabil.

## Modificări

Pe măsură ce serviciul prinde formă, vom publica versiuni complete ale termenilor — inclusiv reguli pentru utilizarea platformei, responsabilitățile transportatorilor, mecanismele de garanție și gestionarea litigiilor. Te vom anunța la schimbări materiale.

## Contact

Pentru întrebări sau clarificări, scrie-ne la [contact@hulubul.com](mailto:contact@hulubul.com).

*Acest text este un proiect inițial, supus revizuirii juridice înainte de lansarea oficială.*`,
  },
};
