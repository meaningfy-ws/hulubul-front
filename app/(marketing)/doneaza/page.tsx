import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";
import { DonateButton } from "@/components/donate/DonateButton";

export const generateMetadata = makeEditorialMetadata("doneaza");

export default function DonatePageRo() {
  return (
    <EditorialPageView
      slug="doneaza"
      locale="ro"
      footerSlot={<DonateButton source="donate-page" locale="ro" />}
    />
  );
}
