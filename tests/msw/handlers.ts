import { HttpResponse, http } from "msw";
import { landingPageFixture } from "./fixtures/landing-page";

export const TEST_STRAPI_URL = "https://strapi.test";

export const handlers = [
  http.get(`${TEST_STRAPI_URL}/api/landing-page`, () =>
    HttpResponse.json({ data: landingPageFixture, meta: {} }),
  ),
  http.post(`${TEST_STRAPI_URL}/api/waitlist-submissions`, async ({ request }) => {
    const body = (await request.json()) as { data?: Record<string, unknown> };
    return HttpResponse.json(
      { data: { id: 1, documentId: "abc", ...(body.data ?? {}) }, meta: {} },
      { status: 200 },
    );
  }),
  http.post(`${TEST_STRAPI_URL}/api/survey-senders`, async ({ request }) => {
    const body = (await request.json()) as { data?: Record<string, unknown> };
    return HttpResponse.json(
      { data: { id: 1, documentId: "def", ...(body.data ?? {}) }, meta: {} },
      { status: 201 },
    );
  }),
  http.post(`${TEST_STRAPI_URL}/api/survey-sender-v2s`, async ({ request }) => {
    const body = (await request.json()) as { data?: Record<string, unknown> };
    return HttpResponse.json(
      { data: { id: 1, documentId: "ghi", ...(body.data ?? {}) }, meta: {} },
      { status: 201 },
    );
  }),
];
