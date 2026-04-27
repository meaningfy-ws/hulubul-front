import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoutesFilter } from "@/components/routes/RoutesFilter";
import { EMPTY_FILTER } from "@/lib/routes-types";
import type { RouteFilter, Transporter } from "@/lib/routes-types";

const transporters: Transporter[] = [
  {
    id: 1, documentId: "t1", name: "Ion Transport", type: "individual",
    phoneNumbers: [], transportTypes: [], notes: null, status: "approved",
    submittedBy: null, claimedBy: null,
  },
  {
    id: 2, documentId: "t2", name: "Maria Express", type: "company",
    phoneNumbers: [], transportTypes: [], notes: null, status: "approved",
    submittedBy: null, claimedBy: null,
  },
];

function setup(filter: RouteFilter = EMPTY_FILTER, onChangeFn = vi.fn(), onResetFn = vi.fn()) {
  render(
    <RoutesFilter
      filter={filter}
      onChange={onChangeFn}
      onReset={onResetFn}
      transporters={transporters}
    />,
  );
  return { onChange: onChangeFn, onReset: onResetFn };
}

describe("<RoutesFilter>", () => {
  it("renders status pills", () => {
    setup();
    expect(screen.getByRole("button", { name: "Toate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aprobate" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ciornă" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Suspendate" })).toBeInTheDocument();
  });

  it("calls onChange with new status when a pill is clicked", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByRole("button", { name: "Aprobate" }));
    expect(onChange).toHaveBeenCalledWith({ ...EMPTY_FILTER, status: "approved" });
  });

  it("renders city filter input", () => {
    setup();
    expect(screen.getByRole("textbox", { name: /oraș/i })).toBeInTheDocument();
  });

  it("calls onChange when city query changes", async () => {
    const { onChange } = setup();
    const input = screen.getByRole("textbox", { name: /oraș/i });
    await userEvent.type(input, "L");
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ cityQuery: "L" }),
    );
  });

  it("renders transporter checkboxes", async () => {
    setup();
    // expand the details element
    await userEvent.click(screen.getByText("Transportator"));
    expect(screen.getByLabelText("Ion Transport")).toBeInTheDocument();
    expect(screen.getByLabelText("Maria Express")).toBeInTheDocument();
  });

  it("toggles transporter on checkbox click", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByText("Transportator"));
    await userEvent.click(screen.getByLabelText("Ion Transport"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ transporterIds: [1] }),
    );
  });

  it("shows reset link when filter is active", () => {
    setup({ ...EMPTY_FILTER, status: "approved" });
    expect(screen.getByRole("button", { name: "Resetează filtrele" })).toBeInTheDocument();
    expect(screen.getByText("1 filtre active")).toBeInTheDocument();
  });

  it("hides reset link when filter is empty", () => {
    setup(EMPTY_FILTER);
    expect(screen.queryByRole("button", { name: "Resetează filtrele" })).not.toBeInTheDocument();
  });

  it("calls onReset when reset link is clicked", async () => {
    const { onReset } = setup({ ...EMPTY_FILTER, status: "approved" });
    await userEvent.click(screen.getByRole("button", { name: "Resetează filtrele" }));
    expect(onReset).toHaveBeenCalled();
  });

  it("toggles frequency checkboxes", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByText("Frecvență"));
    await userEvent.click(screen.getByLabelText("Săptămânal"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ frequencies: ["weekly"] }),
    );
  });

  it("toggles departure day pills", async () => {
    const { onChange } = setup();
    await userEvent.click(screen.getByText("Zile plecare"));
    await userEvent.click(screen.getByText("Mi"));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ departureDays: ["wed"] }),
    );
  });
});
