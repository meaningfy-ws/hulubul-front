"use server";

import { createRoute, updateRoute, deleteRoute } from "@/lib/routes-api";
import { routePayloadSchema } from "@/lib/routes-schema";
import type { RoutePayload } from "@/lib/routes-schema";
import type { Route } from "@/lib/routes-types";

export async function createRouteAction(payload: RoutePayload): Promise<Route> {
  const parsed = routePayloadSchema.parse(payload);
  return createRoute(parsed);
}

export async function updateRouteAction(documentId: string, payload: Partial<RoutePayload>): Promise<Route> {
  return updateRoute(documentId, payload);
}

export async function deleteRouteAction(documentId: string): Promise<void> {
  return deleteRoute(documentId);
}
