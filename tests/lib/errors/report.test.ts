import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorCode } from "@/lib/errors/codes";
import { parseErrorResponse, reportClientError } from "@/lib/errors/report";

describe("parseErrorResponse", () => {
  it("extracts the structured error from a {ok:false,error:{…}} envelope", () => {
    const parsed = parseErrorResponse({
      ok: false,
      error: {
        code: "ALREADY_REGISTERED",
        message: "Ești deja înscris…",
        upstreamStatus: 400,
        requestId: "req-1",
      },
    });
    expect(parsed).toEqual({
      code: ErrorCode.AlreadyRegistered,
      message: "Ești deja înscris…",
      upstreamStatus: 400,
      requestId: "req-1",
      details: undefined,
    });
  });

  it("returns null for a success body or anything not shaped like the envelope", () => {
    expect(parseErrorResponse({ ok: true })).toBeNull();
    expect(parseErrorResponse(null)).toBeNull();
    expect(parseErrorResponse("boom")).toBeNull();
    expect(parseErrorResponse({ error: "legacy string shape" })).toBeNull();
  });
});

describe("reportClientError", () => {
  afterEach(() => vi.restoreAllMocks());

  it("logs a grouped report with code + requestId and never leaks the raw email", () => {
    const group = vi.spyOn(console, "group").mockImplementation(() => {});
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const groupEnd = vi.spyOn(console, "groupEnd").mockImplementation(() => {});

    reportClientError(
      "form/waitlist",
      {
        code: ErrorCode.UpstreamDown,
        message: "Serverul nu răspunde…",
        upstreamStatus: 502,
        requestId: "req-42",
      },
      { email: "ion@example.com", endpoint: "/api/waitlist" },
    );

    const dump = [
      ...group.mock.calls.flat(),
      ...error.mock.calls.flat(),
    ]
      .map((x) => (typeof x === "string" ? x : JSON.stringify(x)))
      .join(" ");

    expect(group).toHaveBeenCalledTimes(1);
    expect(groupEnd).toHaveBeenCalledTimes(1);
    expect(dump).toContain("UPSTREAM_DOWN");
    expect(dump).toContain("req-42");
    expect(dump).toContain("i***@example.com");
    expect(dump).not.toContain("ion@example.com");
  });

  it("puts validation issue messages in the group header", () => {
    const group = vi.spyOn(console, "group").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "groupEnd").mockImplementation(() => {});
    reportClientError("form/waitlist", {
      code: ErrorCode.ClientValidation,
      message: "Verifică câmpurile formularului și încearcă din nou.",
      requestId: "r1",
      details: {
        issues: [{ field: "cities", message: "Adaugă cel puțin un oraș." }],
      },
    });
    expect(group.mock.calls[0]![0]).toContain("Adaugă cel puțin un oraș.");
  });

  it("does not throw when console.group is unavailable", () => {
    const original = console.group;
    // @ts-expect-error — simulating a console without group()
    console.group = undefined;
    vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      reportClientError("s", {
        code: ErrorCode.Unknown,
        message: "x",
      }),
    ).not.toThrow();
    console.group = original;
  });
});
