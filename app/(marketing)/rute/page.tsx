import { getRoutes, getTransporters } from "@/lib/routes-api";
import { RoutesPublic } from "@/components/routes/RoutesPublic";
import { pageTitle } from "@/lib/seo";

export const metadata = { title: pageTitle("Rute de transport — Hulubul") };

export default async function RutePage() {
  // Always fetch both, never throw — Strapi being unreachable or empty is
  // fine; RoutesPublic renders its own empty state (with an empty map) so
  // visitors see the page chrome and admins see the platform exists.
  const [routes, transporters] = await Promise.all([
    getRoutes({ status: "approved" }).catch(() => []),
    getTransporters().catch(() => []),
  ]);

  return (
    <main>
      <RoutesPublic routes={routes} transporters={transporters} />
    </main>
  );
}
