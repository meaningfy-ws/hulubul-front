import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
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

describe("Feature: origin/destination badges (waitlist v2)", () => {
  describe("Given originDestinationLabels=false (transporter mode)", () => {
    it("When chips render, Then no Plecare/Destinație labels appear", () => {
      render(
        <CityTagInput
          value={["Lux", "Metz", "Chișinău"]}
          onChange={noop}
          originDestinationLabels={false}
        />,
      );
      expect(screen.queryByText("Plecare")).not.toBeInTheDocument();
      expect(screen.queryByText("Destinație")).not.toBeInTheDocument();
    });
  });

  describe("Given originDestinationLabels is left at default", () => {
    it("When chips render, Then Plecare and Destinație appear (backwards-compatible)", () => {
      render(<CityTagInput value={["Lux", "Chișinău"]} onChange={noop} />);
      expect(screen.getByText("Plecare")).toBeInTheDocument();
      expect(screen.getByText("Destinație")).toBeInTheDocument();
    });
  });
});

describe("Feature: maxCities cap", () => {
  describe("Given maxCities=2 and 2 chips already present", () => {
    it("When the user types a new city and presses Enter, Then onChange is not called", async () => {
      const onChange = vi.fn();
      render(<CityTagInput value={["A", "B"]} onChange={onChange} maxCities={2} />);
      const input = screen.getByRole("combobox");
      await userEvent.type(input, "C");
      await userEvent.keyboard("{Enter}");
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});

describe("Feature: keyboard reorder via Alt+Arrow", () => {
  describe("Given chips [A, B, C] with chip A focused", () => {
    it("When the user presses Alt+ArrowRight, Then the array becomes [B, A, C]", async () => {
      const onChange = vi.fn();
      render(<CityTagInput value={["A", "B", "C"]} onChange={onChange} />);
      const chipA = screen.getByRole("button", { name: /chip A/i });
      chipA.focus();
      await userEvent.keyboard("{Alt>}{ArrowRight}{/Alt}");
      expect(onChange).toHaveBeenCalledWith(["B", "A", "C"]);
    });
  });

  describe("Given chips [A, B, C] with chip B focused", () => {
    it("When the user presses Alt+ArrowLeft, Then the array becomes [B, A, C]", async () => {
      const onChange = vi.fn();
      render(<CityTagInput value={["A", "B", "C"]} onChange={onChange} />);
      const chipB = screen.getByRole("button", { name: /chip B/i });
      chipB.focus();
      await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}");
      expect(onChange).toHaveBeenCalledWith(["B", "A", "C"]);
    });
  });

  describe("Given the leftmost chip is focused", () => {
    it("When the user presses Alt+ArrowLeft, Then onChange is not called (no-op at boundary)", async () => {
      const onChange = vi.fn();
      render(<CityTagInput value={["A", "B"]} onChange={onChange} />);
      const chipA = screen.getByRole("button", { name: /chip A/i });
      chipA.focus();
      await userEvent.keyboard("{Alt>}{ArrowLeft}{/Alt}");
      expect(onChange).not.toHaveBeenCalled();
    });
  });
});

describe("Feature: insert-between via gap button", () => {
  describe("Given chips [A, C] with a gap between them", () => {
    it("When the user clicks the gap and types 'B', Then chips become [A, B, C]", async () => {
      const onChange = vi.fn();
      render(<CityTagInput value={["A", "C"]} onChange={onChange} />);
      const insertBtn = screen.getByRole("button", { name: /inserează între A și C/i });
      await userEvent.click(insertBtn);
      const input = screen.getByLabelText(/oraș nou între A și C/i);
      fireEvent.change(input, { target: { value: "B" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onChange).toHaveBeenCalledWith(["A", "B", "C"]);
    });
  });
});

describe("Feature: drag-to-reorder", () => {
  describe("Given chips [A, B, C]", () => {
    it("When chip A is dropped onto chip C, Then chips become [B, C, A]", () => {
      const onChange = vi.fn();
      render(<CityTagInput value={["A", "B", "C"]} onChange={onChange} />);
      const chipA = screen.getByRole("button", { name: /chip A/i });
      const chipC = screen.getByRole("button", { name: /chip C/i });

      // jsdom does not implement DragEvent. Synthesise via Event + dataTransfer.
      const dt = {
        setData: vi.fn(),
        getData: () => "0",
        effectAllowed: "move",
      } as unknown as DataTransfer;

      const dragstart = new Event("dragstart", { bubbles: true, cancelable: true });
      Object.defineProperty(dragstart, "dataTransfer", { value: dt });
      chipA.dispatchEvent(dragstart);

      const drop = new Event("drop", { bubbles: true, cancelable: true });
      Object.defineProperty(drop, "dataTransfer", { value: dt });
      chipC.dispatchEvent(drop);

      expect(onChange).toHaveBeenCalledWith(["B", "C", "A"]);
    });
  });
});
