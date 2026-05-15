import { describe, expect, it } from "vitest";
import { ErrorCode } from "@/lib/errors/codes";
import { messageForCode, validationMessage } from "@/lib/errors/messages";

describe("validationMessage", () => {
  it("returns the single issue message when one field failed", () => {
    expect(
      validationMessage({
        issues: [{ field: "cities", message: "Adaugă cel puțin un oraș." }],
      }),
    ).toBe("Adaugă cel puțin un oraș.");
  });

  it("joins multiple distinct issue messages", () => {
    expect(
      validationMessage({
        issues: [
          { field: "name", message: "Numele este obligatoriu" },
          { field: "cities", message: "Adaugă cel puțin un oraș." },
        ],
      }),
    ).toBe("Numele este obligatoriu Adaugă cel puțin un oraș.");
  });

  it("de-duplicates repeated messages", () => {
    expect(
      validationMessage({
        issues: [
          { field: "a", message: "X" },
          { field: "b", message: "X" },
        ],
      }),
    ).toBe("X");
  });

  it("returns null for missing / wrong-shaped details", () => {
    expect(validationMessage(undefined)).toBeNull();
    expect(validationMessage("nope")).toBeNull();
    expect(validationMessage({ issues: [] })).toBeNull();
    expect(validationMessage({ issues: "x" })).toBeNull();
  });
});

describe("messageForCode", () => {
  it("returns a non-empty Romanian message for every code", () => {
    for (const code of Object.values(ErrorCode)) {
      const msg = messageForCode(code);
      expect(typeof msg).toBe("string");
      expect(msg.length).toBeGreaterThan(0);
    }
  });

  it("ALREADY_REGISTERED with a registeredAt embeds the date as DD/MM/YYYY and asks for patience", () => {
    const msg = messageForCode(ErrorCode.AlreadyRegistered, {
      registeredAt: "2026-04-27T08:30:00.000Z",
    });
    expect(msg).toContain("27/04/2026");
    expect(msg.toLowerCase()).toContain("răbdare");
  });

  it("ALREADY_REGISTERED without a date falls back to a generic already-registered message", () => {
    const msg = messageForCode(ErrorCode.AlreadyRegistered);
    expect(msg.toLowerCase()).toContain("deja");
    expect(msg).not.toContain("undefined");
    expect(msg).not.toMatch(/NaN|Invalid/);
  });

  it("UPSTREAM_DOWN tells the user to retry later", () => {
    expect(messageForCode(ErrorCode.UpstreamDown).toLowerCase()).toContain(
      "mai târziu",
    );
  });

  it("ignores an invalid registeredAt instead of printing NaN/Invalid Date", () => {
    const msg = messageForCode(ErrorCode.AlreadyRegistered, {
      registeredAt: "not-a-date",
    });
    expect(msg).not.toMatch(/NaN|Invalid/);
    expect(msg.toLowerCase()).toContain("deja");
  });
});
