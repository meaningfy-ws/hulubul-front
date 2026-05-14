import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";

export const generateMetadata = makeEditorialMetadata("confidentialitate");

export default function PrivacyPage() {
  return <EditorialPageView slug="confidentialitate" />;
}
