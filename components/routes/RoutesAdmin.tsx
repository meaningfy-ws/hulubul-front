"use client";

import { useState, useTransition, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Route, Transporter } from "@/lib/routes-types";
import type { RouteFilter } from "@/lib/routes-types";
import type { RoutePayload } from "@/lib/routes-schema";
import { EMPTY_FILTER } from "@/lib/routes-types";
import { filterRoutes } from "@/lib/routes-filter";
import { RoutesFilter } from "./RoutesFilter";
import { RoutesList } from "./RoutesList";
import { RouteDetailPanel } from "./RouteDetailPanel";
import { RouteFormDrawer } from "./RouteFormDrawer";
import { createRouteAction, updateRouteAction, deleteRouteAction } from "@/app/admin/rute/actions";

const RoutesMap = dynamic(() => import("./RoutesMap").then((m) => m.RoutesMap), {
  ssr: false,
  loading: () => <div style={{ height: "100%", backgroundColor: "#f3f4f6" }} />,
});

interface Props {
  initialRoutes: Route[];
  transporters: Transporter[];
}

export function RoutesAdmin({ initialRoutes, transporters }: Props) {
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  const [filter, setFilter] = useState<RouteFilter>(EMPTY_FILTER);
  const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Route | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filteredRoutes = filterRoutes(routes, filter);
  const selectedRoute = routes.find((r) => r.id === selectedRouteId) ?? null;

  function openCreate() {
    setEditingRoute(null);
    setDrawerOpen(true);
  }

  function openEdit(route: Route) {
    setEditingRoute(route);
    setDrawerOpen(true);
  }

  function closeDrawer() {
    setDrawerOpen(false);
    setEditingRoute(null);
  }

  const handleSave = useCallback(async (payload: RoutePayload) => {
    setError(null);
    if (editingRoute) {
      const updated = await updateRouteAction(editingRoute.documentId, payload);
      setRoutes((prev) => prev.map((r) => (r.documentId === updated.documentId ? updated : r)));
    } else {
      const created = await createRouteAction(payload);
      setRoutes((prev) => [created, ...prev]);
    }
  }, [editingRoute]);

  function confirmDelete(route: Route) {
    setDeleteTarget(route);
  }

  function cancelDelete() {
    setDeleteTarget(null);
  }

  async function executeDelete() {
    if (!deleteTarget) return;
    setError(null);
    try {
      await deleteRouteAction(deleteTarget.documentId);
      setRoutes((prev) => prev.filter((r) => r.documentId !== deleteTarget.documentId));
      if (selectedRouteId === deleteTarget.id) setSelectedRouteId(null);
      setDeleteTarget(null);
    } catch {
      setError("Ștergerea a eșuat. Încearcă din nou.");
      setDeleteTarget(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <header style={{ padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700 }}>Administrare rute</h1>
        <button
          type="button"
          onClick={openCreate}
          style={{ padding: "8px 16px", backgroundColor: "#1d4ed8", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer" }}
        >
          + Adaugă rută
        </button>
      </header>

      {error && (
        <div role="alert" style={{ margin: "8px 24px", padding: "10px", backgroundColor: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "6px", color: "#dc2626", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {deleteTarget && (
        <div role="alertdialog" aria-label="Confirmare ștergere" style={{ margin: "8px 24px", padding: "12px", backgroundColor: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "6px", display: "flex", alignItems: "center", gap: "12px", fontSize: "0.875rem" }}>
          <span>Ștergi ruta <strong>{deleteTarget.name}</strong>?</span>
          <button type="button" onClick={() => void executeDelete()} style={{ padding: "4px 12px", backgroundColor: "#ef4444", color: "#fff", border: "none", borderRadius: "4px", cursor: "pointer" }}>Șterge</button>
          <button type="button" onClick={cancelDelete} style={{ padding: "4px 12px", border: "1px solid #d1d5db", borderRadius: "4px", cursor: "pointer" }}>Anulează</button>
        </div>
      )}

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* LEFT PANEL */}
        <div style={{ width: "40%", overflowY: "auto", padding: "16px", borderRight: "1px solid #e5e7eb", display: "flex", flexDirection: "column", gap: "12px" }}>
          <RoutesFilter
            filter={filter}
            onChange={setFilter}
            onReset={() => setFilter(EMPTY_FILTER)}
            transporters={transporters}
          />

          {selectedRoute && !drawerOpen ? (
            <RouteDetailPanel
              route={selectedRoute}
              onClose={() => setSelectedRouteId(null)}
              onEdit={openEdit}
            />
          ) : (
            <RoutesList
              routes={filteredRoutes}
              selectedRouteId={selectedRouteId}
              onSelect={setSelectedRouteId}
              onEdit={openEdit}
              onDelete={confirmDelete}
              onAdd={openCreate}
            />
          )}
        </div>

        {/* RIGHT PANEL — MAP */}
        <div style={{ flex: 1, position: "relative" }}>
          <RoutesMap
            routes={filteredRoutes}
            selectedRouteId={selectedRouteId}
            onRouteSelect={(id) => {
              setSelectedRouteId(id);
            }}
            interactive
            height="100%"
          />
        </div>
      </div>

      <RouteFormDrawer
        open={drawerOpen}
        route={editingRoute}
        onClose={closeDrawer}
        onSave={handleSave}
      />
    </div>
  );
}
