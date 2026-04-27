export type Role = "expeditor" | "transportator" | "destinatar";

export interface StrapiMediaFormat {
  url: string;
  width: number;
  height: number;
}

export interface StrapiMedia {
  id: number;
  documentId: string;
  url: string;
  alternativeText: string | null;
  width: number;
  height: number;
  formats?: {
    thumbnail?: StrapiMediaFormat;
    small?: StrapiMediaFormat;
    medium?: StrapiMediaFormat;
    large?: StrapiMediaFormat;
  };
}

export interface SeoComponent {
  metaTitle: string;
  metaDescription: string;
  shareImage?: StrapiMedia | null;
}

export interface NavComponent {
  logoText: string;
  logoAccent?: string;
  logoMark?: string;
  ctaLabel: string;
  ctaHref: string;
}

export interface PostcardLine {
  id: number;
  text: string;
}

export interface HeroComponent {
  eyebrow?: string;
  titleLead: string;
  titleEmphasis: string;
  subtitle?: string;
  primaryCtaLabel: string;
  primaryCtaHref: string;
  socialProofText?: string;
  stampLabel?: string;
  stampGlyph?: string;
  postmarkCity?: string;
  postmarkYear?: string;
  postmarkLabel?: string;
  handwrittenLines: PostcardLine[];
  routeFromCity?: string;
  routeFromMeta?: string;
  routeToCity?: string;
  routeToMeta?: string;
}

export interface NumberedCard {
  id: number;
  number: string;
  title: string;
  description: string;
}

export interface ProblemSection {
  label: string;
  titleLead: string;
  titleEmphasis: string;
  intro?: string;
  cards: NumberedCard[];
}

export interface StepItem {
  id: number;
  number: string;
  title: string;
  description: string;
}

export interface HowItWorksSection {
  label: string;
  titleLead: string;
  titleEmphasis: string;
  intro?: string;
  steps: StepItem[];
  note?: string;
}

export interface AudienceCard {
  id: number;
  iconEmoji: string;
  titleLead: string;
  titleEmphasis: string;
  description: string;
  linkLabel: string;
  linkHref: string;
  role: Role;
}

export interface AudienceSection {
  label: string;
  titleLead: string;
  titleEmphasis: string;
  cards: AudienceCard[];
}

export interface TrustItem {
  id: number;
  glyph: string;
  title: string;
  description: string;
}

export interface TrustSection {
  label: string;
  titleLead: string;
  titleEmphasis: string;
  items: TrustItem[];
}

export interface RoleOption {
  id: number;
  value: Role;
  label: string;
  icon?: string;
}

export interface SignupSection {
  label: string;
  titleLead: string;
  titleEmphasis: string;
  titleTrail?: string;
  intro?: string;
  nameLabel: string;
  nameHint?: string;
  namePlaceholder?: string;
  contactLabel: string;
  contactPlaceholder?: string;
  roleLabel: string;
  roleOptions: RoleOption[];
  roleDefault?: Role;
  routeLabel: string;
  routeHint?: string;
  routePlaceholder?: string;
  submitLabel: string;
  privacyNote?: string;
  successTitle: string;
  successMessage: string;
}

export interface FaqItem {
  id: number;
  question: string;
  answer: string;
}

export interface FaqSection {
  label: string;
  titleLead: string;
  titleEmphasis: string;
  titleTrail?: string;
  items: FaqItem[];
}

export interface FooterLink {
  id: number;
  label: string;
  href: string;
  external?: boolean;
}

export interface FooterColumn {
  id: number;
  title: string;
  links: FooterLink[];
}

export interface FooterSection {
  logoText: string;
  logoAccent?: string;
  logoMark?: string;
  tagline?: string;
  columns: FooterColumn[];
  copyrightText: string;
  locationLine?: string;
}

export interface LandingPage {
  id: number;
  documentId: string;
  seo: SeoComponent;
  nav: NavComponent;
  hero: HeroComponent;
  problem: ProblemSection;
  howItWorks: HowItWorksSection;
  audience: AudienceSection;
  trust: TrustSection;
  signup: SignupSection;
  faq: FaqSection;
  footer: FooterSection;
}
