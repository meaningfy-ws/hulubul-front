import type { Route, RouteFilter } from "./routes-types";

export function filterRoutes(routes: Route[], filter: RouteFilter): Route[] {
  return routes.filter((route) => {
    if (filter.status !== "all" && route.status !== filter.status) return false;

    if (filter.cityQuery.trim().length > 0) {
      if (!route.citiesText.toLowerCase().includes(filter.cityQuery.toLowerCase())) {
        return false;
      }
    }

    if (filter.transporterIds.length > 0) {
      const hasTransporter = route.schedules?.some((s) =>
        filter.transporterIds.includes(s.transporter.id),
      );
      if (!hasTransporter) return false;
    }

    if (filter.frequencies.length > 0) {
      const hasFrequency = route.schedules?.some((s) =>
        filter.frequencies.includes(s.frequency),
      );
      if (!hasFrequency) return false;
    }

    if (filter.departureDays.length > 0) {
      const hasDay = route.schedules?.some((s) =>
        s.departureDays.some((d) => filter.departureDays.includes(d)),
      );
      if (!hasDay) return false;
    }

    return true;
  });
}

export function isFilterActive(filter: RouteFilter): boolean {
  return (
    filter.status !== "all" ||
    filter.cityQuery.trim().length > 0 ||
    filter.transporterIds.length > 0 ||
    filter.frequencies.length > 0 ||
    filter.departureDays.length > 0
  );
}

export function countActiveFilters(filter: RouteFilter): number {
  let count = 0;
  if (filter.status !== "all") count++;
  if (filter.cityQuery.trim().length > 0) count++;
  if (filter.transporterIds.length > 0) count++;
  if (filter.frequencies.length > 0) count++;
  if (filter.departureDays.length > 0) count++;
  return count;
}
