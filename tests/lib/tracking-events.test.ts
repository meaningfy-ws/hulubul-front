import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  trackEvent,
  trackSurveySubmit,
  trackWaitlistSubmit,
} from "@/lib/tracking/events";

/** gtag.js only honors `arguments` objects; plain arrays are ignored. */
function isArgumentsObject(value: unknown): boolean {
  return Object.prototype.toString.call(value) === "[object Arguments]";
}

function lastEntry(): IArguments {
  return window.dataLayer![window.dataLayer!.length - 1] as IArguments;
}

beforeEach(() => {
  delete (window as { dataLayer?: unknown[] }).dataLayer;
});

afterEach(() => {
  delete (window as { dataLayer?: unknown[] }).dataLayer;
  vi.restoreAllMocks();
});

describe("trackEvent", () => {
  it("pushes an event to dataLayer when GA4 is loaded", () => {
    window.dataLayer = [];
    trackEvent("test_event", { foo: "bar" });
    const last = lastEntry();
    expect(isArgumentsObject(last)).toBe(true);
    expect(Array.isArray(last)).toBe(false);
    expect(last[0]).toBe("event");
    expect(last[1]).toBe("test_event");
    expect(last[2]).toMatchObject({ foo: "bar" });
  });

  it("is a no-op when window.dataLayer is undefined", () => {
    expect(() => trackEvent("test_event")).not.toThrow();
  });

  it("creates dataLayer if absent (so future GA4 mount captures the event)", () => {
    trackEvent("buffered_event");
    expect(Array.isArray(window.dataLayer)).toBe(true);
    expect(window.dataLayer).toHaveLength(1);
  });
});

describe("trackWaitlistSubmit", () => {
  it("pushes a waitlist_submit event with role + source + event_id", () => {
    window.dataLayer = [];
    trackWaitlistSubmit("expeditor", "landing", "uuid-1");
    const last = lastEntry();
    expect(isArgumentsObject(last)).toBe(true);
    expect(last[1]).toBe("waitlist_submit");
    expect(last[2]).toMatchObject({
      role: "expeditor",
      source: "landing",
      event_id: "uuid-1",
    });
  });
});

describe("trackSurveySubmit", () => {
  it("pushes a survey_submit event with role + source + event_id", () => {
    window.dataLayer = [];
    trackSurveySubmit("transportator", "standalone", "uuid-2");
    const last = lastEntry();
    expect(isArgumentsObject(last)).toBe(true);
    expect(last[1]).toBe("survey_submit");
    expect(last[2]).toMatchObject({
      role: "transportator",
      source: "standalone",
      event_id: "uuid-2",
    });
  });
});
