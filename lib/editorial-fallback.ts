import type { EditorialPage } from "./types";

// Build-time fallback for editorial pages (legal + about) used until the
// matching Strapi `page-{slug}` single-types are populated. See
// design/spec-legal-pages.md. When the backend ships the content types and
// editors publish entries, the CMS values win automatically and this file
// becomes dead code.
//
// Note: contact@hulubul.com is intentionally absent from this copy because
// the mailbox isn't live yet (May 2026). When mail is set up, both this file
// and the Strapi entries can reintroduce the address.

export const EDITORIAL_FALLBACK: Record<
  EditorialPage["slug"],
  EditorialPage
> = {
  confidentialitate: {
    slug: "confidentialitate",
    title: "Politica de confidențialitate",
    lastUpdated: "23 aprilie 2026",
    metaDescription:
      "Ce date colectăm, de ce, și cum le poți gestiona pe hulubul.com.",
    body: `Această pagină descrie ce date colectăm pe hulubul.com, de ce, unde se păstrează, și cum le poți gestiona.

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

Conform GDPR, ai dreptul să ne ceri să-ți accesăm, corectăm sau ștergem datele. Adresa de contact va fi anunțată la lansare.

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

*Acest text este un proiect inițial, supus revizuirii juridice înainte de lansarea oficială.*`,
  },

  "despre-proiect": {
    slug: "despre-proiect",
    title: "Despre proiect",
    lastUpdated: "14 mai 2026",
    metaDescription:
      "Despre hulubul.com — de ce construim platforma și cum o gândim împreună cu diaspora moldovenească.",
    body: `hulubul.com pornește de la o problemă pe care o cunoaștem cu toții: trimiterea de pachete între diaspora moldovenească și Republica Moldova depinde, în prezent, de grupuri Facebook, recomandări și mesaje pe WhatsApp. Funcționează — dar pierzi timp și nu ai garanții.

## Ce încercăm să facem

Vrem o platformă unde:

- **Expeditorii** găsesc rapid o cursă potrivită pentru pachetul lor, cu rute, date și transportator clar afișate.
- **Transportatorii** primesc cereri relevante, fără să caute prin grupuri, și își păstrează relația directă cu clienții.
- **Destinatarii** știu când sosește pachetul și cu cine vorbesc dacă apare ceva.

Credem că o platformă utilă se construiește împreună cu cei care o folosesc — de aceea pornim cu o listă de așteptare și un sondaj scurt pentru expeditori.

## Unde suntem acum

Suntem la început. Pagina pe care o vezi este versiunea inițială:

- Colectăm înscrieri pe lista de așteptare, ca să anunțăm primii utilizatori la lansare.
- Rulăm un sondaj cu expeditori, ca să modelăm corect prima versiune a serviciului.
- Discutăm individual cu transportatori care vor să fie printre primii pe platformă.

## Cine suntem

Suntem o echipă mică, distribuită între Luxembourg și Chișinău. Construim cu grijă, pas cu pas, fără promisiuni mari și fără reclame zgomotoase. Dacă vrei să afli mai multe sau să contribui, înscrie-te pe lista de așteptare — ținem legătura.

*Această pagină va fi actualizată pe măsură ce proiectul evoluează.*`,
  },
};
