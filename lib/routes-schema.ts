import { z } from "zod";

export const routePayloadSchema = z.object({
  name: z.string().trim().min(1, "Denumirea este obligatorie"),
  citiesText: z.string().trim().min(1, "Lista de orașe este obligatorie"),
  geoJson: z.any().nullable().optional(),
  status: z.enum(["draft", "approved", "suspended"]).default("approved"),
  submittedBy: z.string().email().nullable().optional(),
  claimedBy: z.string().email().nullable().optional(),
});

export type RoutePayload = z.infer<typeof routePayloadSchema>;

export const geocodeSuggestionSchema = z.object({
  name: z.string(),
  country: z.string(),
  lat: z.number(),
  lon: z.number(),
});

export const geocodeSuggestionsSchema = z.array(geocodeSuggestionSchema);
