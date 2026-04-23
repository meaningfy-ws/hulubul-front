import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Faq } from "@/components/landing/Faq";
import { landingPageFixture } from "@/tests/msw/fixtures/landing-page";

describe("<Faq>", () => {
  it("renders every question as a details/summary row", () => {
    const { container } = render(<Faq data={landingPageFixture.faq} />);
    const summaries = container.querySelectorAll("details.faq-row > summary");
    expect(summaries).toHaveLength(landingPageFixture.faq.items.length);
    const labels = Array.from(summaries, (s) => s.textContent);
    for (const item of landingPageFixture.faq.items) {
      expect(labels).toContain(item.question);
    }
  });

  it("renders inline markdown links inside the answer", () => {
    render(<Faq data={landingPageFixture.faq} />);
    // first fixture item: "A1 with [link](#map)"
    const link = screen.getByRole("link", { name: "link" });
    expect(link).toHaveAttribute("href", "#map");
  });

  it("renders the split-title headline with trail", () => {
    render(<Faq data={landingPageFixture.faq} />);
    const h2 = screen.getByRole("heading", { level: 2 });
    expect(h2.innerHTML).toContain("<em>întreabă</em>");
    expect(h2.textContent).toContain("lumea.");
  });
});
