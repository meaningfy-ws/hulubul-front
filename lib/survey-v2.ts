import { strapiFetch, throwStrapiError } from "./strapi-client";
import type { SurveyPayloadV2 } from "./survey-schema-v2";

// Backend collection is a sibling of `survey-sender`, not an extension of
// it (design.md Decision 4-old/5). Path per the hand-off spec in
// design/spec-survey-sender-v2-backend.md.
export async function submitSurveyV2(payload: SurveyPayloadV2): Promise<void> {
  const path = "/api/survey-sender-v2s";
  const res = await strapiFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: payload }),
  });
  if (!res.ok) throwStrapiError(path, res);
}
