import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SplitTitle } from "@/components/landing/SplitTitle";

describe("SplitTitle", () => {
  it("wraps the emphasis in <em> and joins with a space", () => {
    render(<SplitTitle as="h1" lead="Trimite un colet acasă," emphasis="fără bătăi de cap." />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.innerHTML).toBe(
      "Trimite un colet acasă, <em>fără bătăi de cap.</em>",
    );
  });

  it("appends an optional trail outside the <em>", () => {
    render(
      <SplitTitle
        as="h2"
        lead="Intră pe listă, fii"
        emphasis="primul"
        trail=" anunțat."
      />,
    );
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2.innerHTML).toBe("Intră pe listă, fii <em>primul</em> anunțat.");
  });

  it("defaults to h2 when no tag is given", () => {
    render(<SplitTitle lead="Lead" emphasis="em" />);
    expect(screen.getByRole("heading", { level: 2 })).toBeInTheDocument();
  });

  it("applies className", () => {
    render(<SplitTitle as="h1" lead="L" emphasis="E" className="hero-title" />);
    const el = screen.getByRole("heading", { level: 1 });
    expect(el).toHaveClass("hero-title");
  });
});
