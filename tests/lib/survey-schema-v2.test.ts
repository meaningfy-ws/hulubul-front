import { describe, expect, it } from "vitest";
import { maxSelections, surveySchemaV2 } from "@/lib/survey-schema-v2";

const validPayload = {
  name: "Ion",
  email: "ion@x.com",
  routeCities: ["Chișinău", "Paris"],
  sendingFrequency: "lunar_sau_mai_des" as const,
  howFindTransporter: ["whatsapp_telegram"] as const,
  searchDuration: "5_15_min" as const,
  difficulties: ["nu_gasesc_rapid"] as const,
  decisionCriteria: ["pretul"] as const,
  trustSignals: ["recenzii_reale"] as const,
  switchReasons: ["o_singura_cerere"] as const,
  mostImportantThing: "Să știu că pachetul chiar ajunge.",
  wantsToTest: "nu" as const,
};

describe("surveySchemaV2", () => {
  it("accepts a valid payload", () => {
    expect(surveySchemaV2.safeParse(validPayload).success).toBe(true);
  });

  it("rejects a missing required question", () => {
    const { sendingFrequency: _drop, ...rest } = validPayload;
    expect(surveySchemaV2.safeParse(rest).success).toBe(false);
  });

  it("rejects routeCities with fewer than 2 entries", () => {
    const result = surveySchemaV2.safeParse({
      ...validPayload,
      routeCities: ["Chișinău"],
    });
    expect(result.success).toBe(false);
  });

  it("rejects routeCities with more than 2 entries", () => {
    const result = surveySchemaV2.safeParse({
      ...validPayload,
      routeCities: ["Chișinău", "Paris", "Lyon"],
    });
    expect(result.success).toBe(false);
  });

  it("maxSelections computes ceil(n/2)", () => {
    expect(maxSelections(8)).toBe(4);
    expect(maxSelections(7)).toBe(4);
    expect(maxSelections(1)).toBe(1);
  });

  // The ceil(n/2) selection cap is a frontend-only UX nudge (SurveyFormV2.tsx) —
  // the backend enforces no max on these fields, so the schema must not either.
  it("does not enforce a max on multi-select arrays (no backend constraint)", () => {
    const result = surveySchemaV2.safeParse({
      ...validPayload,
      difficulties: [
        "nu_gasesc_rapid",
        "nu_primesc_raspuns",
        "repet_informatii",
        "nu_e_de_incredere",
        "pret_neclar",
        "intarzieri_preluare_livrare",
        "fara_informatii_status",
      ],
      switchReasons: [
        "prefer_mesaje",
        "o_singura_cerere",
        "ajunge_la_relevanti",
        "alternative_automate",
        "compar_usor",
        "tracking_notificari",
        "nimic_prefer_direct",
      ],
    });
    expect(result.success).toBe(true);
  });

  it("rejects opting into testing without a consent checkbox", () => {
    const result = surveySchemaV2.safeParse({
      ...validPayload,
      wantsToTest: "da",
      testPhone: "+373 600 00 000",
      testConsent: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects opting into testing without a phone number", () => {
    const result = surveySchemaV2.safeParse({
      ...validPayload,
      wantsToTest: "da",
      testConsent: true,
    });
    expect(result.success).toBe(false);
  });

  it("accepts opting into testing with phone + consent", () => {
    const result = surveySchemaV2.safeParse({
      ...validPayload,
      wantsToTest: "da",
      testPhone: "+373 600 00 000",
      testConsent: true,
    });
    expect(result.success).toBe(true);
  });

  it("accepts opting out of testing with no phone field at all", () => {
    const result = surveySchemaV2.safeParse({
      ...validPayload,
      wantsToTest: "nu",
    });
    expect(result.success).toBe(true);
  });
});
