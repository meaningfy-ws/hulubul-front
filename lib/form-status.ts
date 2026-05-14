/**
 * Single typed enum for the lifecycle of a form submission. Used by
 * SignupForm and SurveyForm. Lives in `lib/` so any future form gets the
 * same vocabulary without redefining the literal strings.
 */

export const FORM_STATUS = {
  Idle: "idle",
  Submitting: "submitting",
  Success: "success",
  Error: "error",
} as const;

export type FormStatus = (typeof FORM_STATUS)[keyof typeof FORM_STATUS];
