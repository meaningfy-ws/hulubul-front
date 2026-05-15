import { getRoutes, getTransporters } from "@/lib/routes-api";
import { RoutesAdmin } from "@/components/routes/RoutesAdmin";
import { pageTitle } from "@/lib/seo";

export const metadata = {
  title: pageTitle("Administrare rute — Hulubul"),
  // Admin surface — never indexed.
  robots: { index: false, follow: false },
};

export default async function AdminRutePage() {
  const routes = await getRoutes().catch(() => []);
  const transporters = await getTransporters().catch(() => []);

  return <RoutesAdmin initialRoutes={routes} transporters={transporters} />;
}
