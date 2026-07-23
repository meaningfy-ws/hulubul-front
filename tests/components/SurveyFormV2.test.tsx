import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SurveyFormV2 } from "@/components/survey/SurveyFormV2";
import { REMEMBER_STORAGE_KEY } from "@/lib/remember-me";

const searchParams = new URLSearchParams();
vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParams,
}));

vi.mock("@/components/consent/ConsentProvider", () => ({
  useConsent: () => ({
    state: {
      necessary: true,
      analytics: "denied",
      marketing: "denied",
      version: "test",
      choseAt: null,
    },
    needsBanner: true,
    setChoice: vi.fn(),
  }),
}));

// The city-autocomplete widget has its own dedicated test suite
// (CityTagInput.test.tsx) — stub it here so this file only exercises
// SurveyFormV2's own logic (payload shape, caps, consent gating).
vi.mock("@/components/routes/CityTagInput", () => ({
  CityTagInput: ({ onChange }: { onChange: (v: string[]) => void }) => (
    <button type="button" onClick={() => onChange(["Chișinău", "Paris"])}>
      mock-set-route
    </button>
  ),
}));

beforeEach(() => {
  Array.from(searchParams.keys()).forEach((k) => searchParams.delete(k));
  window.localStorage.removeItem(REMEMBER_STORAGE_KEY);
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify({ ok: true, event_id: "evt-1" }), {
      status: 201,
    }),
  );
});

function getBody() {
  return JSON.parse(
    (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0]![1]!.body as string,
  );
}

async function fillRequiredFields(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^nume$/i), "Ion");
  await user.type(screen.getByLabelText(/^email$/i), "ion@x.com");
  await user.click(screen.getByRole("button", { name: "mock-set-route" }));
  await user.click(screen.getByLabelText("Lunar sau mai des"));
  await user.click(screen.getByLabelText("WhatsApp sau Telegram"));
  await user.click(screen.getByLabelText("5–15 minute"));
  await user.click(
    screen.getByLabelText("Nu găsesc rapid un transportator pentru ruta mea"),
  );
  await user.click(screen.getByLabelText("Prețul"));
  await user.click(screen.getByLabelText("Recenzii reale"));
  await user.click(
    screen.getByLabelText("Trimit o singură cerere, fără să repet informațiile"),
  );
  await user.type(
    screen.getByLabelText(/singur lucru/i),
    "Să știu că pachetul chiar ajunge.",
  );
  await user.click(screen.getByLabelText("Nu în această etapă"));
}

