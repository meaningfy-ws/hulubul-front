"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { Route, Transporter } from "@/lib/routes-types";
import { EMPTY_FILTER } from "@/lib/routes-types";
import type { RouteFilter } from "@/lib/routes-types";
import { filterRoutes } from "@/lib/routes-filter";
import { RoutesFilter } from "./RoutesFilter";
import { RoutesList } from "./RoutesList";
import { RouteDetailPanel } from "./RouteDetailPanel";

const RoutesMap = dynamic(() => import("./RoutesMap").then((m) => m.RoutesMap), {
  ssr: false,
  loading: () => <div style={{ height: "400px", backgroundColor: "#f3f4f6" }} />,
});

interface Props {
  routes: Route[];
  transporters: Transporter[];
}

export function RoutesPublic({ routes, transporters }: Props) {
  const [filter, setFilter] = useState<RouteFilter>({ ...EMPTY_FILTER, status: "approved" });
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);

  const filteredRoutes = filterRoutes(routes, filter);
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  if (routes.length === 0) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
        <p>Nu există rute active momentan.</p>
        <RoutesMap routes={[]} height="400px" interactive={false} />
      </div>
    );
  }

  return (
    <div>
      <header style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Rute de transport</h1>
      </header>

      <RoutesMap
        routes={filteredRoutes}
        selectedRouteId={selectedRouteId}
        onRouteSelect={setSelectedRouteId}
        interactive
        height="400px"
      />

      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "24px 16px" }}>
        <RoutesFilter
          filter={filter}
          onChange={setFilter}
          onReset={() => setFilter({ ...EMPTY_FILTER, status: "approved" })}
          transporters={transporters}
          hideStatus
        />

        {filteredRoutes.length === 0 ? (
          <p style={{ color: "#6b7280", marginTop: "16px" }}>
            Nicio rută corespunde filtrelor selectate.{" "}
            <button
              type="button"
              onClick={() => setFilter({ ...EMPTY_FILTER, status: "approved" })}
              style={{ color: "#1d4ed8", background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
            >
              Resetează filtrele
            </button>
          </p>
        ) : (
          <RoutesList
            routes={filteredRoutes}
            selectedRouteId={selectedRouteId}
            onSelect={setSelectedRouteId}
            readonly
          />
        )}

        {selectedRoute && (
          <div style={{ marginTop: "16px" }}>
            <RouteDetailPanel
              route={selectedRoute}
              onClose={() => setSelectedRouteId(null)}
              readonly
            />
          </div>
        )}
      </div>
    </div>
  );
}
