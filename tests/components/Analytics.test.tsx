import { describe, it, expect, beforeEach, vi } from "vitest";
import { render } from "@testing-library/react";

vi.mock("@next/third-parties/google", () => ({
  GoogleAnalytics: ({ gaId }: { gaId: string }) => (
    <script data-testid="ga" data-ga-id={gaId} />
  ),
}));

vi.mock("next/script", () => ({
  default: ({ id, children }: { id: string; children?: string }) => (
    <script data-testid={`script-${id}`}>{children}</script>
  ),
}));

beforeEach(() => {
  delete process.env.NEXT_PUBLIC_GA_ID;
  delete process.env.NEXT_PUBLIC_META_PIXEL_ID;
  delete process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID;
});

async function renderAnalytics() {
  const mod = await import("@/components/analytics/Analytics");
  return render(<mod.Analytics />);
}

describe("Feature: third-party analytics injection", () => {
  describe("Given no analytics IDs are configured", () => {
    it("When rendered, Then no pixel scripts are emitted", async () => {
      const { queryByTestId } = await renderAnalytics();
      expect(queryByTestId("ga")).toBeNull();
      expect(queryByTestId("script-meta-pixel")).toBeNull();
      expect(queryByTestId("script-linkedin-insight")).toBeNull();
    });
  });

  describe("Given NEXT_PUBLIC_GA_ID is set", () => {
    it("When rendered, Then GoogleAnalytics is included with that ID", async () => {
      process.env.NEXT_PUBLIC_GA_ID = "G-TEST123";
      const { getByTestId } = await renderAnalytics();
      expect(getByTestId("ga").getAttribute("data-ga-id")).toBe("G-TEST123");
    });
  });

  describe("Given NEXT_PUBLIC_META_PIXEL_ID is set", () => {
    it("When rendered, Then the Meta Pixel script is emitted with that ID", async () => {
      process.env.NEXT_PUBLIC_META_PIXEL_ID = "999";
      const { getByTestId } = await renderAnalytics();
      expect(getByTestId("script-meta-pixel").textContent).toContain("fbq('init', '999')");
    });
  });

  describe("Given NEXT_PUBLIC_LINKEDIN_PARTNER_ID is set", () => {
    it("When rendered, Then the LinkedIn Insight script is emitted with that partner ID", async () => {
      process.env.NEXT_PUBLIC_LINKEDIN_PARTNER_ID = "777";
      const { getByTestId } = await renderAnalytics();
      expect(getByTestId("script-linkedin-insight").textContent).toContain(
        '_linkedin_partner_id = "777"',
      );
    });
  });
});
