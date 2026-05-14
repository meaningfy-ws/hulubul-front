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

/**
 * Always-on "work in progress" banner. The platform is in early discovery
 * mode — even when routes are populated, this signals that the catalogue
 * is incomplete and that we're still finding new transporters. Removed by
 * a future change once we declare the catalogue stable.
 */
function WorkInProgressBanner() {
  return (
    <div
      role="note"
      style={{
        backgroundColor: "#fef9c3",
        borderBottom: "1px solid #fde68a",
        padding: "14px 24px",
        textAlign: "center",
        color: "#713f12",
      }}
    >
      <p style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>
        🕊️ Porumbeii noștri sunt pe drum — descoperim primele rute.
      </p>
      <p style={{ margin: "4px 0 0", fontSize: "0.85rem" }}>
        Vorbim cu transportatorii unul câte unul. Adăugăm rute noi pe măsură ce
        confirmă programul.
      </p>
    </div>
  );
}

export function RoutesPublic({ routes, transporters }: Props) {
  const [filter, setFilter] = useState<RouteFilter>({ ...EMPTY_FILTER, status: "approved" });
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);

  const filteredRoutes = filterRoutes(routes, filter);
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;
  const isEmpty = routes.length === 0;

  return (
    <div>
      <header
        style={{
          padding: "16px 24px",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Rute de transport</h1>
      </header>

      <WorkInProgressBanner />

      <RoutesMap
        routes={isEmpty ? [] : filteredRoutes}
        selectedRouteId={isEmpty ? null : selectedRouteId}
        onRouteSelect={isEmpty ? undefined : setSelectedRouteId}
        interactive={!isEmpty}
        height="400px"
      />

      {isEmpty ? null : (
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
                style={{
                  color: "#1d4ed8",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: 0,
                  textDecoration: "underline",
                }}
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
      )}
    </div>
  );
}
