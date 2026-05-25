import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";
import { StripeBuyButton } from "@/components/donate/StripeBuyButton";

export const generateMetadata = makeEditorialMetadata("doneaza");

export default function DonatePageRo() {
  return (
    <EditorialPageView
      slug="doneaza"
      locale="ro"
      asideSlot={
        <StripeBuyButton
          title="Donează acum"
          description="Plata se face direct prin Stripe. Hulubul nu vede datele cardului tău."
          fallbackLabel="Donează prin Stripe"
        />
      }
    />
  );
}
