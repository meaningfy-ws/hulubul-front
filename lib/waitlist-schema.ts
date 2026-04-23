import { z } from "zod";

const trimmed = z.string().trim();
const optionalTrimmed = trimmed
  .optional()
  .transform((v) => (v && v.length > 0 ? v : undefined));

export const waitlistSchema = z.object({
  name: trimmed.min(1, "Numele este obligatoriu"),
  email: trimmed
    .min(1, "Email-ul este obligatoriu")
    .email("Email invalid — verifică și încearcă din nou"),
  whatsapp: optionalTrimmed,
  role: z.enum(["expeditor", "transportator", "ambele"]),
  routes: trimmed.min(1, "Ruta (sau rutele) sunt obligatorii"),
});

export type WaitlistPayload = z.infer<typeof waitlistSchema>;
