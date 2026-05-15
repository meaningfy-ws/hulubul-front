import { describe, expect, it } from "vitest";
import {
  ErrorCode,
  codeForUpstreamStatus,
  httpStatusForCode,
} from "@/lib/errors/codes";

describe("codeForUpstreamStatus", () => {
  it("maps a 0 status (fetch threw / network) to UPSTREAM_DOWN", () => {
    expect(codeForUpstreamStatus(0)).toBe(ErrorCode.UpstreamDown);
  });

  it("maps 400 to UPSTREAM_VALIDATION", () => {
    expect(codeForUpstreamStatus(400)).toBe(ErrorCode.UpstreamValidation);
  });

  it("maps 401 and 403 to AUTH_MISCONFIG", () => {
    expect(codeForUpstreamStatus(401)).toBe(ErrorCode.AuthMisconfig);
    expect(codeForUpstreamStatus(403)).toBe(ErrorCode.AuthMisconfig);
  });

  it("maps 404 to NOT_FOUND", () => {
    expect(codeForUpstreamStatus(404)).toBe(ErrorCode.NotFound);
  });

  it("maps 409 to ALREADY_REGISTERED", () => {
    expect(codeForUpstreamStatus(409)).toBe(ErrorCode.AlreadyRegistered);
  });

  it("maps 429 to RATE_LIMITED", () => {
    expect(codeForUpstreamStatus(429)).toBe(ErrorCode.RateLimited);
  });

  it("maps every 5xx to UPSTREAM_DOWN", () => {
    for (const s of [500, 502, 503, 504]) {
      expect(codeForUpstreamStatus(s)).toBe(ErrorCode.UpstreamDown);
    }
  });

  it("maps an unrecognised 4xx to UNKNOWN", () => {
    expect(codeForUpstreamStatus(418)).toBe(ErrorCode.Unknown);
  });
});

describe("httpStatusForCode", () => {
  it("maps each code to the HTTP status the route should return", () => {
    expect(httpStatusForCode(ErrorCode.UpstreamDown)).toBe(503);
    expect(httpStatusForCode(ErrorCode.UpstreamValidation)).toBe(422);
    expect(httpStatusForCode(ErrorCode.AlreadyRegistered)).toBe(409);
    expect(httpStatusForCode(ErrorCode.RateLimited)).toBe(429);
    expect(httpStatusForCode(ErrorCode.AuthMisconfig)).toBe(500);
    expect(httpStatusForCode(ErrorCode.NotFound)).toBe(404);
    expect(httpStatusForCode(ErrorCode.ClientValidation)).toBe(400);
    expect(httpStatusForCode(ErrorCode.Unknown)).toBe(502);
  });
});
