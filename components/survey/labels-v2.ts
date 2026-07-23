// Locale-keyed labels for the v2 sender survey (design.md Decision 4).
// Every question/option/hint lives here, keyed by locale — no hardcoded
// copy in SurveyFormV2.tsx. Enum keys must match lib/survey-schema-v2.ts.

import type {
  DecisionCriterionV2,
  DifficultyV2,
  HowFindV2,
  SearchDurationV2,
  SendingFrequencyV2,
  SwitchReasonV2,
  TestingOptInV2,
  TrustSignalV2,
} from "@/lib/survey-schema-v2";

export type SurveyV2Locale = "ro" | "en" | "ru" | "fr";
export const SURVEY_V2_LOCALES: readonly SurveyV2Locale[] = [
  "ro",
  "en",
  "ru",
  "fr",
];

type Options<K extends string> = ReadonlyArray<{ value: K; label: string }>;

export interface SurveyV2Copy {
  routeQuestion: string;
  routeHint: string;
  sendingFrequencyQuestion: string;
  sendingFrequencyOptions: Options<SendingFrequencyV2>;
  howFindQuestion: string;
  howFindOptions: Options<HowFindV2>;
  searchDurationQuestion: string;
  searchDurationOptions: Options<SearchDurationV2>;
  difficultiesQuestion: string;
  difficultiesOptions: Options<DifficultyV2>;
  decisionCriteriaQuestion: string;
  decisionCriteriaOptions: Options<DecisionCriterionV2>;
  trustSignalsQuestion: string;
  trustSignalsOptions: Options<TrustSignalV2>;
  switchReasonsQuestion: string;
  switchReasonsOptions: Options<SwitchReasonV2>;
  mostImportantThingQuestion: string;
  testingQuestion: string;
  testingOptions: Options<TestingOptInV2>;
  testPhoneLabel: string;
  testConsentLabel: string;
  otherPlaceholder: string;
  submitLabel: string;
  submittingLabel: string;
  /** Frontend-only UX hint appended to a multi-select's question label — not a validated rule. */
  maxSelectionsLabel: (n: number) => string;
}

