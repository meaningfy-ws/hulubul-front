import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";
import { DonateButton } from "@/components/donate/DonateButton";

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
      footerSlot={<DonateButton source="donate-page-en" locale="en" />}
    />
  );
}
