import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SignupForm } from "@/components/landing/SignupForm";
import { landingPageFixture } from "@/tests/msw/fixtures/landing-page";
import { REMEMBER_STORAGE_KEY } from "@/lib/remember-me";

const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

const signup = landingPageFixture.signup;

beforeEach(() => {
  Array.from(searchParams.keys()).forEach((k) => searchParams.delete(k));
  window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
  window.sessionStorage.removeItem("hulubul:from-waitlist");
  global.fetch = vi.fn();
});

function mockFetchOk() {
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), {
      status: 201,
      headers: { "content-type": "application/json" },
    }),
  );
}

function submittedBody(): Record<string, unknown> {
  return JSON.parse(
    (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string,
  );
}

describe("<SignupForm> — baseline submit behaviour", () => {
  it("submits name/email/role/routes to /api/waitlist and shows success", async () => {
    mockFetchOk();
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);

    await user.type(screen.getByLabelText(/nume/i), "Ion Popescu");
    await user.type(screen.getByLabelText(/email/i), "ion@example.com");
    await user.type(screen.getByLabelText(/rute/i), "Luxembourg - Chișinău");
    await user.click(screen.getByRole("button", { name: signup.submitLabel }));

    await waitFor(() =>
      expect(screen.getByText(signup.successTitle)).toBeInTheDocument(),
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/waitlist",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ "Content-Type": "application/json" }),
      }),
    );
    expect(submittedBody()).toEqual({
      name: "Ion Popescu",
      email: "ion@example.com",
      role: "expeditor",
      routes: "Luxembourg - Chișinău",
    });
  });

  it("includes whatsapp when provided", async () => {
    mockFetchOk();
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);

    await user.type(screen.getByLabelText(/nume/i), "Ion");
    await user.type(screen.getByLabelText(/email/i), "ion@x.com");
    await user.type(screen.getByLabelText(/whatsapp/i), "+373 600 00 000");
    await user.type(screen.getByLabelText(/rute/i), "LUX - KIV");
    await user.click(screen.getByRole("button", { name: signup.submitLabel }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(submittedBody().whatsapp).toBe("+373 600 00 000");
  });

  it("omits whatsapp from the payload when left empty", async () => {
    mockFetchOk();
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);

    await user.type(screen.getByLabelText(/nume/i), "Ion");
    await user.type(screen.getByLabelText(/email/i), "ion@x.com");
    await user.type(screen.getByLabelText(/rute/i), "LUX - KIV");
    await user.click(screen.getByRole("button", { name: signup.submitLabel }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(submittedBody()).not.toHaveProperty("whatsapp");
  });

  it("prefills the role radio from ?role=transportator", () => {
    searchParams.set("role", "transportator");
    render(<SignupForm data={signup} />);
    const transportator = screen.getByLabelText(
      signup.roleOptions.find((o) => o.value === "transportator")!.label,
    );
    expect(transportator).toBeChecked();
  });

  it("shows an inline error when the server rejects", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: "nope" }), { status: 500 }),
    );
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);

    await user.type(screen.getByLabelText(/nume/i), "Ion");
    await user.type(screen.getByLabelText(/email/i), "ion@x.com");
    await user.type(screen.getByLabelText(/rute/i), "LUX - KIV");
    await user.click(screen.getByRole("button", { name: signup.submitLabel }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText(signup.successTitle)).not.toBeInTheDocument();
  });
});

describe("<SignupForm> — survey CTA on success", () => {
  it("renders a link to /sondaj/expeditori after successful submit", async () => {
    mockFetchOk();
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);

    await user.type(screen.getByLabelText(/nume/i), "Ion");
    await user.type(screen.getByLabelText(/email/i), "ion@x.com");
    await user.type(screen.getByLabelText(/rute/i), "A - B");
    await user.click(screen.getByRole("button", { name: signup.submitLabel }));

    const link = await screen.findByRole("link", {
      name: /împărtășește experiența/i,
    });
    expect(link).toHaveAttribute("href", "/sondaj/expeditori");
  });

  it("sets the from-waitlist sessionStorage flag when the CTA is clicked", async () => {
    mockFetchOk();
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);

    await user.type(screen.getByLabelText(/nume/i), "Ion");
    await user.type(screen.getByLabelText(/email/i), "ion@x.com");
    await user.type(screen.getByLabelText(/rute/i), "A - B");
    await user.click(screen.getByRole("button", { name: signup.submitLabel }));

    const link = await screen.findByRole("link", {
      name: /împărtășește experiența/i,
    });
    // Prevent jsdom navigation, then trigger the click handler directly.
    link.addEventListener("click", (e) => e.preventDefault());
    await user.click(link);
    expect(window.sessionStorage.getItem("hulubul:from-waitlist")).toBe("1");
  });
});

