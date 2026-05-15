import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { CityTagInput } from "@/components/routes/CityTagInput";

describe("CityTagInput inputId", () => {
  it("applies inputId as the id of the primary text input", () => {
    render(<CityTagInput value={[]} onChange={vi.fn()} inputId="waitlist-cities" />);
    const el = document.getElementById("waitlist-cities");
    expect(el).not.toBeNull();
    expect(el!.tagName).toBe("INPUT");
  });

  it("renders no element id when inputId is omitted (back-compat)", () => {
    const { container } = render(
      <CityTagInput value={[]} onChange={vi.fn()} />,
    );
    expect(container.querySelector("input#waitlist-cities")).toBeNull();
  });
});
