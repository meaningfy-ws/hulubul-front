import type { Route, Transporter, TransportType, RouteSchedule } from "./routes-types";
import type { RoutePayload } from "./routes-schema";

function strapiUrl(): string {
  const url = process.env.NEXT_PUBLIC_STRAPI_URL;
  if (!url) throw new Error("NEXT_PUBLIC_STRAPI_URL is not set");
  return url.replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const token = process.env.STRAPI_API_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const ROUTES_POPULATE =
  "populate[schedules][populate][transporter][populate][0]=transportTypes";

export async function getRoutes(filters?: { status?: string }): Promise<Route[]> {
  const params = new URLSearchParams();
  params.set("populate[schedules][populate][transporter][populate][0]", "transportTypes");
  if (filters?.status) {
    params.set("filters[status][$eq]", filters.status);
  }
  const res = await fetch(`${strapiUrl()}/api/routes?${params}`, {
    headers: authHeaders(),
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`GET /api/routes failed: ${res.status}`);
  const json = (await res.json()) as { data: Route[] };
  return json.data;
}

export async function getRoute(documentId: string): Promise<Route> {
  const res = await fetch(`${strapiUrl()}/api/routes/${documentId}?${ROUTES_POPULATE}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET /api/routes/${documentId} failed: ${res.status}`);
  const json = (await res.json()) as { data: Route };
  return json.data;
}

export async function createRoute(payload: RoutePayload): Promise<Route> {
  const res = await fetch(`${strapiUrl()}/api/routes`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ data: payload }),
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403)
    throw new Error(`Strapi refused route creation (${res.status}). Check STRAPI_API_TOKEN.`);
  if (!res.ok) throw new Error(`POST /api/routes failed: ${res.status}`);
  const json = (await res.json()) as { data: Route };
  return json.data;
}

export async function updateRoute(documentId: string, payload: Partial<RoutePayload>): Promise<Route> {
  const res = await fetch(`${strapiUrl()}/api/routes/${documentId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({ data: payload }),
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403)
    throw new Error(`Strapi refused route update (${res.status}). Check STRAPI_API_TOKEN.`);
  if (!res.ok) throw new Error(`PUT /api/routes/${documentId} failed: ${res.status}`);
  const json = (await res.json()) as { data: Route };
  return json.data;
}

export async function deleteRoute(documentId: string): Promise<void> {
  const res = await fetch(`${strapiUrl()}/api/routes/${documentId}`, {
    method: "DELETE",
    headers: authHeaders(),
    cache: "no-store",
  });
  if (res.status === 401 || res.status === 403)
    throw new Error(`Strapi refused route deletion (${res.status}). Check STRAPI_API_TOKEN.`);
  if (!res.ok) throw new Error(`DELETE /api/routes/${documentId} failed: ${res.status}`);
}

export async function getSchedulesForRoute(routeId: number): Promise<RouteSchedule[]> {
  const params = new URLSearchParams();
  params.set("filters[route][id][$eq]", String(routeId));
  params.set("populate[transporter][populate][0]", "transportTypes");
  const res = await fetch(`${strapiUrl()}/api/route-schedules?${params}`, {
    headers: authHeaders(),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GET /api/route-schedules failed: ${res.status}`);
  const json = (await res.json()) as { data: RouteSchedule[] };
  return json.data;
}

export async function getTransporters(): Promise<Transporter[]> {
  const res = await fetch(
    `${strapiUrl()}/api/transporters?populate[0]=transportTypes`,
    { headers: authHeaders(), next: { revalidate: 60 } },
  );
  if (!res.ok) throw new Error(`GET /api/transporters failed: ${res.status}`);
  const json = (await res.json()) as { data: Transporter[] };
  return json.data;
}

export async function getTransportTypes(): Promise<TransportType[]> {
  const res = await fetch(`${strapiUrl()}/api/transport-types`, {
    headers: authHeaders(),
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`GET /api/transport-types failed: ${res.status}`);
  const json = (await res.json()) as { data: TransportType[] };
  return json.data;
}
