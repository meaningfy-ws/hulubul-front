import { strapiFetch, throwStrapiError } from "./strapi-client";
import type { Route, Transporter, TransportType, RouteSchedule } from "./routes-types";
import type { RoutePayload } from "./routes-schema";

// Shared populate string — used by both `getRoutes` and `getRoute` so the two
// fetchers always return the same shape (previously `getRoutes` re-built it
// inline, which caused subtle drift). Custom-build only when the populate
// shape genuinely differs (e.g. `getSchedulesForRoute`).
const ROUTES_POPULATE =
  "populate[schedules][populate][transporter][populate][0]=transportTypes";

export async function getRoutes(filters?: { status?: string }): Promise<Route[]> {
  const params = new URLSearchParams();
  params.set("populate[schedules][populate][transporter][populate][0]", "transportTypes");
  if (filters?.status) params.set("filters[status][$eq]", filters.status);
  const path = `/api/routes?${params}`;
  const res = await strapiFetch(path, { mode: "fresh" });
  if (!res.ok) throwStrapiError(path, res);
  const json = (await res.json()) as { data: Route[] };
  return json.data;
}

export async function getRoute(documentId: string): Promise<Route> {
  const path = `/api/routes/${documentId}?${ROUTES_POPULATE}`;
  const res = await strapiFetch(path);
  if (!res.ok) throwStrapiError(path, res);
  const json = (await res.json()) as { data: Route };
  return json.data;
}

export async function createRoute(payload: RoutePayload): Promise<Route> {
  const path = "/api/routes";
  const res = await strapiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: payload }),
  });
  if (!res.ok) throwStrapiError(path, res);
  const json = (await res.json()) as { data: Route };
  return json.data;
}

export async function updateRoute(
  documentId: string,
  payload: Partial<RoutePayload>,
): Promise<Route> {
  const path = `/api/routes/${documentId}`;
  const res = await strapiFetch(path, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: payload }),
  });
  if (!res.ok) throwStrapiError(path, res);
  const json = (await res.json()) as { data: Route };
  return json.data;
}

export async function deleteRoute(documentId: string): Promise<void> {
  const path = `/api/routes/${documentId}`;
  const res = await strapiFetch(path, { method: "DELETE" });
  if (!res.ok) throwStrapiError(path, res);
}

export async function getSchedulesForRoute(routeId: number): Promise<RouteSchedule[]> {
  const params = new URLSearchParams();
  params.set("filters[route][id][$eq]", String(routeId));
  params.set("populate[transporter][populate][0]", "transportTypes");
  const path = `/api/route-schedules?${params}`;
  const res = await strapiFetch(path);
  if (!res.ok) throwStrapiError(path, res);
  const json = (await res.json()) as { data: RouteSchedule[] };
  return json.data;
}

export async function getTransporters(): Promise<Transporter[]> {
  const path = "/api/transporters?populate[0]=transportTypes";
  const res = await strapiFetch(path, { mode: "fresh" });
  if (!res.ok) throwStrapiError(path, res);
  const json = (await res.json()) as { data: Transporter[] };
  return json.data;
}

export async function getTransportTypes(): Promise<TransportType[]> {
  const path = "/api/transport-types";
  const res = await strapiFetch(path, { mode: "static" });
  if (!res.ok) throwStrapiError(path, res);
  const json = (await res.json()) as { data: TransportType[] };
  return json.data;
}
