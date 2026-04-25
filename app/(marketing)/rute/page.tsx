import { getRoutes, getTransporters } from "@/lib/routes-api";
import { RoutesPublic } from "@/components/routes/RoutesPublic";

export const metadata = { title: "Rute de transport — Hulubul" };

export default async function RutePage() {
  const [routes, transporters] = await Promise.all([
    getRoutes({ status: "approved" }).catch(() => []),
    getTransporters().catch(() => []),
  ]);

  if (routes.length === 0) {
    return (
      <main style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
        <p>Rutele nu pot fi încărcate momentan.</p>
      </main>
    );
  }

  return (
    <main>
      <RoutesPublic routes={routes} transporters={transporters} />
    </main>
  );
}
