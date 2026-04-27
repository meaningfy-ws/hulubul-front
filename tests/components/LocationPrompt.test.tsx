import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LocationPrompt } from "@/components/landing/LocationPrompt";

const originalGeo = navigator.geolocation;

function mockGeoSuccess() {
  Object.defineProperty(navigator, "geolocation", {
    value: {
      getCurrentPosition: (ok: PositionCallback) => {
        ok({
          coords: { latitude: 49.6, longitude: 6.1, accuracy: 30 },
        } as GeolocationPosition);
      },
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    },
    configurable: true,
  });
}

function mockGeoDenied() {
  Object.defineProperty(navigator, "geolocation", {
    value: {
      getCurrentPosition: (_ok: PositionCallback, err?: PositionErrorCallback) => {
        err?.({ code: 1, message: "denied" } as GeolocationPositionError);
      },
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    },
    configurable: true,
  });
}

afterEach(() => {
  Object.defineProperty(navigator, "geolocation", {
    value: originalGeo,
    configurable: true,
  });
});

describe("Feature: location consent prompt", () => {
  describe("Given the prompt has just rendered", () => {
    it("When inspected, Then both Da/Nu buttons appear", () => {
      render(<LocationPrompt onChange={() => {}} />);
      expect(screen.getByText(/locația ta aproximativă/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /da, partajează/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /nu, ascunde/i })).toBeInTheDocument();
    });
  });

  describe("Given the user clicks 'Da, partajează' and the browser grants", () => {
    it("When the geolocation resolves, Then onChange emits granted + a Location", async () => {
      mockGeoSuccess();
      const onChange = vi.fn();
      render(<LocationPrompt onChange={onChange} />);
      await userEvent.click(screen.getByRole("button", { name: /da, partajează/i }));
      await waitFor(() =>
        expect(onChange).toHaveBeenLastCalledWith({
          consent: "granted",
          location: {
            source: "geolocation",
            lat: 49.6,
            lon: 6.1,
            accuracyMeters: 30,
          },
        }),
      );
    });
  });

  describe("Given the user clicks 'Nu, ascunde'", () => {
    it("When clicked, Then onChange emits denied + null", async () => {
      const onChange = vi.fn();
      render(<LocationPrompt onChange={onChange} />);
      await userEvent.click(screen.getByRole("button", { name: /nu, ascunde/i }));
      expect(onChange).toHaveBeenLastCalledWith({ consent: "denied", location: null });
    });
  });

  describe("Given the browser denies the permission", () => {
    it("When the geolocation rejects, Then onChange emits denied + null", async () => {
      mockGeoDenied();
      const onChange = vi.fn();
      render(<LocationPrompt onChange={onChange} />);
      await userEvent.click(screen.getByRole("button", { name: /da, partajează/i }));
      await waitFor(() =>
        expect(onChange).toHaveBeenLastCalledWith({ consent: "denied", location: null }),
      );
    });
  });

  describe("Given a previously granted state", () => {
    it("When the user clicks 'Ascunde' on the chip, Then onChange reverts to denied", async () => {
      mockGeoSuccess();
      const onChange = vi.fn();
      render(<LocationPrompt onChange={onChange} />);
      await userEvent.click(screen.getByRole("button", { name: /da, partajează/i }));
      await waitFor(() => screen.getByRole("button", { name: /^ascunde$/i }));
      await userEvent.click(screen.getByRole("button", { name: /^ascunde$/i }));
      expect(onChange).toHaveBeenLastCalledWith({ consent: "denied", location: null });
    });
  });
});
