import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CityTagInput } from "@/components/routes/CityTagInput";

const noop = () => {};

function mockFetchSuggestions(suggestions: Array<{ name: string; country: string }>) {
  global.fetch = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify(suggestions.map((s) => ({ ...s, lat: 49, lon: 6 }))),
      { status: 200, headers: { "content-type": "application/json" } },
    ),
  );
}

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue(
    new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("<CityTagInput>", () => {
  it("renders existing chips from value prop", () => {
    render(<CityTagInput value={["Luxembourg", "Metz", "Lyon"]} onChange={noop} />);
    expect(screen.getByText("Luxembourg")).toBeInTheDocument();
    expect(screen.getByText("Metz")).toBeInTheDocument();
    expect(screen.getByText("Lyon")).toBeInTheDocument();
  });

  it("marks first chip as Plecare and last chip as Destinație", () => {
    render(<CityTagInput value={["Luxembourg", "Metz", "Chișinău"]} onChange={noop} />);
    expect(screen.getByText("Plecare")).toBeInTheDocument();
    expect(screen.getByText("Destinație")).toBeInTheDocument();
  });

  it("labels single chip as Plecare only", () => {
    render(<CityTagInput value={["Luxembourg"]} onChange={noop} />);
    expect(screen.getByText("Plecare")).toBeInTheDocument();
    expect(screen.queryByText("Destinație")).not.toBeInTheDocument();
  });

  it("middle chips have no badge", () => {
    const { container } = render(
      <CityTagInput value={["A", "B", "C"]} onChange={noop} />,
    );
    // Only 2 badge labels (Plecare + Destinație) — not 3
    const badges = container.querySelectorAll("span[style*='0.6rem']");
    expect(badges).toHaveLength(2);
  });

  it("removes a chip when its × button is clicked", async () => {
    const onChange = vi.fn();
    render(<CityTagInput value={["Luxembourg", "Metz", "Lyon"]} onChange={onChange} />);
    await userEvent.click(screen.getByLabelText("Elimină Metz"));
    expect(onChange).toHaveBeenCalledWith(["Luxembourg", "Lyon"]);
  });

  it("shows suggestions in dropdown after debounce", async () => {
    mockFetchSuggestions([
      { name: "Luxembourg", country: "LU" },
      { name: "Luxeuil", country: "FR" },
    ]);
    render(<CityTagInput value={[]} onChange={noop} />);
    await userEvent.type(screen.getByRole("combobox"), "Lux");
    await waitFor(() => expect(screen.getByRole("listbox")).toBeInTheDocument(), { timeout: 2000 });
    expect(screen.getByText("Luxembourg")).toBeInTheDocument();
    expect(screen.getByText("LU")).toBeInTheDocument();
  });

  it("adds city chip when suggestion is clicked", async () => {
    const onChange = vi.fn();
    mockFetchSuggestions([{ name: "Luxembourg", country: "LU" }]);
    render(<CityTagInput value={[]} onChange={onChange} />);
    await userEvent.type(screen.getByRole("combobox"), "Lux");
    await waitFor(() => screen.getByRole("listbox"), { timeout: 2000 });
    await userEvent.click(screen.getByText("Luxembourg"));
    expect(onChange).toHaveBeenCalledWith(["Luxembourg"]);
  });

  it("shows country label in dropdown for disambiguation", async () => {
    mockFetchSuggestions([
      { name: "Lyon", country: "FR" },
      { name: "Lyon", country: "BE" },
    ]);
    render(<CityTagInput value={[]} onChange={noop} />);
    await userEvent.type(screen.getByRole("combobox"), "Lyo");
    await waitFor(() => screen.getByRole("listbox"), { timeout: 2000 });
    const countryBadges = screen.getAllByText("FR").concat(screen.getAllByText("BE"));
    expect(countryBadges.length).toBeGreaterThan(0);
  });

  it("closes dropdown on Escape without adding city", async () => {
    mockFetchSuggestions([{ name: "Lyon", country: "FR" }]);
    render(<CityTagInput value={[]} onChange={noop} />);
    await userEvent.type(screen.getByRole("combobox"), "Lyo");
    await waitFor(() => screen.getByRole("listbox"), { timeout: 2000 });
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("removes last chip on Backspace when input is empty", async () => {
    const onChange = vi.fn();
    render(<CityTagInput value={["Luxembourg", "Lyon"]} onChange={onChange} />);
    const input = screen.getByRole("combobox");
    await userEvent.click(input);
    await userEvent.keyboard("{Backspace}");
    expect(onChange).toHaveBeenCalledWith(["Luxembourg"]);
  });

  it("adds typed city on Enter when no suggestion selected", async () => {
    const onChange = vi.fn();
    render(<CityTagInput value={[]} onChange={onChange} />);
    const input = screen.getByRole("combobox");
    await userEvent.type(input, "Chișinău");
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(["Chișinău"]);
  });

  it("navigates suggestions with ArrowDown and selects with Enter", async () => {
    const onChange = vi.fn();
    mockFetchSuggestions([
      { name: "Lyon", country: "FR" },
      { name: "Lyons", country: "US" },
    ]);
    render(<CityTagInput value={[]} onChange={onChange} />);
    await userEvent.type(screen.getByRole("combobox"), "Lyo");
    await waitFor(() => screen.getByRole("listbox"), { timeout: 2000 });
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{ArrowDown}");
    await userEvent.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith(["Lyons"]);
  });

  it("does not call fetch when input is fewer than 2 chars", async () => {
    render(<CityTagInput value={[]} onChange={noop} />);
    await userEvent.type(screen.getByRole("combobox"), "L");
    await waitFor(() => {}, { timeout: 500 });
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
