"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef } from "react";
import type { Route } from "@/lib/routes-types";

// Visually distinct palette — each route gets a stable colour derived from its id
const ROUTE_PALETTE = [
  "#e63946", // red
  "#2a9d8f", // teal
  "#e9c46a", // amber
  "#457b9d", // steel blue
  "#f4a261", // orange
  "#6a4c93", // purple
  "#2dc653", // green
  "#ff6b6b", // coral
  "#4ecdc4", // turquoise
  "#c77dff", // violet
  "#fb8500", // deep orange
  "#0077b6", // ocean blue
];

function routeColor(id: number): string {
  return ROUTE_PALETTE[id % ROUTE_PALETTE.length]!;
}

interface Props {
  routes: Route[];
  selectedRouteId?: number | null;
  onRouteSelect?: (id: number) => void;
  interactive?: boolean;
  height?: string;
}

export function RoutesMap({ routes, selectedRouteId, onRouteSelect, interactive = true, height = "500px" }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polylinesRef = useRef<Map<number, any>>(new Map());

  useEffect(() => {
    if (!containerRef.current) return;
    // Leaflet must be imported dynamically — it requires window
    let L: typeof import("leaflet");
    let cancelled = false;

    void import("leaflet").then((mod) => {
      if (cancelled || !containerRef.current) return;
      L = mod.default ?? mod;

      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }

      const map = L.map(containerRef.current).setView([47, 15], 5);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
      }).addTo(map);

      polylinesRef.current.clear();

      routes.forEach((route) => {
        if (!route.geoJson || route.geoJson.coordinates.length < 2) return;
        // GeoJSON is [lon, lat] — Leaflet expects [lat, lon]
        const latLngs = route.geoJson.coordinates.map(
          ([lon, lat]) => [lat, lon] as [number, number],
        );
        const color = routeColor(route.id);
        const weight = route.id === selectedRouteId ? 6 : 4;
        const polyline = L.polyline(latLngs, { color, weight })
          .addTo(map)
          .bindTooltip(route.name);

        if (interactive && onRouteSelect) {
          polyline.on("click", () => onRouteSelect(route.id));
        }
        polylinesRef.current.set(route.id, polyline);
      });
    });

    return () => {
      cancelled = true;
    };
  // Re-render when routes or selection changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, selectedRouteId, interactive]);

  // Update polyline weights when selection changes without full re-init
  useEffect(() => {
    polylinesRef.current.forEach((polyline, id) => {
      polyline.setStyle?.({ weight: id === selectedRouteId ? 6 : 4 });
    });
  }, [selectedRouteId]);

  return (
    <div
      ref={containerRef}
      data-testid="routes-map"
      style={{ height, width: "100%" }}
    />
  );
}
