import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SelectionCriteriaPicker } from "@/components/survey/SelectionCriteriaPicker";
import type { SelectionCriterion } from "@/lib/survey-schema";

const options: { value: SelectionCriterion; label: string }[] = [
  { value: "pret", label: "Preț" },
  { value: "siguranta", label: "Siguranță" },
  { value: "viteza", label: "Viteză" },
  { value: "reputatie", label: "Reputație" },
  { value: "recomandare", label: "Recomandare" },
];

function setup(initial: SelectionCriterion[] = []) {
  const onChange = vi.fn();
  render(
    <SelectionCriteriaPicker
      options={options}
      value={initial}
      onChange={onChange}
    />,
  );
  return { onChange };
}

describe("<SelectionCriteriaPicker>", () => {
  it("adds a criterion when its option is clicked and it's not already selected", async () => {
    const user = userEvent.setup();
    const { onChange } = setup([]);
    await user.click(screen.getByRole("button", { name: /preț/i }));
    expect(onChange).toHaveBeenCalledWith(["pret"]);
  });

  it("removes a criterion when clicking a selected one (via the remove button)", async () => {
    const user = userEvent.setup();
    const { onChange } = setup(["pret", "siguranta"]);
    await user.click(screen.getByRole("button", { name: /elimină preț/i }));
    expect(onChange).toHaveBeenCalledWith(["siguranta"]);
  });

  it("reorders via 'sus' / 'jos' arrows", async () => {
    const user = userEvent.setup();
    const { onChange } = setup(["pret", "siguranta", "viteza"]);
    await user.click(screen.getByRole("button", { name: /mută siguranță sus/i }));
    expect(onChange).toHaveBeenCalledWith(["siguranta", "pret", "viteza"]);
  });

  it("shows rank numbers on selected criteria", () => {
    setup(["siguranta", "pret"]);
    expect(screen.getByText("1.")).toBeInTheDocument();
    expect(screen.getByText("2.")).toBeInTheDocument();
  });
});
