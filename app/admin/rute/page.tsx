import { getRoutes, getTransporters } from "@/lib/routes-api";
import { RoutesAdmin } from "@/components/routes/RoutesAdmin";

export const metadata = { title: "Administrare rute — Hulubul" };

export default async function AdminRutePage() {
  const routes = await getRoutes().catch(() => []);
  const transporters = await getTransporters().catch(() => []);

  return <RoutesAdmin initialRoutes={routes} transporters={transporters} />;
}