describe("<SignupForm> — remember-me prefill (v2)", () => {
  it("starts with empty inputs and no clear link when no entry is stored", () => {
    render(<SignupForm data={signup} />);
    expect(screen.getByLabelText(/nume/i)).toHaveValue("");
    expect(screen.getByLabelText(/email/i)).toHaveValue("");
    expect(screen.getByLabelText(/whatsapp/i)).toHaveValue("");
    expect(screen.queryByRole("button", { name: /nu ești tu/i })).toBeNull();
  });

  it("prefills name + email (+ whatsapp) and shows the clear link when a v:2 entry is stored", async () => {
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        name: "Ion Popescu",
        email: "ion@example.com",
        whatsapp: "+373 600",
        savedAt: new Date().toISOString(),
      }),
    );
    render(<SignupForm data={signup} />);

    await waitFor(() =>
      expect(screen.getByLabelText(/nume/i)).toHaveValue("Ion Popescu"),
    );
    expect(screen.getByLabelText(/email/i)).toHaveValue("ion@example.com");
    expect(screen.getByLabelText(/whatsapp/i)).toHaveValue("+373 600");
    expect(
      screen.getByRole("button", { name: /nu ești tu/i }),
    ).toBeInTheDocument();
  });

  it("ignores a legacy v:1 entry (migration drops it)", () => {
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        name: "Legacy",
        contact: "legacy@x",
        savedAt: new Date().toISOString(),
      }),
    );
    render(<SignupForm data={signup} />);
    expect(screen.getByLabelText(/nume/i)).toHaveValue("");
    expect(screen.getByLabelText(/email/i)).toHaveValue("");
  });

  it("clicking 'Nu ești tu?' empties the inputs, hides the link, and wipes storage", async () => {
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        name: "Ion",
        email: "ion@example.com",
        savedAt: new Date().toISOString(),
      }),
    );
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);

    await waitFor(() =>
      expect(screen.getByLabelText(/nume/i)).toHaveValue("Ion"),
    );
    await user.click(screen.getByRole("button", { name: /nu ești tu/i }));

    expect(screen.getByLabelText(/nume/i)).toHaveValue("");
    expect(screen.getByLabelText(/email/i)).toHaveValue("");
    expect(screen.getByLabelText(/whatsapp/i)).toHaveValue("");
    expect(screen.queryByRole("button", { name: /nu ești tu/i })).toBeNull();
    expect(window.localStorage.getItem(REMEMBER_STORAGE_KEY)).toBeNull();
  });

  it("saves v:2 payload on successful submit when the checkbox is ticked (default)", async () => {
    mockFetchOk();
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);

    expect(screen.getByLabelText(/reține-mă/i)).toBeChecked();

    await user.type(screen.getByLabelText(/nume/i), "Ion Popescu");
    await user.type(screen.getByLabelText(/email/i), "ion@example.com");
    await user.type(screen.getByLabelText(/whatsapp/i), "+373 600");
    await user.type(screen.getByLabelText(/rute/i), "LUX - KIV");
    await user.click(screen.getByRole("button", { name: signup.submitLabel }));

    await waitFor(() =>
      expect(screen.getByText(signup.successTitle)).toBeInTheDocument(),
    );

    const stored = window.localStorage.getItem(REMEMBER_STORAGE_KEY);
    expect(stored).not.toBeNull();
    const payload = JSON.parse(stored!);
    expect(payload.v).toBe(2);
    expect(payload.name).toBe("Ion Popescu");
    expect(payload.email).toBe("ion@example.com");
    expect(payload.whatsapp).toBe("+373 600");
  });

  it("clears prior storage on successful submit when the checkbox is NOT ticked", async () => {
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        name: "Old",
        email: "old@x",
        savedAt: new Date().toISOString(),
      }),
    );
    mockFetchOk();
    const user = userEvent.setup();
    render(<SignupForm data={signup} />);

    await waitFor(() =>
      expect(screen.getByLabelText(/nume/i)).toHaveValue("Old"),
    );
    const checkbox = screen.getByLabelText(/reține-mă/i);
    if ((checkbox as HTMLInputElement).checked) await user.click(checkbox);

    // Routes is still required, fill it before submitting.
    await user.type(screen.getByLabelText(/rute/i), "A - B");
    await user.click(screen.getByRole("button", { name: signup.submitLabel }));

    await waitFor(() =>
      expect(screen.getByText(signup.successTitle)).toBeInTheDocument(),
    );
    expect(window.localStorage.getItem(REMEMBER_STORAGE_KEY)).toBeNull();
  });
});
