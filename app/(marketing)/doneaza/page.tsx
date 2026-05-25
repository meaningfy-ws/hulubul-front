import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";
import { StripeBuyButton } from "@/components/donate/StripeBuyButton";
import {
  STRIPE_BUY_BUTTON_ID_RECURRING,
  STRIPE_DONATE_URL_RECURRING,
} from "@/lib/donate";

export const generateMetadata = makeEditorialMetadata("doneaza");

export default function DonatePageRo() {
  return (
    <EditorialPageView
      slug="doneaza"
      locale="ro"
      asideSlot={
        <>
          <StripeBuyButton
            title="Donează o singură dată"
            description="Alege singur suma. Plata se face direct prin Stripe — Hulubul nu vede datele cardului tău."
            fallbackLabel="Donează o singură dată"
          />
          <StripeBuyButton
            buttonId={STRIPE_BUY_BUTTON_ID_RECURRING}
            fallbackHref={STRIPE_DONATE_URL_RECURRING}
            title="Donează lunar"
            description="Alege un nivel; donația se reînnoiește lunar. Poți anula oricând din e-mailul de confirmare Stripe."
            fallbackLabel="Donează lunar"
          />
        </>
      }
    />
  );
}
