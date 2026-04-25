import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RoutesList } from "@/components/routes/RoutesList";
import { routeFixtures } from "@/tests/msw/fixtures/routes";

describe("<RoutesList>", () => {
  it("renders a row per route", () => {
    render(<RoutesList routes={routeFixtures} selectedRouteId={null} onSelect={vi.fn()} />);
    expect(screen.getByText("Luxembourg → Chișinău")).toBeInTheDocument();
    expect(screen.getByText("Paris → București")).toBeInTheDocument();
    expect(screen.getByText("Frankfurt → Iași")).toBeInTheDocument();
  });

  it("shows empty state message when routes is empty", () => {
    render(<RoutesList routes={[]} selectedRouteId={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/Nicio rută corespunde/i)).toBeInTheDocument();
  });

  it("shows add CTA button in empty state when onAdd provided and not readonly", async () => {
    const onAdd = vi.fn();
    render(<RoutesList routes={[]} selectedRouteId={null} onSelect={vi.fn()} onAdd={onAdd} />);
    const btn = screen.getByRole("button", { name: /Adaugă prima rută/i });
    expect(btn).toBeInTheDocument();
    await userEvent.click(btn);
    expect(onAdd).toHaveBeenCalled();
  });

  it("hides add CTA in empty state when readonly", () => {
    render(<RoutesList routes={[]} selectedRouteId={null} onSelect={vi.fn()} onAdd={vi.fn()} readonly />);
    expect(screen.queryByRole("button", { name: /Adaugă prima rută/i })).not.toBeInTheDocument();
  });

  it("highlights selected row", () => {
    const { container } = render(
      <RoutesList routes={routeFixtures} selectedRouteId={1} onSelect={vi.fn()} />,
    );
    const selected = container.querySelector("tr[aria-selected='true']");
    expect(selected).toBeInTheDocument();
  });

  it("calls onSelect with route id when row clicked", async () => {
    const onSelect = vi.fn();
    render(<RoutesList routes={routeFixtures} selectedRouteId={null} onSelect={onSelect} />);
    await userEvent.click(screen.getByText("Paris → București"));
    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it("shows ⚠ badge for route without geoJson", () => {
    render(<RoutesList routes={routeFixtures} selectedRouteId={null} onSelect={vi.fn()} />);
    expect(screen.getByText(/fără coordonate/i)).toBeInTheDocument();
  });

  it("renders Editează and Șterge buttons when not readonly", () => {
    render(
      <RoutesList
        routes={[routeFixtures[0]!]}
        selectedRouteId={null}
        onSelect={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: /Editează Luxembourg → Chișinău/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Șterge Luxembourg → Chișinău/i })).toBeInTheDocument();
  });

  it("does not render edit/delete buttons when readonly=true", () => {
    render(
      <RoutesList
        routes={[routeFixtures[0]!]}
        selectedRouteId={null}
        onSelect={vi.fn()}
        readonly
      />,
    );
    expect(screen.queryByRole("button", { name: /Editează/i })).not.toBeInTheDocument();
  });

  it("calls onEdit when Editează button clicked without propagating row click", async () => {
    const onEdit = vi.fn();
    const onSelect = vi.fn();
    render(
      <RoutesList
        routes={[routeFixtures[0]!]}
        selectedRouteId={null}
        onSelect={onSelect}
        onEdit={onEdit}
      />,
    );
    await userEvent.click(screen.getByRole("button", { name: /Editează/i }));
    expect(onEdit).toHaveBeenCalledWith(routeFixtures[0]);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
