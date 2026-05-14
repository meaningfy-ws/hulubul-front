import {
  EditorialPageView,
  makeEditorialMetadata,
} from "@/components/editorial/EditorialPageView";

export const generateMetadata = makeEditorialMetadata("despre-proiect");

export default function AboutPage() {
  return <EditorialPageView slug="despre-proiect" />;
}
