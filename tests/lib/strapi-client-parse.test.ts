import { describe, expect, it } from "vitest";
import {
  StrapiAuthError,
  StrapiNotFoundError,
  StrapiUpstreamError,
  StrapiValidationError,
  isStrapiValidationError,
  parseStrapiError,
} from "@/lib/strapi-client";

function strapiErrorResponse(
  status: number,
  body: unknown,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("parseStrapiError", () => {
  it("returns a StrapiValidationError on 400 carrying Strapi's message and field details", async () => {
    const res = strapiErrorResponse(400, {
      data: null,
      error: {
        status: 400,
        name: "ValidationError",
        message: "This attribute must be unique",
        details: {
          errors: [
            { path: ["email"], message: "This attribute must be unique" },
          ],
        },
      },
    });

    const err = await parseStrapiError("/api/waitlist-submissions", res);

    expect(err).toBeInstanceOf(StrapiValidationError);
    expect(isStrapiValidationError(err)).toBe(true);
    expect(err.status).toBe(400);
    expect(err.path).toBe("/api/waitlist-submissions");
    expect(err.upstreamMessage).toBe("This attribute must be unique");
    expect(err.details).toEqual([
      { path: "email", message: "This attribute must be unique" },
    ]);
  });

  it("returns StrapiAuthError on 401/403", async () => {
    const e401 = await parseStrapiError("/x", strapiErrorResponse(401, {}));
    const e403 = await parseStrapiError("/x", strapiErrorResponse(403, {}));
    expect(e401).toBeInstanceOf(StrapiAuthError);
    expect(e403).toBeInstanceOf(StrapiAuthError);
  });

  it("returns StrapiNotFoundError on 404", async () => {
    const err = await parseStrapiError("/x", strapiErrorResponse(404, {}));
    expect(err).toBeInstanceOf(StrapiNotFoundError);
  });

  it("returns StrapiUpstreamError on 5xx and preserves the real status", async () => {
    const err = await parseStrapiError("/x", strapiErrorResponse(502, {}));
    expect(err).toBeInstanceOf(StrapiUpstreamError);
    expect(err.status).toBe(502);
  });

  it("never throws on a non-JSON body — still classifies by status", async () => {
    const res = new Response("<html>502 Bad Gateway</html>", { status: 502 });
    const err = await parseStrapiError("/x", res);
    expect(err).toBeInstanceOf(StrapiUpstreamError);
    expect(err.details).toBeUndefined();
  });

  it("StrapiValidationError carries name/path/status=400", () => {
    const err = new StrapiValidationError("/api/foo");
    expect(err.name).toBe("StrapiValidationError");
    expect(err.path).toBe("/api/foo");
    expect(err.status).toBe(400);
  });
});
