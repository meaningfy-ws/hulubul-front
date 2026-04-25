import { getRoutes, getTransporters } from "@/lib/routes-api";
import { RoutesAdmin } from "@/components/routes/RoutesAdmin";

export const metadata = { title: "Administrare rute — Hulubul" };

export default async function AdminRutePage() {
  let routes = await getRoutes().catch(() => []);
  let transporters = await getTransporters().catch(() => []);

  return <RoutesAdmin initialRoutes={routes} transporters={transporters} />;
}
