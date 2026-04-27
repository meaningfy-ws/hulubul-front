import { beforeEach, describe, expect, it, vi } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { TEST_STRAPI_URL } from "@/tests/msw/handlers";
import { routeFixtures, transporterFixtures } from "@/tests/msw/fixtures/routes";
import {
  getRoutes,
  getRoute,
  createRoute,
  updateRoute,
  deleteRoute,
  getTransporters,
} from "@/lib/routes-api";

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_STRAPI_URL", TEST_STRAPI_URL);
  vi.stubEnv("STRAPI_API_TOKEN", "test-token");
});

describe("getRoutes", () => {
  it("returns route array on 200", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/routes`, () =>
        HttpResponse.json({ data: routeFixtures, meta: {} }),
      ),
    );
    const routes = await getRoutes();
    expect(routes).toHaveLength(3);
    expect(routes[0]!.name).toBe("Luxembourg → Chișinău");
  });

  it("sends the Authorization header", async () => {
    let auth: string | null = null;
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/routes`, ({ request }) => {
        auth = request.headers.get("authorization");
        return HttpResponse.json({ data: [], meta: {} });
      }),
    );
    await getRoutes();
    expect(auth).toBe("Bearer test-token");
  });

  it("throws on non-ok response", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/routes`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    await expect(getRoutes()).rejects.toThrow(/500/);
  });
});

describe("getRoute", () => {
  it("returns a single route by documentId with populated data", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/routes/r1`, () =>
        HttpResponse.json({ data: routeFixtures[0]! }),
      ),
    );
    const route = await getRoute("r1");
    expect(route.documentId).toBe("r1");
    expect(route.schedules).toHaveLength(1);
  });
});

describe("createRoute", () => {
  it("POSTs { data: payload } and returns created route", async () => {
    let body: unknown = null;
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/routes`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: routeFixtures[0]! }, { status: 201 });
      }),
    );
    const payload = { name: "Lux → Chi", citiesText: "Luxembourg, Chișinău", status: "approved" as const };
    await createRoute(payload);
    expect(body).toEqual({ data: payload });
  });

  it("throws on 403", async () => {
    server.use(
      http.post(`${TEST_STRAPI_URL}/api/routes`, () =>
        HttpResponse.json({}, { status: 403 }),
      ),
    );
    await expect(
      createRoute({ name: "X", citiesText: "A, B", status: "approved" }),
    ).rejects.toThrow(/403/);
  });
});

describe("updateRoute", () => {
  it("PUTs { data: payload } to /api/routes/:documentId", async () => {
    let body: unknown = null;
    server.use(
      http.put(`${TEST_STRAPI_URL}/api/routes/r1`, async ({ request }) => {
        body = await request.json();
        return HttpResponse.json({ data: routeFixtures[0]! });
      }),
    );
    await updateRoute("r1", { name: "Updated" });
    expect(body).toEqual({ data: { name: "Updated" } });
  });
});

describe("deleteRoute", () => {
  it("sends DELETE to /api/routes/:documentId", async () => {
    let called = false;
    server.use(
      http.delete(`${TEST_STRAPI_URL}/api/routes/r1`, () => {
        called = true;
        return HttpResponse.json({}, { status: 200 });
      }),
    );
    await deleteRoute("r1");
    expect(called).toBe(true);
  });

  it("throws on 403", async () => {
    server.use(
      http.delete(`${TEST_STRAPI_URL}/api/routes/r1`, () =>
        HttpResponse.json({}, { status: 403 }),
      ),
    );
    await expect(deleteRoute("r1")).rejects.toThrow(/403/);
  });
});

describe("getTransporters", () => {
  it("returns transporter array", async () => {
    server.use(
      http.get(`${TEST_STRAPI_URL}/api/transporters`, () =>
        HttpResponse.json({ data: transporterFixtures, meta: {} }),
      ),
    );
    const transporters = await getTransporters();
    expect(transporters).toHaveLength(2);
    expect(transporters[0]!.name).toBe("Ion Transport SRL");
  });
});
