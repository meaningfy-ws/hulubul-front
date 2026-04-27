import { describe, it, expect, vi, afterEach } from "vitest";
import { requestLocation } from "@/lib/geolocation";

const originalGeolocation = navigator.geolocation;

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", {
    value: originalGeolocation,
    configurable: true,
  });
});

function mockGeo(impl: Geolocation["getCurrentPosition"]) {
  Object.defineProperty(navigator, "geolocation", {
    value: { getCurrentPosition: impl, watchPosition: vi.fn(), clearWatch: vi.fn() },
    configurable: true,
  });
}

describe("Feature: browser geolocation request", () => {
  describe("Given the browser grants the location", () => {
    it("When requestLocation runs, Then it resolves to a LocationGranted with coords", async () => {
      mockGeo((onSuccess) => {
        onSuccess({
          coords: { latitude: 49.6, longitude: 6.1, accuracy: 32 },
        } as GeolocationPosition);
      });
      const result = await requestLocation();
      expect(result).toEqual({
        source: "geolocation",
        lat: 49.6,
        lon: 6.1,
        accuracyMeters: 32,
      });
    });
  });

  describe("Given the user denies the permission prompt", () => {
    it("When requestLocation runs, Then it resolves to null", async () => {
      mockGeo((_ok, onError) => {
        onError?.({ code: 1, message: "denied" } as GeolocationPositionError);
      });
      expect(await requestLocation()).toBeNull();
    });
  });

  describe("Given the geolocation API is unavailable", () => {
    it("When requestLocation runs, Then it resolves to null without throwing", async () => {
      Object.defineProperty(navigator, "geolocation", {
        value: undefined,
        configurable: true,
      });
      expect(await requestLocation()).toBeNull();
    });
  });
});
