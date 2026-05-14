import { strapiFetch, throwStrapiError } from "./strapi-client";
import type { SurveyPayload } from "./survey-schema";

export async function submitSurvey(payload: SurveyPayload): Promise<void> {
  const path = "/api/survey-senders";
  const res = await strapiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: payload }),
  });
  if (!res.ok) throwStrapiError(path, res);
}
