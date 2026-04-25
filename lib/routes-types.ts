export interface GeoJsonLineString {
  type: "LineString";
  coordinates: [number, number][]; // [lon, lat] — swap to [lat, lon] for Leaflet
}

export interface TransportType {
  id: number;
  documentId: string;
  label: string;
  slug: string;
  description: string | null;
}

export interface Transporter {
  id: number;
  documentId: string;
  name: string;
  type: "individual" | "company";
  phoneNumbers: string[];
  transportTypes: TransportType[];
  notes: string | null;
  status: "draft" | "approved" | "suspended";
  submittedBy: string | null;
  claimedBy: string | null;
}

export type Frequency = "weekly" | "biweekly" | "monthly" | "on_demand";
export type DayCode = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
export type RouteStatus = "draft" | "approved" | "suspended";

export interface RouteSchedule {
  id: number;
  documentId: string;
  transporter: Transporter;
  frequency: Frequency;
  departureDays: DayCode[];
  arrivalDays: DayCode[];
  notes: string | null;
  status: RouteStatus;
}

export interface Route {
  id: number;
  documentId: string;
  name: string;
  citiesText: string;
  geoJson: GeoJsonLineString | null;
  status: RouteStatus;
  submittedBy: string | null;
  claimedBy: string | null;
  schedules?: RouteSchedule[];
}

export interface GeocodeSuggestion {
  name: string;
  country: string;
  lat: number;
  lon: number;
}

export interface RouteFilter {
  status: "all" | RouteStatus;
  transporterIds: number[];
  cityQuery: string;
  frequencies: Frequency[];
  departureDays: DayCode[];
}

export const EMPTY_FILTER: RouteFilter = {
  status: "all",
  transporterIds: [],
  cityQuery: "",
  frequencies: [],
  departureDays: [],
};