describe("<SurveyFormV2>", () => {
  // These two fill ~10 fields via userEvent (vs v1's 2-3) — under full-suite
  // parallel load that can exceed the default 5s timeout on a slow CI box.
  it("submits a fully-filled payload", { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<SurveyFormV2 />);
    await fillRequiredFields(user);
    await user.click(screen.getByRole("button", { name: /trimite răspunsurile/i }));

    await waitFor(() =>
      expect(screen.getByText(/mulțumim/i)).toBeInTheDocument(),
    );
    expect(getBody()).toMatchObject({
      name: "Ion",
      email: "ion@x.com",
      routeCities: ["Chișinău", "Paris"],
      sendingFrequency: "lunar_sau_mai_des",
      howFindTransporter: ["whatsapp_telegram"],
      searchDuration: "5_15_min",
      difficulties: ["nu_gasesc_rapid"],
      decisionCriteria: ["pretul"],
      trustSignals: ["recenzii_reale"],
      switchReasons: ["o_singura_cerere"],
      mostImportantThing: "Să știu că pachetul chiar ajunge.",
      wantsToTest: "nu",
    });
  });

  it("caps a multi-select at ceil(n/2) selections (8 options -> 4, UX-only, no server rule)", async () => {
    const user = userEvent.setup();
    render(<SurveyFormV2 />);

    await user.click(
      screen.getByLabelText("Nu găsesc rapid un transportator pentru ruta mea"),
    );
    await user.click(
      screen.getByLabelText("Nu primesc răspuns sau răspunsul vine prea târziu"),
    );
    await user.click(
      screen.getByLabelText("Trebuie să repet aceleași informații fiecărui transportator"),
    );
    await user.click(
      screen.getByLabelText("Nu știu dacă transportatorul este de încredere"),
    );
    // A 5th selection should be ignored — box stays unchecked.
    const fifth = screen.getByLabelText<HTMLInputElement>("Prețul sau condițiile nu sunt clare");
    await user.click(fifth);
    expect(fifth).not.toBeChecked();
  });

  it("blocks submit client-side and highlights the field when opting into testing without consent", { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<SurveyFormV2 />);
    await fillRequiredFields(user);
    await user.click(screen.getByLabelText("Da, vreau să particip"));
    await user.type(screen.getByPlaceholderText("+373 600 00 000"), "+373 600 00 000");
    // Consent checkbox deliberately left unchecked.
    await user.click(screen.getByRole("button", { name: /trimite răspunsurile/i }));

    await waitFor(() => expect(screen.getByRole("alert")).toBeInTheDocument());
    expect(screen.queryByText(/mulțumim/i)).not.toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
    expect(document.getElementById("s2-group-testConsent")).toHaveClass("field-invalid");
  });

  it("blocks submit and highlights a required multi-select left empty", { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<SurveyFormV2 />);
    await user.type(screen.getByLabelText(/^nume$/i), "Ion");
    await user.type(screen.getByLabelText(/^email$/i), "ion@x.com");
    await user.click(screen.getByRole("button", { name: "mock-set-route" }));
    await user.click(screen.getByLabelText("Lunar sau mai des"));
    await user.click(screen.getByLabelText("WhatsApp sau Telegram"));
    await user.click(screen.getByLabelText("5–15 minute"));
    // Difficulties (Q4) deliberately left empty.
    await user.click(screen.getByLabelText("Prețul"));
    await user.click(screen.getByLabelText("Recenzii reale"));
    await user.click(
      screen.getByLabelText("Trimit o singură cerere, fără să repet informațiile"),
    );
    await user.type(
      screen.getByLabelText(/singur lucru/i),
      "Să știu că pachetul chiar ajunge.",
    );
    await user.click(screen.getByLabelText("Nu în această etapă"));
    await user.click(screen.getByRole("button", { name: /trimite răspunsurile/i }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(document.getElementById("s2-group-difficulties")).toHaveClass("field-invalid");
    expect(
      screen.getByText("Selectează cel puțin o opțiune.", { selector: ".field-error-text" }),
    ).toBeInTheDocument();
  });

  it("blocks submit and highlights the route when no cities were added", { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<SurveyFormV2 />);
    await user.type(screen.getByLabelText(/^nume$/i), "Ion");
    await user.type(screen.getByLabelText(/^email$/i), "ion@x.com");
    // Route deliberately left empty (mock-set-route never clicked).
    await user.click(screen.getByLabelText("Lunar sau mai des"));
    await user.click(screen.getByLabelText("WhatsApp sau Telegram"));
    await user.click(screen.getByLabelText("5–15 minute"));
    await user.click(
      screen.getByLabelText("Nu găsesc rapid un transportator pentru ruta mea"),
    );
    await user.click(screen.getByLabelText("Prețul"));
    await user.click(screen.getByLabelText("Recenzii reale"));
    await user.click(
      screen.getByLabelText("Trimit o singură cerere, fără să repet informațiile"),
    );
    await user.type(
      screen.getByLabelText(/singur lucru/i),
      "Să știu că pachetul chiar ajunge.",
    );
    await user.click(screen.getByLabelText("Nu în această etapă"));
    await user.click(screen.getByRole("button", { name: /trimite răspunsurile/i }));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(document.getElementById("s2-group-routeCities")).toHaveClass("field-invalid");
  });

  it("clears a field's highlight as soon as it's fixed", { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<SurveyFormV2 />);
    await user.type(screen.getByLabelText(/^nume$/i), "Ion");
    await user.type(screen.getByLabelText(/^email$/i), "ion@x.com");
    await user.click(screen.getByRole("button", { name: "mock-set-route" }));
    await user.click(screen.getByLabelText("Lunar sau mai des"));
    await user.click(screen.getByLabelText("WhatsApp sau Telegram"));
    await user.click(screen.getByLabelText("5–15 minute"));
    await user.click(screen.getByLabelText("Prețul"));
    await user.click(screen.getByLabelText("Recenzii reale"));
    await user.click(
      screen.getByLabelText("Trimit o singură cerere, fără să repet informațiile"),
    );
    await user.type(
      screen.getByLabelText(/singur lucru/i),
      "Să știu că pachetul chiar ajunge.",
    );
    await user.click(screen.getByLabelText("Nu în această etapă"));
    await user.click(screen.getByRole("button", { name: /trimite răspunsurile/i }));

    expect(document.getElementById("s2-group-difficulties")).toHaveClass("field-invalid");

    await user.click(
      screen.getByLabelText("Nu găsesc rapid un transportator pentru ruta mea"),
    );
    expect(document.getElementById("s2-group-difficulties")).not.toHaveClass("field-invalid");
  });

  it("highlights every required field in Romanian, not the browser's native (English) validation", { timeout: 15000 }, async () => {
    const user = userEvent.setup();
    render(<SurveyFormV2 />);
    // Submit completely empty — the form must carry noValidate so no native
    // browser bubble intercepts this click, and our own JS must catch it.
    await user.click(screen.getByRole("button", { name: /trimite răspunsurile/i }));

    expect(global.fetch).not.toHaveBeenCalled();
    for (const groupId of [
      "s2-group-name",
      "s2-group-email",
      "s2-group-routeCities",
      "s2-group-sendingFrequency",
      "s2-group-howFindTransporter",
      "s2-group-searchDuration",
      "s2-group-difficulties",
      "s2-group-decisionCriteria",
      "s2-group-trustSignals",
      "s2-group-switchReasons",
      "s2-group-mostImportantThing",
      "s2-group-wantsToTest",
    ]) {
      expect(document.getElementById(groupId)).toHaveClass("field-invalid");
    }
    expect(screen.getByText("Numele este obligatoriu.")).toBeInTheDocument();
    expect(screen.getByText("Email-ul este obligatoriu.")).toBeInTheDocument();
    expect(screen.getAllByText("Selectează un răspuns.").length).toBeGreaterThan(0);
  });

  it("prefills name + email from remember-me", async () => {
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
    const user = userEvent.setup();
    render(<SurveyFormV2 />);
    await waitFor(() =>
      expect(screen.getByLabelText(/^nume$/i)).toHaveValue("Ion Remembered"),
    );
    expect(screen.getByLabelText(/^email$/i)).toHaveValue("rem@x.com");

    // The phone field only mounts once testing opt-in reveals it, but the
    // remembered whatsapp number should already be sitting in state.
    await user.click(screen.getByLabelText("Da, vreau să particip"));
    expect(screen.getByPlaceholderText("+373 600 00 000")).toHaveValue("+373 600");
  });
});
