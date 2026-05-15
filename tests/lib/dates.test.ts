import { describe, expect, it } from "vitest";
import { formatRoDate } from "@/lib/dates";

describe("formatRoDate", () => {
  it("formats an ISO date as a Romanian long date", () => {
    expect(formatRoDate("2026-05-14")).toBe("14 mai 2026");
  });

  it("accepts a full ISO timestamp", () => {
    expect(formatRoDate("2026-04-23T08:30:00.000Z")).toBe("23 aprilie 2026");
  });

  it("returns the trimmed input unchanged when it isn't a valid date (never 'Invalid Date')", () => {
    expect(formatRoDate("  14 mai 2026  ")).toBe("14 mai 2026");
    expect(formatRoDate("not-a-date")).toBe("not-a-date");
  });

  it("returns empty string for empty/missing input", () => {
    expect(formatRoDate("")).toBe("");
    expect(formatRoDate(undefined)).toBe("");
    expect(formatRoDate(null)).toBe("");
  });
});
