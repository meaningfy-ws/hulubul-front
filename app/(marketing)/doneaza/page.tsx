import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";
import { STRIPE_DONATE_URL, STRIPE_DONATE_URL_RECURRING } from "@/lib/donate";

export const generateMetadata = makeEditorialMetadata("doneaza");

export default function DonatePageRo() {
  return (
    <EditorialPageView
      slug="doneaza"
      locale="ro"
      asideSlot={
        <>
          <div className="donate-card">
            <h2 className="donate-card-title">Donează lunar</h2>
            <p className="donate-card-description">
              Alege un nivel; donația se reînnoiește lunar. Poți anula
              oricând din e-mailul de confirmare Stripe.
            </p>
            <a
              href={STRIPE_DONATE_URL_RECURRING}
              target="_blank"
              rel="noopener noreferrer"
              className="donate-button donate-button--primary"
            >
              Donează lunar prin Stripe
            </a>
            <p className="donate-button-note">
              Vei fi redirecționat către pagina securizată Stripe.
            </p>
          </div>

          <div className="donate-card">
            <h2 className="donate-card-title">Donează o singură dată</h2>
            <p className="donate-card-description">
              Alege singur suma. Plata se face direct prin Stripe — Hulubul
              nu vede datele cardului tău.
            </p>
            <a
              href={STRIPE_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="donate-button donate-button--primary"
            >
              Donează prin Stripe
            </a>
            <p className="donate-button-note">
              Vei fi redirecționat către pagina securizată Stripe.
            </p>
          </div>
        </>
      }
    />
  );
}
