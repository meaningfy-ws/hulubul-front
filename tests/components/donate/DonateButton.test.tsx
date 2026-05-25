import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { DonateButton } from "@/components/donate/DonateButton";
import { STRIPE_DONATE_URL } from "@/lib/donate";

vi.mock("@/lib/tracking/events", () => ({
  trackEvent: vi.fn(),
}));

import { trackEvent } from "@/lib/tracking/events";

describe("<DonateButton>", () => {
  it("renders a real <a> to the Stripe Payment Link, opens in a new tab", () => {
    render(<DonateButton source="donate-page" />);
    const link = screen.getByRole("link", { name: /Donează prin Stripe/i });
    expect(link).toHaveAttribute("href", STRIPE_DONATE_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows the Romanian Stripe disclaimer by default", () => {
    render(<DonateButton source="donate-page" />);
    expect(
      screen.getByText(
        /Vei fi redirecționat către pagina securizată Stripe/i,
      ),
    ).toBeInTheDocument();
  });

  it("uses English copy when locale='en'", () => {
    render(<DonateButton source="donate-page-en" locale="en" />);
    expect(
      screen.getByRole("link", { name: /Donate via Stripe/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /You will be redirected to Stripe's secure payment page/i,
      ),
    ).toBeInTheDocument();
  });

  it("fires donate_click with the source on click", () => {
    render(<DonateButton source="footer" />);
    const link = screen.getByRole("link", { name: /Donează prin Stripe/i });
    fireEvent.click(link);
    expect(trackEvent).toHaveBeenCalledWith("donate_click", {
      source: "footer",
    });
  });
});
