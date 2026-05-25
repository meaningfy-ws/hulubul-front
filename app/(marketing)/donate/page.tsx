import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";
import { StripeBuyButton } from "@/components/donate/StripeBuyButton";

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
        <StripeBuyButton
          title="Donate now"
          description="The payment is handled directly by Stripe. Hulubul never sees your card data."
          fallbackLabel="Donate via Stripe"
        />
      }
    />
  );
}
