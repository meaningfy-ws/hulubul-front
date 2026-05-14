import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";

// Capture the callback passed to useReportWebVitals so we can invoke it.
let captured: ((metric: unknown) => void) | null = null;
vi.mock("next/web-vitals", () => ({
  useReportWebVitals: (cb: (m: unknown) => void) => {
    captured = cb;
  },
}));

import { WebVitalsReporter } from "@/components/analytics/WebVitalsReporter";

beforeEach(() => {
  captured = null;
  delete (window as { dataLayer?: unknown[] }).dataLayer;
});

afterEach(() => {
  delete (window as { dataLayer?: unknown[] }).dataLayer;
});

describe("<WebVitalsReporter>", () => {
  it("registers a useReportWebVitals callback on mount", () => {
    render(<WebVitalsReporter />);
    expect(captured).toBeTypeOf("function");
  });

  it("forwards a metric to dataLayer as a 'cwv' event with the metric fields", () => {
    render(<WebVitalsReporter />);
    captured!({
      name: "LCP",
      value: 1234.5,
      rating: "good",
      id: "abc-1",
    });
    const last = window.dataLayer![window.dataLayer!.length - 1] as unknown[];
    expect(last[1]).toBe("cwv");
    expect(last[2]).toMatchObject({
      name: "LCP",
      value: 1234.5,
      rating: "good",
      id: "abc-1",
    });
  });
});
