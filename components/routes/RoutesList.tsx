"use client";

import type { Route } from "@/lib/routes-types";
import { RouteStatusBadge } from "./RouteStatusBadge";

interface Props {
  routes: Route[];
  selectedRouteId?: number | null;
  onSelect: (id: number) => void;
  onEdit?: (route: Route) => void;
  onDelete?: (route: Route) => void;
  onAdd?: () => void;
  readonly?: boolean;
}

export function RoutesList({ routes, selectedRouteId, onSelect, onEdit, onDelete, onAdd, readonly }: Props) {
  if (routes.length === 0) {
    return (
      <div style={{ padding: "24px 0", textAlign: "center", color: "#6b7280", fontSize: "0.875rem" }}>
        <p style={{ margin: "0 0 12px" }}>Nicio rută corespunde filtrelor selectate.</p>
        {!readonly && onAdd && (
          <button
            type="button"
            onClick={onAdd}
            style={{ padding: "8px 16px", backgroundColor: "#1d4ed8", color: "#fff", border: "none", borderRadius: "6px", fontWeight: 600, cursor: "pointer", fontSize: "0.875rem" }}
          >
            + Adaugă prima rută
          </button>
        )}
      </div>
    );
  }

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
          <th style={{ textAlign: "left", padding: "8px 4px", fontWeight: 600 }}>Rută</th>
          <th style={{ textAlign: "left", padding: "8px 4px", fontWeight: 600 }}>Orașe</th>
          <th style={{ textAlign: "left", padding: "8px 4px", fontWeight: 600 }}>Status</th>
          {!readonly && (
            <th style={{ textAlign: "right", padding: "8px 4px" }} />
          )}
        </tr>
      </thead>
      <tbody>
        {routes.map((route) => (
          <tr
            key={route.id}
            onClick={() => onSelect(route.id)}
            aria-selected={route.id === selectedRouteId}
            style={{
              cursor: "pointer",
              borderBottom: "1px solid #f3f4f6",
              backgroundColor: route.id === selectedRouteId ? "#eff6ff" : "transparent",
            }}
          >
            <td style={{ padding: "8px 4px", fontWeight: 500 }}>
              {route.name}
              {!route.geoJson && (
                <span
                  title="Geocodificare lipsă"
                  style={{ marginLeft: "6px", color: "#f59e0b", fontSize: "0.75rem" }}
                >
                  ⚠ fără coordonate
                </span>
              )}
            </td>
            <td style={{ padding: "8px 4px", color: "#6b7280", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {route.citiesText}
            </td>
            <td style={{ padding: "8px 4px" }}>
              <RouteStatusBadge status={route.status} />
            </td>
            {!readonly && (
              <td style={{ padding: "8px 4px", textAlign: "right", whiteSpace: "nowrap" }}>
                <button
                  type="button"
                  aria-label={`Editează ${route.name}`}
                  onClick={(e) => { e.stopPropagation(); onEdit?.(route); }}
                  style={{ marginRight: "8px", fontSize: "0.75rem", padding: "2px 8px", cursor: "pointer" }}
                >
                  Editează
                </button>
                <button
                  type="button"
                  aria-label={`Șterge ${route.name}`}
                  onClick={(e) => { e.stopPropagation(); onDelete?.(route); }}
                  style={{ fontSize: "0.75rem", padding: "2px 8px", cursor: "pointer", color: "#ef4444" }}
                >
                  Șterge
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