const ro: SurveyV2Copy = {
  routeQuestion: "De unde trimiți și unde trebuie să ajungă coletul?",
  routeHint: "Primul oraș = de unde pleacă. Al doilea = unde ajunge.",
  sendingFrequencyQuestion: "Cât de des trimiți colete acasă?",
  sendingFrequencyOptions: [
    { value: "niciodata", label: "Niciodată" },
    { value: "rar", label: "Rar" },
    { value: "cateva_ori_pe_an", label: "De câteva ori pe an" },
    { value: "la_2_3_luni", label: "La 2–3 luni" },
    { value: "lunar_sau_mai_des", label: "Lunar sau mai des" },
  ],
  howFindQuestion: "Cum găsești de obicei un transportator?",
  howFindOptions: [
    { value: "transportator_cunoscut", label: "Contactez un transportator cunoscut" },
    { value: "recomandare_prieteni", label: "Recomandare de la prieteni sau rude" },
    { value: "facebook", label: "Facebook (grup sau pagină)" },
    { value: "whatsapp_telegram", label: "WhatsApp sau Telegram" },
    { value: "google_site", label: "Google sau alte site-uri" },
    { value: "nu_am_trimis", label: "Nu se aplică, nu am trimis încă un colet" },
    { value: "altcineva_organizeaza", label: "Altcineva organizează expedierea pentru mine" },
    { value: "altceva", label: "Altceva" },
  ],
  searchDurationQuestion: "Cât timp îți ia să găsești și să confirmi un transportator?",
  searchDurationOptions: [
    { value: "sub_5_min", label: "Sub 5 minute" },
    { value: "5_15_min", label: "5–15 minute" },
    { value: "15_30_min", label: "15–30 minute" },
    { value: "30_60_min", label: "30–60 minute" },
    { value: "cateva_ore", label: "Câteva ore" },
    { value: "o_zi_sau_mai_mult", label: "O zi sau mai mult" },
    { value: "nu_se_aplica", label: "Nu se aplică" },
  ],
  difficultiesQuestion: "Care sunt cele mai mari dificultăți când trimiți un colet?",
  difficultiesOptions: [
    { value: "nu_gasesc_rapid", label: "Nu găsesc rapid un transportator pentru ruta mea" },
    { value: "nu_primesc_raspuns", label: "Nu primesc răspuns sau răspunsul vine prea târziu" },
    { value: "repet_informatii", label: "Trebuie să repet aceleași informații fiecărui transportator" },
    { value: "nu_e_de_incredere", label: "Nu știu dacă transportatorul este de încredere" },
    { value: "pret_neclar", label: "Prețul sau condițiile nu sunt clare" },
    { value: "intarzieri_preluare_livrare", label: "Întârzieri sau probleme la preluare/livrare" },
    { value: "fara_informatii_status", label: "Nu am informații despre starea coletului" },
    { value: "altceva", label: "Altceva" },
  ],
  decisionCriteriaQuestion: "Ce contează cel mai mult când alegi un transportator?",
  decisionCriteriaOptions: [
    { value: "siguranta", label: "Siguranța" },
    { value: "pretul", label: "Prețul" },
    { value: "rapiditatea", label: "Rapiditatea" },
    { value: "disponibilitatea", label: "Disponibilitatea" },
    { value: "reputatia", label: "Reputația sau recenziile" },
    { value: "l_am_mai_folosit", label: "Faptul că l-am mai folosit" },
    { value: "comunicarea", label: "Comunicarea" },
    { value: "altceva", label: "Altceva" },
  ],
  trustSignalsQuestion: "Ce te convinge că un transportator sau o platformă este de încredere?",
  trustSignalsOptions: [
    { value: "recomandare_cunoscut", label: "Recomandare de la cineva cunoscut" },
    { value: "transportator_verificat", label: "Transportator verificat" },
    { value: "recenzii_reale", label: "Recenzii reale" },
    { value: "pret_clar", label: "Preț clar" },
    { value: "tracking_confirmare", label: "Tracking sau confirmare la livrare" },
    { value: "suport_problema", label: "Suport dacă apare o problemă" },
    { value: "altceva", label: "Altceva" },
  ],
  switchReasonsQuestion:
    "Ce te-ar determina să folosești o soluție nouă (aplicație sau WhatsApp) în loc să contactezi direct transportatorul?",
  switchReasonsOptions: [
    { value: "prefer_mesaje", label: "Prefer să comunic prin WhatsApp sau Telegram, nu la telefon" },
    { value: "o_singura_cerere", label: "Trimit o singură cerere, fără să repet informațiile" },
    { value: "ajunge_la_relevanti", label: "Cererea ajunge la transportatori relevanți pentru ruta mea" },
    { value: "alternative_automate", label: "Primesc alternative dacă transportatorul nu răspunde" },
    { value: "compar_usor", label: "Pot compara mai ușor prețurile și ofertele" },
    { value: "tracking_notificari", label: "Am tracking și notificări pentru colet" },
    { value: "nimic_prefer_direct", label: "Nimic, aș prefera contactul direct" },
    { value: "altceva", label: "Altceva" },
  ],
  mostImportantThingQuestion:
    "Care este un singur lucru pe care această soluție trebuie să îl facă foarte bine ca să o folosești de fiecare dată?",
  testingQuestion: "Vrei să testezi platforma Hulubul înainte de lansare?",
  testingOptions: [
    { value: "da", label: "Da, vreau să particip" },
    { value: "posibil", label: "Posibil, vreau mai multe informații" },
    { value: "nu", label: "Nu în această etapă" },
  ],
  testPhoneLabel: "Număr de telefon (WhatsApp sau Telegram)",
  testConsentLabel:
    "Sunt de acord ca echipa Hulubul să mă contacteze exclusiv în legătură cu testarea Alpha.",
  otherPlaceholder: "Descrie — altceva",
  submitLabel: "Trimite răspunsurile",
  submittingLabel: "Se trimite...",
  maxSelectionsLabel: (n) => `(max. ${n})`,
};

