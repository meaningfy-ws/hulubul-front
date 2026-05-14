import { describe, expect, it } from "vitest";
import { humanizeFormError } from "@/lib/form-errors";
import {
  StrapiAuthError,
  StrapiUpstreamError,
} from "@/lib/strapi-client";

const NETWORK_RE = /conexiunea la server/i;
const UPSTREAM_RE = /serverul nu poate prelucra/i;
const DEFAULT = "fallback message";

describe("humanizeFormError", () => {
  it("maps TypeError to the network message", () => {
    expect(humanizeFormError(new TypeError("Failed to fetch"), DEFAULT)).toMatch(
      NETWORK_RE,
    );
  });

  it("maps a 'Failed to fetch' Error to the network message", () => {
    expect(humanizeFormError(new Error("Failed to fetch"), DEFAULT)).toMatch(
      NETWORK_RE,
    );
  });

  it("maps a 'NetworkError' Error to the network message", () => {
    expect(
      humanizeFormError(new Error("NetworkError when attempting to fetch"), DEFAULT),
    ).toMatch(NETWORK_RE);
  });

  it("maps Strapi upstream errors to the upstream message", () => {
    expect(
      humanizeFormError(new Error("Strapi /api/foo failed: 502"), DEFAULT),
    ).toMatch(UPSTREAM_RE);
  });

  it("passes through unknown Error.message verbatim", () => {
    expect(humanizeFormError(new Error("Email invalid"), DEFAULT)).toBe(
      "Email invalid",
    );
  });

  it("returns the default message for non-Error throwables", () => {
    expect(humanizeFormError("weird", DEFAULT)).toBe(DEFAULT);
    expect(humanizeFormError(undefined, DEFAULT)).toBe(DEFAULT);
    expect(humanizeFormError({ kind: "object" }, DEFAULT)).toBe(DEFAULT);
  });

  it("returns the default message for an Error with empty message", () => {
    expect(humanizeFormError(new Error(""), DEFAULT)).toBe(DEFAULT);
  });

  it("maps StrapiUpstreamError to the upstream message via name discriminator", () => {
    expect(
      humanizeFormError(new StrapiUpstreamError("/api/x", 502), DEFAULT),
    ).toMatch(UPSTREAM_RE);
  });

  it("maps StrapiAuthError to the upstream message", () => {
    expect(
      humanizeFormError(new StrapiAuthError("/api/x", 403), DEFAULT),
    ).toMatch(UPSTREAM_RE);
  });
});
