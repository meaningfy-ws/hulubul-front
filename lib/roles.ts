import { z } from "zod";

/**
 * Single source of truth for user roles across the application.
 *
 * Background: the Strapi `waitlist-submission` content type accepts
 * `expeditor | transportator | ambele | destinatar`, but the frontend
 * intentionally exposes different subsets per context:
 *
 * - **Waitlist** uses `expeditor, transportator, destinatar` (sender,
 *   transporter, receiver). `ambele` is deprecated and never offered.
 * - **Sender survey** uses `expeditor, transportator, ambele` because the
 *   `survey-sender` Strapi enum is exactly these three; `destinatar` is
 *   not surveyed.
 *
 * Both schemas import from this module so the two role sets and their
 * Zod enums are explicit, audited, and never drift apart silently.
 */

export const ALL_ROLES = [
  "expeditor",
  "transportator",
  "ambele",
  "destinatar",
] as const;
export type Role = (typeof ALL_ROLES)[number];
export const allRoleEnum = z.enum(ALL_ROLES);

export const WAITLIST_ROLES = [
  "expeditor",
  "transportator",
  "destinatar",
] as const;
export type WaitlistRole = (typeof WAITLIST_ROLES)[number];
export const waitlistRoleEnum = z.enum(WAITLIST_ROLES);

export const SURVEY_ROLES = ["expeditor", "transportator", "ambele"] as const;
export type SurveyRole = (typeof SURVEY_ROLES)[number];
export const surveyRoleEnum = z.enum(SURVEY_ROLES);

/**
 * Returns `value` if it belongs to `valid`, otherwise `fallback`. Replaces
 * the two near-identical `parseRole` helpers that used to live in
 * SignupForm.tsx and SurveyForm.tsx.
 */
export function parseRoleIn<R extends string>(
  value: string | null | undefined,
  valid: readonly R[],
  fallback: R,
): R {
  if (value && (valid as readonly string[]).includes(value)) return value as R;
  return fallback;
}

/** Type guard for the full role set. */
export function isRole(value: unknown): value is Role {
  return typeof value === "string" && (ALL_ROLES as readonly string[]).includes(value);
}
