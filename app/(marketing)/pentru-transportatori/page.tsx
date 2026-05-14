import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";

export const generateMetadata = makeEditorialMetadata("pentru-transportatori");

export default function ForTransportersPage() {
  return <EditorialPageView slug="pentru-transportatori" />;
}