const en: SurveyV2Copy = {
  routeQuestion: "Where do you send from, and where does the package need to arrive?",
  routeHint: "First city = where it leaves from. Second = where it arrives.",
  sendingFrequencyQuestion: "How often do you send packages home?",
  sendingFrequencyOptions: [
    { value: "niciodata", label: "Never" },
    { value: "rar", label: "Rarely" },
    { value: "cateva_ori_pe_an", label: "A few times a year" },
    { value: "la_2_3_luni", label: "Every 2–3 months" },
    { value: "lunar_sau_mai_des", label: "Monthly or more often" },
  ],
  howFindQuestion: "How do you usually find a carrier?",
  howFindOptions: [
    { value: "transportator_cunoscut", label: "I contact a carrier I already know" },
    { value: "recomandare_prieteni", label: "Recommendation from friends or family" },
    { value: "facebook", label: "Facebook (group or page)" },
    { value: "whatsapp_telegram", label: "WhatsApp or Telegram" },
    { value: "google_site", label: "Google or other websites" },
    { value: "nu_am_trimis", label: "Not applicable, I haven't sent a package yet" },
    { value: "altcineva_organizeaza", label: "Someone else arranges the shipping for me" },
    { value: "altceva", label: "Other" },
  ],
  searchDurationQuestion: "How long does it take you to find and confirm a carrier?",
  searchDurationOptions: [
    { value: "sub_5_min", label: "Under 5 minutes" },
    { value: "5_15_min", label: "5–15 minutes" },
    { value: "15_30_min", label: "15–30 minutes" },
    { value: "30_60_min", label: "30–60 minutes" },
    { value: "cateva_ore", label: "A few hours" },
    { value: "o_zi_sau_mai_mult", label: "A day or more" },
    { value: "nu_se_aplica", label: "Not applicable" },
  ],
  difficultiesQuestion: "What are the biggest difficulties when sending a package?",
  difficultiesOptions: [
    { value: "nu_gasesc_rapid", label: "I can't quickly find a carrier for my route" },
    { value: "nu_primesc_raspuns", label: "I get no reply, or it comes too late" },
    { value: "repet_informatii", label: "I have to repeat the same info to every carrier" },
    { value: "nu_e_de_incredere", label: "I don't know if the carrier is trustworthy" },
    { value: "pret_neclar", label: "The price or terms aren't clear" },
    { value: "intarzieri_preluare_livrare", label: "Delays or issues at pickup/delivery" },
    { value: "fara_informatii_status", label: "I have no information about the package's status" },
    { value: "altceva", label: "Other" },
  ],
  decisionCriteriaQuestion: "What matters most when choosing a carrier?",
  decisionCriteriaOptions: [
    { value: "siguranta", label: "Safety" },
    { value: "pretul", label: "Price" },
    { value: "rapiditatea", label: "Speed" },
    { value: "disponibilitatea", label: "Availability" },
    { value: "reputatia", label: "Reputation or reviews" },
    { value: "l_am_mai_folosit", label: "I've used them before" },
    { value: "comunicarea", label: "Communication" },
    { value: "altceva", label: "Other" },
  ],
  trustSignalsQuestion: "What convinces you a carrier or platform is trustworthy?",
  trustSignalsOptions: [
    { value: "recomandare_cunoscut", label: "Recommendation from someone I know" },
    { value: "transportator_verificat", label: "Verified carrier" },
    { value: "recenzii_reale", label: "Real reviews" },
    { value: "pret_clar", label: "Clear pricing" },
    { value: "tracking_confirmare", label: "Tracking or delivery confirmation" },
    { value: "suport_problema", label: "Support if something goes wrong" },
    { value: "altceva", label: "Other" },
  ],
  switchReasonsQuestion:
    "What would make you use a new solution (app or WhatsApp) instead of contacting a carrier directly?",
  switchReasonsOptions: [
    { value: "prefer_mesaje", label: "I'd rather message than call" },
    { value: "o_singura_cerere", label: "I send one request without repeating info" },
    { value: "ajunge_la_relevanti", label: "My request reaches carriers relevant to my route" },
    { value: "alternative_automate", label: "I get alternatives if a carrier doesn't respond" },
    { value: "compar_usor", label: "I can compare prices and offers more easily" },
    { value: "tracking_notificari", label: "I get tracking and notifications" },
    { value: "nimic_prefer_direct", label: "Nothing, I'd rather contact them directly" },
    { value: "altceva", label: "Other" },
  ],
  mostImportantThingQuestion:
    "What's the one thing this solution needs to do really well for you to use it every time?",
  testingQuestion: "Would you like to test the Hulubul platform before launch?",
  testingOptions: [
    { value: "da", label: "Yes, I want to participate" },
    { value: "posibil", label: "Maybe, I'd like more information" },
    { value: "nu", label: "Not at this stage" },
  ],
  testPhoneLabel: "Phone number (WhatsApp or Telegram)",
  testConsentLabel:
    "I agree that the Hulubul team may contact me solely about Alpha testing.",
  otherPlaceholder: "Describe — other",
  submitLabel: "Submit answers",
  submittingLabel: "Submitting...",
  maxSelectionsLabel: (n) => `(max ${n})`,
};

// ru/fr: structural slots only (design.md Decision 4) — no native
// translation exists yet, so these fall back to English until supplied.
// ponytail: EN fallback, replace with native ru/fr copy once available.
const ru: SurveyV2Copy = en;
const fr: SurveyV2Copy = en;

export const SURVEY_V2_COPY: Record<SurveyV2Locale, SurveyV2Copy> = {
  ro,
  en,
  ru,
  fr,
};

export function resolveSurveyV2Locale(value: string | null): SurveyV2Locale {
  if (value && (SURVEY_V2_LOCALES as readonly string[]).includes(value)) {
    return value as SurveyV2Locale;
  }
  return "ro";
}
