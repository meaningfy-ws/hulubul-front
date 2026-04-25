import { describe, it, expect } from "vitest";
import { filterRoutes, isFilterActive, countActiveFilters } from "@/lib/routes-filter";
import { EMPTY_FILTER } from "@/lib/routes-types";
import type { Route, RouteFilter } from "@/lib/routes-types";

function makeRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: 1,
    documentId: "doc1",
    name: "Luxembourg → Chișinău",
    citiesText: "Luxembourg, Metz, Lyon, Chișinău",
    geoJson: null,
    status: "approved",
    submittedBy: null,
    claimedBy: null,
    schedules: [],
    ...overrides,
  };
}

const LUX_CHI = makeRoute({ id: 1, citiesText: "Luxembourg, Metz, Lyon, Chișinău" });
const PAR_BUC = makeRoute({
  id: 2,
  name: "Paris → București",
  citiesText: "Paris, Lyon, Geneva, București",
  status: "draft",
});
const FRA_IAS = makeRoute({
  id: 3,
  name: "Frankfurt → Iași",
  citiesText: "Frankfurt, Innsbruck, Trieste, Iași",
  status: "suspended",
  schedules: [
    {
      id: 10,
      documentId: "sch10",
      transporter: {
        id: 99,
        documentId: "t99",
        name: "Ion Transport",
        type: "individual",
        phoneNumbers: ["+37369000000"],
        transportTypes: [],
        notes: null,
        status: "approved",
        submittedBy: null,
        claimedBy: null,
      },
      frequency: "weekly",
      departureDays: ["wed"],
      arrivalDays: ["thu"],
      notes: null,
      status: "approved",
    },
  ],
});

const ALL = [LUX_CHI, PAR_BUC, FRA_IAS];

describe("filterRoutes — status", () => {
  it("returns all when status is 'all'", () => {
    expect(filterRoutes(ALL, EMPTY_FILTER)).toHaveLength(3);
  });

  it("filters to approved only", () => {
    const result = filterRoutes(ALL, { ...EMPTY_FILTER, status: "approved" });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(1);
  });

  it("filters to draft only", () => {
    const result = filterRoutes(ALL, { ...EMPTY_FILTER, status: "draft" });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(2);
  });
});

describe("filterRoutes — city query", () => {
  it("matches routes containing the query city", () => {
    const result = filterRoutes(ALL, { ...EMPTY_FILTER, cityQuery: "Lyon" });
    const ids = result.map((r) => r.id);
    expect(ids).toContain(1); // Luxembourg → Chișinău via Lyon
    expect(ids).toContain(2); // Paris → București via Lyon
    expect(ids).not.toContain(3);
  });

  it("is case-insensitive", () => {
    const result = filterRoutes(ALL, { ...EMPTY_FILTER, cityQuery: "lyon" });
    expect(result).toHaveLength(2);
  });

  it("returns all when cityQuery is empty", () => {
    expect(filterRoutes(ALL, { ...EMPTY_FILTER, cityQuery: "" })).toHaveLength(3);
  });

  it("returns all when cityQuery is whitespace only", () => {
    expect(filterRoutes(ALL, { ...EMPTY_FILTER, cityQuery: "   " })).toHaveLength(3);
  });
});

describe("filterRoutes — transporter", () => {
  it("keeps routes served by the selected transporter", () => {
    const result = filterRoutes(ALL, { ...EMPTY_FILTER, transporterIds: [99] });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(3);
  });

  it("returns nothing when no route has the transporter", () => {
    const result = filterRoutes(ALL, { ...EMPTY_FILTER, transporterIds: [999] });
    expect(result).toHaveLength(0);
  });

  it("returns all when transporterIds is empty", () => {
    expect(filterRoutes(ALL, { ...EMPTY_FILTER, transporterIds: [] })).toHaveLength(3);
  });
});

describe("filterRoutes — frequency", () => {
  it("keeps routes with a matching schedule frequency", () => {
    const result = filterRoutes(ALL, { ...EMPTY_FILTER, frequencies: ["weekly"] });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(3);
  });

  it("returns nothing when no route has the frequency", () => {
    expect(
      filterRoutes(ALL, { ...EMPTY_FILTER, frequencies: ["monthly"] }),
    ).toHaveLength(0);
  });
});

describe("filterRoutes — departure days", () => {
  it("keeps routes departing on selected day", () => {
    const result = filterRoutes(ALL, { ...EMPTY_FILTER, departureDays: ["wed"] });
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(3);
  });

  it("returns nothing when no route departs on the selected day", () => {
    expect(
      filterRoutes(ALL, { ...EMPTY_FILTER, departureDays: ["sun"] }),
    ).toHaveLength(0);
  });
});

describe("filterRoutes — AND combination", () => {
  it("applies all conditions together", () => {
    // status=suspended AND city=Frankfurt AND transporter=99 AND freq=weekly AND day=wed
    const filter: RouteFilter = {
      status: "suspended",
      cityQuery: "Frankfurt",
      transporterIds: [99],
      frequencies: ["weekly"],
      departureDays: ["wed"],
    };
    const result = filterRoutes(ALL, filter);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe(3);
  });

  it("returns empty when one condition fails", () => {
    const filter: RouteFilter = {
      ...EMPTY_FILTER,
      status: "approved",  // LUX_CHI is approved
      transporterIds: [99], // but LUX_CHI has no schedules → 0 match
    };
    expect(filterRoutes(ALL, filter)).toHaveLength(0);
  });
});

describe("isFilterActive", () => {
  it("returns false for empty filter", () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
  });

  it("returns true when any field is non-default", () => {
    expect(isFilterActive({ ...EMPTY_FILTER, status: "approved" })).toBe(true);
    expect(isFilterActive({ ...EMPTY_FILTER, cityQuery: "Lyon" })).toBe(true);
    expect(isFilterActive({ ...EMPTY_FILTER, frequencies: ["weekly"] })).toBe(true);
  });
});

describe("countActiveFilters", () => {
  it("returns 0 for empty filter", () => {
    expect(countActiveFilters(EMPTY_FILTER)).toBe(0);
  });

  it("counts each active dimension", () => {
    const f: RouteFilter = {
      status: "approved",
      cityQuery: "Lyon",
      transporterIds: [1],
      frequencies: ["weekly"],
      departureDays: ["mon"],
    };
    expect(countActiveFilters(f)).toBe(5);
  });
});
