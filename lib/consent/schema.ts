import { z } from "zod";

const decisionSchema = z.enum(["granted", "denied"]);

/**
 * Zod schema for the `/api/consent` request body. Mirrors the Strapi
 * `consent-record` collection-type fields. The route handler augments
 * the validated payload with userAgent/language/country/referrer
 * server-side.
 */
export const consentSubmissionSchema = z.object({
  sessionId: z.string().min(1).max(64),
  analytics: decisionSchema,
  marketing: decisionSchema,
  version: z.string().min(1).max(32),
  event: z.enum(["grant", "update", "withdraw"]),
  choseAt: z.string().datetime(),
});

export type ConsentSubmission = z.infer<typeof consentSubmissionSchema>;
