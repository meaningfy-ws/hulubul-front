import type { SurveyPayload } from "./survey-schema";

function strapiUrl(): string {
  const url = process.env.NEXT_PUBLIC_STRAPI_URL;
  if (!url) throw new Error("NEXT_PUBLIC_STRAPI_URL is not set");
  return url.replace(/\/$/, "");
}

function authHeaders(): Record<string, string> {
  const token = process.env.STRAPI_API_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function submitSurvey(payload: SurveyPayload): Promise<void> {
  const res = await fetch(`${strapiUrl()}/api/survey-responses`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
    },
    body: JSON.stringify({ data: payload }),
    cache: "no-store",
  });

  if (res.status === 401 || res.status === 403) {
    throw new Error(
      `Strapi refused the survey submission (${res.status}). Verify STRAPI_API_TOKEN has create permission on survey-response.`,
    );
  }
  if (!res.ok) {
    throw new Error(`Strapi /api/survey-responses failed: ${res.status}`);
  }
}
