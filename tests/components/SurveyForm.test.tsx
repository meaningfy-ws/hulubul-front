import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SurveyForm } from "@/components/survey/SurveyForm";
import { REMEMBER_STORAGE_KEY } from "@/lib/remember-me";

const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

beforeEach(() => {
  // forEach-while-deleting skips entries; snapshot keys first.
  Array.from(searchParams.keys()).forEach((k) => searchParams.delete(k));
  window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
  window.sessionStorage.removeItem("hulubul:from-waitlist");
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true }), { status: 201 }),
  );
});

function getBody() {
  return JSON.parse(
    (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string,
  );
}

describe("<SurveyForm>", () => {
  it("submits identity-only payload with source=standalone by default", async () => {
    const user = userEvent.setup();
    render(<SurveyForm />);

    await user.type(screen.getByLabelText(/^nume$/i), "Ion");
    await user.type(screen.getByLabelText(/^email$/i), "ion@x.com");
    await user.click(screen.getByRole("button", { name: /trimite/i }));

    await waitFor(() =>
      expect(screen.getByText(/mulțumim/i)).toBeInTheDocument(),
    );
    expect(getBody()).toMatchObject({
      name: "Ion",
      email: "ion@x.com",
      role: "expeditor",
      source: "standalone",
      willShipSoon: false,
      wantsCallback: false,
    });
  });

  it("sets source=waitlist_followup when the session flag is present", async () => {
    window.sessionStorage.setItem("hulubul:from-waitlist", "1");
    const user = userEvent.setup();
    render(<SurveyForm />);

    await user.type(screen.getByLabelText(/^nume$/i), "Ion");
    await user.type(screen.getByLabelText(/^email$/i), "ion@x.com");
    await user.click(screen.getByRole("button", { name: /trimite/i }));

    await waitFor(() => expect(global.fetch).toHaveBeenCalled());
    expect(getBody().source).toBe("waitlist_followup");
  });

  it("clears the session flag after a successful submit", async () => {
    window.sessionStorage.setItem("hulubul:from-waitlist", "1");
    const user = userEvent.setup();
    render(<SurveyForm />);

    await user.type(screen.getByLabelText(/^nume$/i), "Ion");
    await user.type(screen.getByLabelText(/^email$/i), "ion@x.com");
    await user.click(screen.getByRole("button", { name: /trimite/i }));

    await waitFor(() =>
      expect(screen.getByText(/mulțumim/i)).toBeInTheDocument(),
    );
    expect(window.sessionStorage.getItem("hulubul:from-waitlist")).toBeNull();
  });

  it("prefills name + email from URL params", async () => {
    searchParams.set("email", "url@x.com");
    searchParams.set("name", "Ion Url");
    render(<SurveyForm />);
    await waitFor(() =>
      expect(screen.getByLabelText(/^nume$/i)).toHaveValue("Ion Url"),
    );
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("url@x.com");
  });

  it("prefills name + email + whatsapp from remember-me when URL is empty", async () => {
    window.localStorage.setItem(
      REMEMBER_STORAGE_KEY,
      JSON.stringify({
        v: 2,
        name: "Ion Remembered",
        email: "rem@x.com",
        whatsapp: "+373 600",
        savedAt: new Date().toISOString(),
      }),
    );
    render(<SurveyForm />);
    await waitFor(() =>
      expect(screen.getByLabelText(/^nume$/i)).toHaveValue("Ion Remembered"),
    );
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("rem@x.com");
    expect(screen.getByLabelText(/whatsapp/i)).toHaveValue("+373 600");
  });

  it("shows an inline error when the server rejects", async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      new Response(JSON.stringify({ error: "boom" }), { status: 500 }),
    );
    const user = userEvent.setup();
    render(<SurveyForm />);

    await user.type(screen.getByLabelText(/^nume$/i), "Ion");
    await user.type(screen.getByLabelText(/^email$/i), "ion@x.com");
    await user.click(screen.getByRole("button", { name: /trimite/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText(/mulțumim/i)).not.toBeInTheDocument();
  });
});
