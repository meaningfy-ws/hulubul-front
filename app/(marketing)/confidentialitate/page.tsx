import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Confidențialitate",
  description:
    "Ce date colectăm, de ce, și cum le poți gestiona pe hulubul.com.",
};

export default function PrivacyPage() {
  return (
    <main className="legal-page">
      <article>
        <h1 className="serif">Politica de confidențialitate</h1>
        <p className="legal-meta">Ultima actualizare: 23 aprilie 2026.</p>

        <p>
          Această pagină descrie ce date colectăm pe hulubul.com, de ce,
          unde se păstrează, și cum le poți gestiona. Dacă ai întrebări,
          scrie-ne la{" "}
          <a href="mailto:contact@hulubul.com">contact@hulubul.com</a>.
        </p>

        <h2 className="serif">Ce reținem pe dispozitivul tău</h2>
        <p>
          Când completezi formularul de înscriere pe lista de așteptare și
          bifezi <em>&bdquo;Reține-mă pe acest dispozitiv&rdquo;</em>, salvăm
          local pe browser-ul tău numele și contactul pe care le-ai introdus,
          ca să găsești formularul deja completat data viitoare. Atât.
        </p>
        <ul>
          <li>
            <strong>Ce stocăm:</strong> numele tău și contactul (email sau
            număr de telefon), exact cum le-ai scris.
          </li>
          <li>
            <strong>De ce:</strong> doar ca să îți economisim timpul când
            revii pe site.
          </li>
          <li>
            <strong>Unde:</strong> în <code>localStorage</code>-ul browserului
            tău, pe acest dispozitiv. Nu ajunge pe serverele noastre, nu
            ajunge la terți, nu intră în nicio bază de date.
          </li>
          <li>
            <strong>Cât timp:</strong> maxim 365 de zile de la ultima
            completare. După aceea, datele sunt șterse automat când
            deschizi pagina.
          </li>
          <li>
            <strong>Cum ștergi manual:</strong> apasă butonul{" "}
            <em>&bdquo;Nu ești tu? Șterge.&rdquo;</em> de lângă câmpul de
            nume, sau folosește opțiunea &bdquo;Clear site data&rdquo; din
            browser-ul tău pentru hulubul.com.
          </li>
          <li>
            <strong>Este opțional:</strong> funcționalitatea se activează
            doar dacă bifezi căsuța. Dacă nu o bifezi, nu salvăm nimic pe
            dispozitivul tău.
          </li>
        </ul>

        <h2 className="serif">Formularul de înscriere</h2>
        <p>
          Când trimiți formularul, datele pe care le-ai introdus (nume,
          contact, rolul ales, opțional ruta de interes) ajung la noi, pe
          serverul backend, ca să te putem anunța la lansare. Nu le
          împărtășim cu terți și nu le folosim pentru altceva decât scopul
          declarat.
        </p>

        <h2 className="serif">Cookie-uri</h2>
        <p>
          hulubul.com nu folosește cookie-uri pentru tracking. Singurele date
          păstrate pe dispozitivul tău sunt cele descrise mai sus, în{" "}
          <code>localStorage</code>, doar cu acordul tău explicit.
        </p>

        <h2 className="serif">Drepturile tale</h2>
        <p>
          Conform GDPR, ai dreptul să ne ceri să-ți accesăm, corectăm sau
          ștergem datele. Trimite-ne un email la{" "}
          <a href="mailto:contact@hulubul.com">contact@hulubul.com</a>.
        </p>

        <p className="legal-meta">
          Acest text este un proiect inițial, supus revizuirii juridice
          înainte de lansarea oficială. Conținutul poate evolua; dacă există
          schimbări materiale, te vom anunța.
        </p>

        <p>
          <Link href="/">← Înapoi la pagina principală</Link>
        </p>
      </article>
    </main>
  );
}
