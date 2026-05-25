import { beforeEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { NavCta } from "@/components/landing/NavCta";
import { REMEMBER_STORAGE_KEY } from "@/lib/remember-me";

beforeEach(() => {
  window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
});

describe("<NavCta>", () => {
  it("renders the fallback CTA link when no remembered identity exists", () => {
    render(<NavCta ctaLabel="Mă înscriu" ctaHref="#signup" />);
    const link = screen.getByRole("link", { name: "Mă înscriu" });
    // Bare anchors get prefixed with `/` so the CTA also works on routes
    // other than the landing page (e.g. /sondaj) where `#signup` is a no-op.
    expect(link).toHaveAttribute("href", "/#signup");
  });

  it("passes through absolute hrefs unchanged", () => {
    render(<NavCta ctaLabel="Mă înscriu" ctaHref="/#signup" />);
    expect(
      screen.getByRole("link", { name: "Mă înscriu" }),
    ).toHaveAttribute("href", "/#signup");
  });

  it("shows a greeting alongside the CTA after the remembered identity loads", async () => {
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        name: "Ion Popescu",
        email: "ion@example.com",
        savedAt: new Date().toISOString(),
      }),
    );
    render(<NavCta ctaLabel="Mă înscriu" ctaHref="#signup" />);
    await waitFor(() =>
      expect(screen.getByText(/bună, ion/i)).toBeInTheDocument(),
    );
    // The CTA stays visible alongside the greeting — visitors can always
    // reach the donate page from the header.
    expect(
      screen.getByRole("link", { name: "Mă înscriu" }),
    ).toBeInTheDocument();
  });

  it("shows the prefilled first name alongside the CTA on first paint when the server passes prefilledFirstName", () => {
    render(
      <NavCta
        ctaLabel="Mă înscriu"
        ctaHref="#signup"
        prefilledFirstName="Alice"
      />,
    );
    // No waitFor — the greeting must be present on the very first paint so
    // there's no flicker right after the OIDC callback redirect.
    expect(screen.getByText("Bună, Alice")).toBeInTheDocument();
    // CTA stays alongside the greeting (never disappears).
    expect(
      screen.getByRole("link", { name: "Mă înscriu" }),
    ).toBeInTheDocument();
  });

  it("prefers prefilledFirstName over a different remember-me name", async () => {
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        name: "Old Name",
        email: "old@example.com",
        savedAt: new Date().toISOString(),
      }),
    );
    render(
      <NavCta
        ctaLabel="Mă înscriu"
        ctaHref="#signup"
        prefilledFirstName="New"
      />,
    );
    expect(screen.getByText("Bună, New")).toBeInTheDocument();
    // After hydration the prefill wins; remember-me does not overwrite it.
    await waitFor(() =>
      expect(screen.queryByText(/bună, old/i)).toBeNull(),
    );
  });

  it("uses only the first name (split on whitespace)", async () => {
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        name: "Ion    Popescu-Rădulescu  ",
        email: "x@y.com",
        savedAt: new Date().toISOString(),
      }),
    );
    render(<NavCta ctaLabel="Mă înscriu" ctaHref="#signup" />);
    await waitFor(() =>
      expect(screen.getByText("Bună, Ion")).toBeInTheDocument(),
    );
  });
});
