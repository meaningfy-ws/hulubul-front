import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";
import { StripeBuyButton } from "@/components/donate/StripeBuyButton";
import {
  STRIPE_BUY_BUTTON_ID_RECURRING,
  STRIPE_DONATE_URL_RECURRING,
} from "@/lib/donate";

export const generateMetadata = makeEditorialMetadata("doneaza", {
  locale: "en",
  path: "/donate",
});

export default function DonatePageEn() {
  return (
    <EditorialPageView
      slug="doneaza"
      locale="en"
      path="/donate"
      asideSlot={
        <>
          <StripeBuyButton
            title="Donate once"
            description="Pick any amount. The payment is handled directly by Stripe — Hulubul never sees your card data."
            fallbackLabel="Donate once"
          />
          <StripeBuyButton
            buttonId={STRIPE_BUY_BUTTON_ID_RECURRING}
            fallbackHref={STRIPE_DONATE_URL_RECURRING}
            title="Donate monthly"
            description="Pick a tier; the donation renews each month. You can cancel anytime from your Stripe confirmation email."
            fallbackLabel="Donate monthly"
          />
        </>
      }
    />
  );
}
