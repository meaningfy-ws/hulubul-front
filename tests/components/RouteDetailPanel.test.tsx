import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteDetailPanel } from "@/components/routes/RouteDetailPanel";
import { routeFixtures } from "@/tests/msw/fixtures/routes";

const route = routeFixtures[0]!; // Luxembourg → Chișinău, has 1 schedule

describe("<RouteDetailPanel>", () => {
  it("shows route name", () => {
    render(<RouteDetailPanel route={route} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /Luxembourg → Chișinău/i })).toBeInTheDocument();
  });

  it("shows city chips with Plecare and Destinație badges", () => {
    render(<RouteDetailPanel route={route} onClose={vi.fn()} />);
    expect(screen.getByText("Plecare")).toBeInTheDocument();
    expect(screen.getByText("Destinație")).toBeInTheDocument();
    expect(screen.getByText("Luxembourg")).toBeInTheDocument();
    expect(screen.getByText("Chișinău")).toBeInTheDocument();
  });

  it("shows status badge", () => {
    render(<RouteDetailPanel route={route} onClose={vi.fn()} />);
    expect(screen.getAllByText("Aprobat").length).toBeGreaterThan(0);
  });

  it("shows submittedBy when present", () => {
    render(<RouteDetailPanel route={route} onClose={vi.fn()} />);
    expect(screen.getByText(/admin@hulubul.com/i)).toBeInTheDocument();
  });

  it("hides submittedBy when null", () => {
    render(<RouteDetailPanel route={routeFixtures[1]!} onClose={vi.fn()} />);
    expect(screen.queryByText(/Creat de/i)).not.toBeInTheDocument();
  });

  it("calls onClose when ✕ button clicked", async () => {
    const onClose = vi.fn();
    render(<RouteDetailPanel route={route} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /Închide/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("shows schedule transporter name", () => {
    render(<RouteDetailPanel route={route} onClose={vi.fn()} />);
    expect(screen.getByText("Ion Transport SRL")).toBeInTheDocument();
  });

  it("shows schedule frequency localised", () => {
    render(<RouteDetailPanel route={route} onClose={vi.fn()} />);
    expect(screen.getByText("Săptămânal")).toBeInTheDocument();
  });

  it("shows localised departure days", () => {
    render(<RouteDetailPanel route={route} onClose={vi.fn()} />);
    expect(screen.getByText(/Miercuri/i)).toBeInTheDocument();
  });

  it("shows localised arrival days", () => {
    render(<RouteDetailPanel route={route} onClose={vi.fn()} />);
    expect(screen.getByText(/Joi/i)).toBeInTheDocument();
  });

  it("shows phone number as tel link", () => {
    render(<RouteDetailPanel route={route} onClose={vi.fn()} />);
    const link = screen.getByRole("link", { name: "+352621123456" });
    expect(link).toHaveAttribute("href", "tel:+352621123456");
  });

  it("shows transport type chips", () => {
    render(<RouteDetailPanel route={route} onClose={vi.fn()} />);
    expect(screen.getByText("Colete & pachete")).toBeInTheDocument();
  });

  it("shows 'no schedules' message when schedules is empty", () => {
    render(<RouteDetailPanel route={routeFixtures[1]!} onClose={vi.fn()} />);
    expect(screen.getByText(/Nicio cursă programată/i)).toBeInTheDocument();
  });

  it("shows geocoding warning when geoJson is null", () => {
    render(<RouteDetailPanel route={routeFixtures[2]!} onClose={vi.fn()} />);
    expect(screen.getByText(/Coordonatele geografice lipsesc/i)).toBeInTheDocument();
  });

  it("shows notes when present", () => {
    const routeWithNotes = {
      ...route,
      schedules: [{ ...route.schedules![0]!, notes: "Disponibil iarna" }],
    };
    render(<RouteDetailPanel route={routeWithNotes} onClose={vi.fn()} />);
    expect(screen.getByText(/Disponibil iarna/i)).toBeInTheDocument();
  });

  it("does not render Editează button when readonly=true", () => {
    render(<RouteDetailPanel route={route} onClose={vi.fn()} readonly onEdit={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /Editează ruta/i })).not.toBeInTheDocument();
  });
});
