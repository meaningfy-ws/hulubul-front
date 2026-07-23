import { z } from "zod";

// ---- Enums (v2 only — deliberately not shared with lib/survey-schema.ts,
// see design.md Decision 2) ----

const trimmed = z.string().trim();
/** Free-text: empty strings become undefined so Strapi stores null. */
const optionalText = trimmed
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

/** Same shape as the `City` entries in lib/waitlist-schema.ts. */
const City = z.string().trim().min(1).max(120);

/** Multi-select cap: at most half (rounded up) of a question's own option count. */
export function maxSelections(optionCount: number): number {
  return Math.ceil(optionCount / 2);
}

export const sendingFrequencyEnumV2 = z.enum([
  "niciodata",
  "rar",
  "cateva_ori_pe_an",
  "la_2_3_luni",
  "lunar_sau_mai_des",
]);
export type SendingFrequencyV2 = z.infer<typeof sendingFrequencyEnumV2>;

export const howFindEnumV2 = z.enum([
  "transportator_cunoscut",
  "recomandare_prieteni",
  "facebook",
  "whatsapp_telegram",
  "google_site",
  "nu_am_trimis",
  "altcineva_organizeaza",
  "altceva",
]);
export type HowFindV2 = z.infer<typeof howFindEnumV2>;

export const searchDurationEnumV2 = z.enum([
  "sub_5_min",
  "5_15_min",
  "15_30_min",
  "30_60_min",
  "cateva_ore",
  "o_zi_sau_mai_mult",
  "nu_se_aplica",
]);
export type SearchDurationV2 = z.infer<typeof searchDurationEnumV2>;

export const difficultyEnumV2 = z.enum([
  "nu_gasesc_rapid",
  "nu_primesc_raspuns",
  "repet_informatii",
  "nu_e_de_incredere",
  "pret_neclar",
  "intarzieri_preluare_livrare",
  "fara_informatii_status",
  "altceva",
]);
export type DifficultyV2 = z.infer<typeof difficultyEnumV2>;

export const decisionCriterionEnumV2 = z.enum([
  "siguranta",
  "pretul",
  "rapiditatea",
  "disponibilitatea",
  "reputatia",
  "l_am_mai_folosit",
  "comunicarea",
  "altceva",
]);
export type DecisionCriterionV2 = z.infer<typeof decisionCriterionEnumV2>;

export const trustSignalEnumV2 = z.enum([
  "recomandare_cunoscut",
  "transportator_verificat",
  "recenzii_reale",
  "pret_clar",
  "tracking_confirmare",
  "suport_problema",
  "altceva",
]);
export type TrustSignalV2 = z.infer<typeof trustSignalEnumV2>;

/** Q7 — merged former channel-preference + why-switch questions. */
export const switchReasonEnumV2 = z.enum([
  "prefer_mesaje",
  "o_singura_cerere",
  "ajunge_la_relevanti",
  "alternative_automate",
  "compar_usor",
  "tracking_notificari",
  "nimic_prefer_direct",
  "altceva",
]);
export type SwitchReasonV2 = z.infer<typeof switchReasonEnumV2>;

/** Q9 — pre-launch testing opt-in. */
export const testingOptInEnumV2 = z.enum(["da", "posibil", "nu"]);
export type TestingOptInV2 = z.infer<typeof testingOptInEnumV2>;

// ---- Main schema ----

export const surveySchemaV2 = z
  .object({
    // Identity (required)
    name: trimmed.min(1, "Numele este obligatoriu"),
    email: trimmed.min(1, "Email-ul este obligatoriu").email("Email invalid"),

    // Route: exactly 2 cities, origin then destination (design.md Decision 3)
    routeCities: z
      .array(City)
      .length(2, "Adaugă orașul de plecare și cel de destinație."),

    // Q1
    sendingFrequency: sendingFrequencyEnumV2,

    // Q2 — no server-side max: the ceil(n/2) cap is a frontend-only UX nudge
    // (SurveyFormV2.tsx), not enforced here or by the backend.
    howFindTransporter: z
      .array(howFindEnumV2)
      .min(1, "Selectează cel puțin o opțiune."),
    howFindTransporterOther: optionalText,

    // Q3
    searchDuration: searchDurationEnumV2,

    // Q4 — no server-side max, see Q2's note.
    difficulties: z
      .array(difficultyEnumV2)
      .min(1, "Selectează cel puțin o opțiune."),
    difficultiesOther: optionalText,

    // Q5 — no server-side max, see Q2's note.
    decisionCriteria: z
      .array(decisionCriterionEnumV2)
      .min(1, "Selectează cel puțin o opțiune."),
    decisionCriteriaOther: optionalText,

    // Q6 — no server-side max, see Q2's note.
    trustSignals: z
      .array(trustSignalEnumV2)
      .min(1, "Selectează cel puțin o opțiune."),
    trustSignalsOther: optionalText,

    // Q7 (merged channel + why-switch) — no server-side max, see Q2's note.
    switchReasons: z
      .array(switchReasonEnumV2)
      .min(1, "Selectează cel puțin o opțiune."),
    switchReasonsOther: optionalText,

    // Q8
    mostImportantThing: trimmed.min(1, "Te rugăm să completezi acest câmp"),

    // Q9 — gated phone + consent, mirrors wantsCallback/callbackPhone in
    // lib/survey-schema.ts
    wantsToTest: testingOptInEnumV2,
    testPhone: optionalText,
    testConsent: z.boolean().optional(),

    // Tracker-cookie consent for server-side conversion dispatch.
    consent: z
      .object({
        analytics: z.enum(["granted", "denied"]),
        marketing: z.enum(["granted", "denied"]),
        recordId: z.string().optional(),
      })
      .optional(),
  })
  .refine(
    (v) =>
      v.wantsToTest === "nu" ||
      (typeof v.testPhone === "string" &&
        v.testPhone.length > 0 &&
        v.testConsent === true),
    {
      message:
        "Ai nevoie de un număr de telefon și de acordul de contactare ca să te înscrii la testare.",
      path: ["testConsent"],
    },
  );

export type SurveyPayloadV2 = z.infer<typeof surveySchemaV2>;
