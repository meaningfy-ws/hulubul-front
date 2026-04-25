import { NextRequest, NextResponse } from "next/server";
import type { GeocodeSuggestion } from "@/lib/routes-types";

function geoConfig() {
  return {
    serviceUrl: (process.env.GEO_SERVICE_URL ?? "https://photon.komoot.io").replace(/\/$/, ""),
    token: process.env.GEO_SERVICE_TOKEN ?? null,
    // Bounding box constraining results to Europe: minLon,minLat,maxLon,maxLat
    bbox: process.env.GEO_BBOX ?? "-25,34,45,72",
  };
}

interface PhotonFeature {
  properties: {
    name?: string;
    country?: string;
    city?: string;
    state?: string;
  };
  geometry: {
    coordinates: [number, number]; // [lon, lat]
  };
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim() ?? "";
  const limit = Math.min(Number(searchParams.get("limit") ?? "5"), 10);

  if (!q) {
    return NextResponse.json({ error: "q is required" }, { status: 400 });
  }

  const { serviceUrl, token, bbox } = geoConfig();
  const url = `${serviceUrl}/api/?q=${encodeURIComponent(q)}&limit=${limit}&lang=en&bbox=${bbox}`;
  const headers: Record<string, string> = {
    "User-Agent": "hulubul.com/1.0 (contact@hulubul.com)",
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let upstream: Response;
  try {
    upstream = await fetch(url, { headers });
  } catch {
    return NextResponse.json({ error: "Geocoding service unavailable" }, { status: 502 });
  }

  if (!upstream.ok) {
    return NextResponse.json({ error: "Geocoding service error" }, { status: 502 });
  }

  const data = (await upstream.json()) as { features?: PhotonFeature[] };
  const features = data.features ?? [];

  const suggestions: GeocodeSuggestion[] = features
    .filter((f) => f.properties.name)
    .map((f) => ({
      name: f.properties.name ?? f.properties.city ?? "",
      country: f.properties.country ?? "",
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
    }));

  return NextResponse.json(suggestions);
}
