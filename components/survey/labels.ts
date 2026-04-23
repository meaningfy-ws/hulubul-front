// Romanian labels for every enum value rendered in the survey UI.
// Keep labels here (not in the CMS) so the frontend can evolve the wording
// without a backend deploy. Enum keys must match the backend schema exactly.

import type {
  ContactedCount,
  HowFind,
  IssueExperienced,
  PackageType,
  PainPoint,
  Role,
  SafetyPriceAttitude,
  SearchDuration,
  SelectionCriterion,
  SendingFrequency,
  TrustSignal,
} from "@/lib/survey-schema";

type Labels<K extends string> = ReadonlyArray<{ value: K; label: string }>;

export const roleLabels: Labels<Role> = [
  { value: "expeditor", label: "Trimit pachete" },
  { value: "transportator", label: "Sunt transportator" },
  { value: "ambele", label: "Ambele" },
];

export const sendingFrequencyLabels: Labels<SendingFrequency> = [
  { value: "niciodata", label: "Niciodată" },
  { value: "rar", label: "Rar" },
  { value: "cateva_ori_pe_an", label: "De câteva ori pe an" },
  { value: "lunar", label: "Lunar" },
  { value: "mai_des", label: "Mai des de atât" },
];

export const packageTypeLabels: Labels<PackageType> = [
  { value: "alimente", label: "Alimente" },
  { value: "haine", label: "Haine" },
  { value: "electronice", label: "Electronice" },
  { value: "documente", label: "Documente" },
  { value: "altele", label: "Altele" },
];

export const howFindLabels: Labels<HowFind> = [
  { value: "grup_facebook", label: "Grup de Facebook" },
  { value: "recomandare", label: "Recomandare" },
  { value: "cunosc_personal", label: "Îl cunosc personal" },
  { value: "altul", label: "Alt mod" },
];

export const searchDurationLabels: Labels<SearchDuration> = [
  { value: "sub_o_ora", label: "Sub o oră" },
  { value: "cateva_ore", label: "Câteva ore" },
  { value: "una_doua_zile", label: "Una-două zile" },
  { value: "mai_mult", label: "Mai mult de două zile" },
];

export const contactedCountLabels: Labels<ContactedCount> = [
  { value: "unul", label: "Un singur transportator" },
  { value: "doi_trei", label: "Doi-trei" },
  { value: "mai_multi", label: "Mai mulți" },
];

export const selectionCriterionLabels: Labels<SelectionCriterion> = [
  { value: "pret", label: "Preț" },
  { value: "siguranta", label: "Siguranță" },
  { value: "viteza", label: "Viteză" },
  { value: "reputatie", label: "Reputație" },
  { value: "recomandare", label: "Recomandare" },
];

export const safetyPriceAttitudeLabels: Labels<SafetyPriceAttitude> = [
  { value: "nu", label: "Nu, aleg cel mai ieftin" },
  { value: "uneori", label: "Uneori, depinde" },
  { value: "da_depinde", label: "Da, aleg mai scump dacă e mai sigur" },
];

export const painPointLabels: Labels<PainPoint> = [
  { value: "gasit_transportator", label: "Găsit un transportator" },
  { value: "negociere_pret", label: "Negocierea prețului" },
  { value: "comunicare", label: "Comunicarea" },
  { value: "siguranta", label: "Siguranța pachetului" },
  { value: "intarzieri", label: "Întârzierile" },
  { value: "altele", label: "Altele" },
];

export const issueExperiencedLabels: Labels<IssueExperienced> = [
  { value: "intarzieri", label: "Întârzieri" },
  { value: "lipsa_comunicare", label: "Lipsă de comunicare" },
];

export const trustSignalLabels: Labels<TrustSignal> = [
  { value: "recomandare_prieteni", label: "Recomandare de la prieteni" },
  { value: "profil_verificat", label: "Profil verificat" },
  { value: "recenzii", label: "Recenzii reale" },
  { value: "altceva", label: "Altceva" },
];
