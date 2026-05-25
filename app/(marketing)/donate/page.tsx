import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";
import { STRIPE_DONATE_URL, STRIPE_DONATE_URL_RECURRING } from "@/lib/donate";

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
          <div className="donate-card">
            <h2 className="donate-card-title">Donate monthly</h2>
            <p className="donate-card-description">
              Pick a tier; the donation renews each month. You can cancel
              anytime from your Stripe confirmation email.
            </p>
            <a
              href={STRIPE_DONATE_URL_RECURRING}
              target="_blank"
              rel="noopener noreferrer"
              className="donate-button donate-button--primary"
            >
              Donate monthly via Stripe
            </a>
            <p className="donate-button-note">
              You will be redirected to Stripe&apos;s secure payment page.
            </p>
          </div>

          <div className="donate-card">
            <h2 className="donate-card-title">Donate once</h2>
            <p className="donate-card-description">
              Pick any amount. The payment is handled directly by Stripe —
              Hulubul never sees your card data.
            </p>
            <a
              href={STRIPE_DONATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="donate-button donate-button--primary"
            >
              Donate via Stripe
            </a>
            <p className="donate-button-note">
              You will be redirected to Stripe&apos;s secure payment page.
            </p>
          </div>
        </>
      }
    />
  );
}
