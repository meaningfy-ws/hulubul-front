import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Footer } from "@/components/landing/Footer";
import { landingPageFixture } from "@/tests/msw/fixtures/landing-page";

afterEach(() => vi.unstubAllEnvs());

describe("Footer build signature", () => {
  it("renders the short commit signature when NEXT_PUBLIC_BUILD_SHA is set", () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_SHA", "deadbeef1234567890");
    render(<Footer data={landingPageFixture.footer} />);
    expect(screen.getByText(/deadbee/)).toBeInTheDocument();
  });

  it("renders no signature element when the sha is unknown", () => {
    vi.stubEnv("NEXT_PUBLIC_BUILD_SHA", "");
    const { container } = render(
      <Footer data={landingPageFixture.footer} />,
    );
    expect(container.querySelector(".build-sig")).toBeNull();
  });
});
