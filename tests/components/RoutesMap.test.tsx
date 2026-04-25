import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { RoutesMap } from "@/components/routes/RoutesMap";
import { routeFixtures } from "@/tests/msw/fixtures/routes";

// Leaflet cannot run in jsdom — mock the module
vi.mock("leaflet", () => {
  const mockPolyline = {
    addTo: vi.fn().mockReturnThis(),
    bindTooltip: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    setStyle: vi.fn().mockReturnThis(),
  };
  const mockTileLayer = { addTo: vi.fn().mockReturnThis() };
  const mockMap = {
    setView: vi.fn().mockReturnThis(),
    remove: vi.fn(),
  };
  return {
    default: {
      map: vi.fn(() => mockMap),
      tileLayer: vi.fn(() => mockTileLayer),
      polyline: vi.fn(() => mockPolyline),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

describe("<RoutesMap>", () => {
  it("renders a container div with data-testid", () => {
    render(<RoutesMap routes={routeFixtures} />);
    expect(screen.getByTestId("routes-map")).toBeInTheDocument();
  });

  it("applies the height prop to the container", () => {
    render(<RoutesMap routes={routeFixtures} height="300px" />);
    const el = screen.getByTestId("routes-map");
    expect(el.style.height).toBe("300px");
  });

  it("renders without crashing when routes is empty", () => {
    expect(() => render(<RoutesMap routes={[]} />)).not.toThrow();
  });

  it("renders without crashing when routes have null geoJson", () => {
    expect(() =>
      render(<RoutesMap routes={[routeFixtures[2]!]} />),
    ).not.toThrow();
  });
});
