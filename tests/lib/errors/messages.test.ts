import { describe, expect, it } from "vitest";
import { ErrorCode } from "@/lib/errors/codes";
import { messageForCode } from "@/lib/errors/messages";

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
