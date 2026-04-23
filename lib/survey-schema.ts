import { z } from "zod";

// ---- Enums (mirror backend exactly) ----

export const roleEnum = z.enum(["expeditor", "transportator", "ambele"]);
export type Role = z.infer<typeof roleEnum>;

export const sourceEnum = z.enum([
  "waitlist_followup",
  "standalone",
  "other",
]);
export type Source = z.infer<typeof sourceEnum>;

export const sendingFrequencyEnum = z.enum([
  "niciodata",
  "rar",
  "cateva_ori_pe_an",
  "lunar",
  "mai_des",
]);
export type SendingFrequency = z.infer<typeof sendingFrequencyEnum>;

export const packageTypeEnum = z.enum([
  "alimente",
  "haine",
  "electronice",
  "documente",
  "altele",
]);
export type PackageType = z.infer<typeof packageTypeEnum>;

export const howFindEnum = z.enum([
  "grup_facebook",
  "recomandare",
  "cunosc_personal",
  "altul",
]);
export type HowFind = z.infer<typeof howFindEnum>;

export const searchDurationEnum = z.enum([
  "sub_o_ora",
  "cateva_ore",
  "una_doua_zile",
  "mai_mult",
]);
export type SearchDuration = z.infer<typeof searchDurationEnum>;

export const contactedCountEnum = z.enum(["unul", "doi_trei", "mai_multi"]);
export type ContactedCount = z.infer<typeof contactedCountEnum>;

export const selectionCriterionEnum = z.enum([
  "pret",
  "siguranta",
  "viteza",
  "reputatie",
  "recomandare",
]);
export type SelectionCriterion = z.infer<typeof selectionCriterionEnum>;

export const safetyPriceAttitudeEnum = z.enum(["nu", "uneori", "da_depinde"]);
export type SafetyPriceAttitude = z.infer<typeof safetyPriceAttitudeEnum>;

export const painPointEnum = z.enum([
  "gasit_transportator",
  "negociere_pret",
  "comunicare",
  "siguranta",
  "intarzieri",
  "altele",
]);
export type PainPoint = z.infer<typeof painPointEnum>;

export const issueExperiencedEnum = z.enum(["intarzieri", "lipsa_comunicare"]);
export type IssueExperienced = z.infer<typeof issueExperiencedEnum>;

export const trustSignalEnum = z.enum([
  "recomandare_prieteni",
  "profil_verificat",
  "recenzii",
  "altceva",
]);
export type TrustSignal = z.infer<typeof trustSignalEnum>;

// ---- Helpers ----

const trimmed = z.string().trim();
/** Free-text: empty strings become undefined so Strapi stores null. */
const optionalText = trimmed
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

// ---- Main schema ----

export const surveySchema = z
  .object({
    // Identity (required)
    name: trimmed.min(1, "Numele este obligatoriu"),
    email: trimmed
      .min(1, "Email-ul este obligatoriu")
      .email("Email invalid"),
    whatsapp: optionalText,
    role: roleEnum,
    routes: optionalText,
    source: sourceEnum,

    // Context
    sendingFrequency: sendingFrequencyEnum.optional(),
    packageTypes: z.array(packageTypeEnum).optional(),
    packageTypesOther: optionalText,

    // Process
    howFindTransporter: z.array(howFindEnum).optional(),
    howFindTransporterOther: optionalText,
    searchDuration: searchDurationEnum.optional(),
    contactedCount: contactedCountEnum.optional(),

    // Decision
    selectionCriteria: z.array(selectionCriterionEnum).max(5).optional(),
    safetyPriceAttitude: safetyPriceAttitudeEnum.optional(),

    // Problems
    painPointsStructured: z.array(painPointEnum).optional(),
    painPointDetails: optionalText,
    issuesExperienced: z.array(issueExperiencedEnum).optional(),

    // Trust
    trustSignals: z.array(trustSignalEnum).optional(),
    platformTrustRequirements: optionalText,

    // Ideal
    idealExperience: optionalText,
    biggestTimeSaver: optionalText,

    // Validation
    willShipSoon: z.boolean().optional(),
    wantsCallback: z.boolean().optional(),
    callbackPhone: optionalText,
  })
  .refine(
    (v) =>
      !v.wantsCallback ||
      (typeof v.callbackPhone === "string" && v.callbackPhone.length > 0),
    {
      message: "Numărul de telefon este obligatoriu dacă vrei să te sunăm.",
      path: ["callbackPhone"],
    },
  );

export type SurveyPayload = z.infer<typeof surveySchema>;
