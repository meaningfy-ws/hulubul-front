import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteFormDrawer } from "@/components/routes/RouteFormDrawer";
import { routeFixtures } from "@/tests/msw/fixtures/routes";

const route = routeFixtures[0]!;

beforeEach(() => {
  // CityTagInput calls geocode-suggest; return empty suggestions
  global.fetch = vi.fn().mockResolvedValue(
    new Response("[]", { status: 200, headers: { "content-type": "application/json" } }),
  );
});

afterEach(() => vi.restoreAllMocks());

describe("<RouteFormDrawer>", () => {
  it("renders nothing when open=false", () => {
    const { container } = render(
      <RouteFormDrawer open={false} onClose={vi.fn()} onSave={vi.fn()} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders dialog when open=true", () => {
    render(<RouteFormDrawer open onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("shows 'Adaugă rută nouă' in create mode", () => {
    render(<RouteFormDrawer open onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByText("Adaugă rută nouă")).toBeInTheDocument();
  });

  it("shows 'Editează ruta' in edit mode", () => {
    render(<RouteFormDrawer open route={route} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getAllByText("Editează ruta").length).toBeGreaterThan(0);
  });

  it("pre-fills name from route in edit mode", () => {
    render(<RouteFormDrawer open route={route} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText(/Denumire/i)).toHaveValue("Luxembourg → Chișinău");
  });

  it("pre-fills status from route in edit mode", () => {
    render(<RouteFormDrawer open route={route} onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText(/^Status/i)).toHaveValue("approved");
  });

  it("defaults status to approved in create mode", () => {
    render(<RouteFormDrawer open onClose={vi.fn()} onSave={vi.fn()} />);
    expect(screen.getByLabelText(/^Status/i)).toHaveValue("approved");
  });

  it("shows validation error when name is empty on submit", async () => {
    render(<RouteFormDrawer open onClose={vi.fn()} onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Adaugă ruta/i }));
    const alerts = screen.getAllByRole("alert");
    expect(alerts.some((a) => /Denumirea este obligatorie/i.test(a.textContent ?? ""))).toBe(true);
  });

  it("shows validation error when fewer than 2 cities", async () => {
    render(<RouteFormDrawer open onClose={vi.fn()} onSave={vi.fn()} />);
    await userEvent.type(screen.getByLabelText(/Denumire/i), "Test Route");
    await userEvent.click(screen.getByRole("button", { name: /Adaugă ruta/i }));
    const alerts = screen.getAllByRole("alert");
    const cityAlert = alerts.find((a) => a.textContent?.includes("2 orașe"));
    expect(cityAlert).toBeTruthy();
  });

  it("calls onSave with correct payload on valid submit", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RouteFormDrawer open onClose={vi.fn()} onSave={onSave} />);

    await userEvent.type(screen.getByLabelText(/Denumire/i), "Test Route");

    // Add 2 cities via tag input Enter key (no autocomplete)
    const cityInput = screen.getByLabelText("Adaugă oraș");
    await userEvent.type(cityInput, "Luxembourg");
    await userEvent.keyboard("{Enter}");
    await userEvent.type(cityInput, "Chișinău");
    await userEvent.keyboard("{Enter}");

    await userEvent.click(screen.getByRole("button", { name: /Adaugă ruta/i }));
    await waitFor(() => expect(onSave).toHaveBeenCalled());
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Route",
        citiesText: "Luxembourg, Chișinău",
        status: "approved",
      }),
    );
  });

  it("shows spinner label while saving", async () => {
    const onSave = vi.fn().mockImplementation(
      () => new Promise((resolve) => setTimeout(resolve, 500)),
    );
    render(<RouteFormDrawer open onClose={vi.fn()} onSave={onSave} />);

    await userEvent.type(screen.getByLabelText(/Denumire/i), "Test");
    const cityInput = screen.getByLabelText("Adaugă oraș");
    await userEvent.type(cityInput, "A");
    await userEvent.keyboard("{Enter}");
    await userEvent.type(cityInput, "B");
    await userEvent.keyboard("{Enter}");

    await userEvent.click(screen.getByRole("button", { name: /Adaugă ruta/i }));
    await waitFor(() =>
      expect(screen.getByText(/Se calculează coordonatele/i)).toBeInTheDocument(),
    );
  });

  it("calls onClose when Anulează clicked", async () => {
    const onClose = vi.fn();
    render(<RouteFormDrawer open onClose={onClose} onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Anulează/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when ✕ button clicked", async () => {
    const onClose = vi.fn();
    render(<RouteFormDrawer open onClose={onClose} onSave={vi.fn()} />);
    await userEvent.click(screen.getByRole("button", { name: /Închide formularul/i }));
    expect(onClose).toHaveBeenCalled();
  });
});
