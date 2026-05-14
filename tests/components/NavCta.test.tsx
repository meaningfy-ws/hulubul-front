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

  it("replaces the CTA with a greeting after the remembered identity loads", async () => {
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
    expect(screen.queryByRole("link", { name: "Mă înscriu" })).toBeNull();
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
