import { z } from "zod";

export const Role = z.enum(["expeditor", "transportator", "destinatar"]);
export type Role = z.infer<typeof Role>;

const City = z.string().trim().min(1).max(120);

const LocationGranted = z.object({
  source: z.literal("geolocation"),
  lat: z.number(),
  lon: z.number(),
  accuracyMeters: z.number().nonnegative(),
});
const LocationIp = z.object({
  source: z.literal("ip"),
  city: z.string().nullable(),
  country: z.string().length(2).nullable(),
});
const Location = z.union([LocationGranted, LocationIp]);

const Utm = z.object({
  utm_source: z.string().max(256).optional(),
  utm_medium: z.string().max(256).optional(),
  utm_campaign: z.string().max(256).optional(),
  utm_term: z.string().max(256).optional(),
  utm_content: z.string().max(256).optional(),
  gclid: z.string().max(256).optional(),
  fbclid: z.string().max(256).optional(),
  referrer: z.string().max(2048).optional(),
});

export const waitlistSchema = z.object({
  name: z.string().trim().min(1, "Numele este obligatoriu"),
  email: z
    .string()
    .trim()
    .min(1, "Email-ul este obligatoriu")
    .email("Email invalid — verifică și încearcă din nou"),
  whatsapp: z
    .string()
    .trim()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine(
      (v) => v === undefined || /^(\+|00)[0-9 ]{7,20}$/.test(v),
      {
        message:
          "WhatsApp invalid — folosește format internațional, ex. +352 621 123 456",
      },
    ),
  role: Role,
  cities: z.array(City).min(1, "Adaugă cel puțin un oraș.").max(10),
  source: z
    .enum(["landing", "qr_event", "referral", "other"])
    .optional()
    .default("landing"),

  gdprConsent: z.literal(true, {
    errorMap: () => ({ message: "Trebuie să accepți politica de confidențialitate." }),
  }),
  gdprConsentAt: z.string().datetime(),
  gdprConsentVersion: z.string().min(1).max(64),

  location: Location.nullable().optional(),
  locationConsent: z
    .enum(["granted", "denied", "not_asked"])
    .optional()
    .default("not_asked"),
  utm: Utm.nullable().optional(),
  client: z
    .object({
      viewport: z.object({ w: z.number().int(), h: z.number().int() }).optional(),
      timezone: z.string().max(64).optional(),
    })
    .optional(),
});

export type WaitlistPayload = z.infer<typeof waitlistSchema>;
