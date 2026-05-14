import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";

export const generateMetadata = makeEditorialMetadata("termeni");

export default function TermsPage() {
  return <EditorialPageView slug="termeni" />;
}
