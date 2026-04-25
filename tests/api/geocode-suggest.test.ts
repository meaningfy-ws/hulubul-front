import { describe, it, expect, vi, beforeEach } from "vitest";
import { http, HttpResponse } from "msw";
import { server } from "@/tests/msw/server";
import { GET } from "@/app/api/geocode-suggest/route";
import { NextRequest } from "next/server";

const PHOTON_URL = "https://photon.komoot.io";

beforeEach(() => {
  vi.stubEnv("GEO_SERVICE_URL", PHOTON_URL);
  vi.unstubAllEnvs();
  vi.stubEnv("GEO_SERVICE_URL", PHOTON_URL);
});

function makeRequest(q: string, limit = "5"): NextRequest {
  return new NextRequest(
    `http://localhost/api/geocode-suggest?q=${encodeURIComponent(q)}&limit=${limit}`,
  );
}

const photonFeature = (name: string, country: string, lon: number, lat: number) => ({
  type: "Feature",
  properties: { name, country },
  geometry: { type: "Point", coordinates: [lon, lat] },
});

describe("GET /api/geocode-suggest", () => {
  it("returns 400 when q is missing", async () => {
    const req = new NextRequest("http://localhost/api/geocode-suggest");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when q is empty string", async () => {
    const req = makeRequest("");
    const res = await GET(req);
    expect(res.status).toBe(400);
  });

  it("returns mapped suggestions on success", async () => {
    server.use(
      http.get(`${PHOTON_URL}/api/`, () =>
        HttpResponse.json({
          features: [
            photonFeature("Luxembourg", "LU", 6.1296, 49.6116),
            photonFeature("Luxeuil-les-Bains", "FR", 6.3833, 47.8167),
          ],
        }),
      ),
    );
    const res = await GET(makeRequest("Lux"));
    expect(res.status).toBe(200);
    const body = await res.json() as Array<{ name: string; country: string; lat: number; lon: number }>;
    expect(body).toHaveLength(2);
    expect(body[0]).toEqual({ name: "Luxembourg", country: "LU", lat: 49.6116, lon: 6.1296 });
  });

  it("filters out features without a name", async () => {
    server.use(
      http.get(`${PHOTON_URL}/api/`, () =>
        HttpResponse.json({
          features: [
            photonFeature("Luxembourg", "LU", 6.13, 49.61),
            { type: "Feature", properties: { country: "FR" }, geometry: { type: "Point", coordinates: [2.3, 48.8] } },
          ],
        }),
      ),
    );
    const res = await GET(makeRequest("Lux"));
    const body = await res.json() as unknown[];
    expect(body).toHaveLength(1);
  });

  it("returns 502 when upstream is unreachable", async () => {
    server.use(
      http.get(`${PHOTON_URL}/api/`, () => HttpResponse.error()),
    );
    const res = await GET(makeRequest("Lyon"));
    expect(res.status).toBe(502);
  });

  it("caps limit at 10", async () => {
    let calledUrl = "";
    server.use(
      http.get(`${PHOTON_URL}/api/`, ({ request }) => {
        calledUrl = request.url;
        return HttpResponse.json({ features: [] });
      }),
    );
    await GET(makeRequest("Lyon", "50"));
    expect(calledUrl).toContain("limit=10");
  });

  it("sends the European bbox by default", async () => {
    let calledUrl = "";
    server.use(
      http.get(`${PHOTON_URL}/api/`, ({ request }) => {
        calledUrl = request.url;
        return HttpResponse.json({ features: [] });
      }),
    );
    await GET(makeRequest("Paris"));
    expect(calledUrl).toContain("bbox=-25,34,45,72");
  });

  it("uses GEO_BBOX env var when set", async () => {
    vi.stubEnv("GEO_BBOX", "10,45,30,60");
    let calledUrl = "";
    server.use(
      http.get(`${PHOTON_URL}/api/`, ({ request }) => {
        calledUrl = request.url;
        return HttpResponse.json({ features: [] });
      }),
    );
    await GET(makeRequest("Paris"));
    expect(calledUrl).toContain("bbox=10,45,30,60");
  });
});
