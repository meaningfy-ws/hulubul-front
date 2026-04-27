import { describe, it, expect } from "vitest";
import { waitlistSchema } from "@/lib/waitlist-schema";

const validBase = {
  name: "Ion Popescu",
  email: "ion@example.com",
  role: "expeditor" as const,
  cities: ["Luxembourg", "Chișinău"],
  gdprConsent: true as const,
  gdprConsentAt: "2026-04-27T15:42:11.000Z",
  gdprConsentVersion: "2026-04-27",
};

describe("Feature: waitlist payload validation", () => {
  describe("Given a minimum valid v2 payload", () => {
    it("When parsed, Then parsing succeeds", () => {
      const r = waitlistSchema.safeParse(validBase);
      expect(r.success).toBe(true);
    });

    it("When parsed, Then 'source' defaults to 'landing'", () => {
      const r = waitlistSchema.safeParse(validBase);
      if (r.success) expect(r.data.source).toBe("landing");
    });

    it("When parsed, Then 'locationConsent' defaults to 'not_asked'", () => {
      const r = waitlistSchema.safeParse(validBase);
      if (r.success) expect(r.data.locationConsent).toBe("not_asked");
    });
  });

  describe("Given a payload whose role is one of the v2 enum values", () => {
    it.each(["expeditor", "transportator", "destinatar"] as const)(
      "When role is '%s', Then parsing succeeds",
      (role) => {
        expect(waitlistSchema.safeParse({ ...validBase, role }).success).toBe(true);
      },
    );
  });

  describe("Given a payload whose role is the legacy 'ambele'", () => {
    it("When parsed, Then it is rejected (frontend stops emitting it)", () => {
      expect(waitlistSchema.safeParse({ ...validBase, role: "ambele" }).success).toBe(false);
    });
  });

  describe("Given an invalid email", () => {
    it("When parsed, Then it is rejected", () => {
      expect(waitlistSchema.safeParse({ ...validBase, email: "not-an-email" }).success).toBe(false);
    });
  });

  describe("Given a name that is whitespace-only", () => {
    it("When parsed, Then it is rejected after trimming", () => {
      expect(waitlistSchema.safeParse({ ...validBase, name: "   " }).success).toBe(false);
    });
  });

  describe("Given a blank whatsapp", () => {
    it("When parsed, Then 'whatsapp' becomes undefined", () => {
      const r = waitlistSchema.safeParse({ ...validBase, whatsapp: "   " });
      expect(r.success).toBe(true);
      if (r.success) expect(r.data.whatsapp).toBeUndefined();
    });
  });

  describe("Given a whatsapp number in international format", () => {
    it.each([
      "+352 621 123 456",
      "+37369123456",
      "0040721123456",
      "00352 621 123 456",
    ])("When whatsapp is '%s', Then parsing succeeds", (whatsapp) => {
      const r = waitlistSchema.safeParse({ ...validBase, whatsapp });
      expect(r.success).toBe(true);
    });
  });

  describe("Given a whatsapp that violates the international format", () => {
    it.each(["abc123", "12345", "+", "+abc 123 456", "+1"])(
      "When whatsapp is '%s', Then it is rejected with a helpful message",
      (whatsapp) => {
        const r = waitlistSchema.safeParse({ ...validBase, whatsapp });
        expect(r.success).toBe(false);
        if (!r.success) {
          expect(r.error.issues[0]!.message).toMatch(/format internațional/i);
        }
      },
    );
  });
});

describe("Feature: cities array constraints", () => {
  describe("Given an empty cities array", () => {
    it("When parsed, Then it is rejected", () => {
      expect(waitlistSchema.safeParse({ ...validBase, cities: [] }).success).toBe(false);
    });
  });

  describe("Given more than 10 cities", () => {
    it("When parsed, Then it is rejected", () => {
      const cities = Array.from({ length: 11 }, (_, i) => `City${i}`);
      expect(waitlistSchema.safeParse({ ...validBase, cities }).success).toBe(false);
    });
  });

  describe("Given a city longer than 120 chars", () => {
    it("When parsed, Then it is rejected", () => {
      expect(
        waitlistSchema.safeParse({ ...validBase, cities: ["x".repeat(121)] }).success,
      ).toBe(false);
    });
  });

  describe("Given a blank entry inside the cities array", () => {
    it("When parsed, Then the whole payload is rejected", () => {
      expect(waitlistSchema.safeParse({ ...validBase, cities: ["Lux", "  "] }).success).toBe(false);
    });
  });
});

describe("Feature: GDPR consent contract", () => {
  describe("Given gdprConsent set to false", () => {
    it("When parsed, Then the payload is rejected", () => {
      expect(waitlistSchema.safeParse({ ...validBase, gdprConsent: false }).success).toBe(false);
    });
  });

  describe("Given gdprConsentAt is missing", () => {
    it("When parsed, Then the payload is rejected", () => {
      const { gdprConsentAt: _omit, ...rest } = validBase;
      expect(waitlistSchema.safeParse(rest).success).toBe(false);
    });
  });

  describe("Given gdprConsentAt is not an ISO datetime", () => {
    it("When parsed, Then the payload is rejected", () => {
      expect(
        waitlistSchema.safeParse({ ...validBase, gdprConsentAt: "yesterday" }).success,
      ).toBe(false);
    });
  });

  describe("Given gdprConsentVersion is empty", () => {
    it("When parsed, Then the payload is rejected", () => {
      expect(
        waitlistSchema.safeParse({ ...validBase, gdprConsentVersion: "" }).success,
      ).toBe(false);
    });
  });
});

describe("Feature: optional analytics fields", () => {
  describe("Given a precise geolocation result", () => {
    it("When parsed, Then it is accepted as a Location", () => {
      const r = waitlistSchema.safeParse({
        ...validBase,
        locationConsent: "granted",
        location: { source: "geolocation", lat: 49.6, lon: 6.1, accuracyMeters: 32 },
      });
      expect(r.success).toBe(true);
    });
  });

  describe("Given an IP-derived Location with nullable city/country", () => {
    it("When parsed, Then it is accepted", () => {
      const r = waitlistSchema.safeParse({
        ...validBase,
        location: { source: "ip", city: null, country: null },
      });
      expect(r.success).toBe(true);
    });
  });

  describe("Given an IP Location with a country code that is not 2 chars", () => {
    it("When parsed, Then it is rejected", () => {
      const r = waitlistSchema.safeParse({
        ...validBase,
        location: { source: "ip", city: "Lux", country: "LUX" },
      });
      expect(r.success).toBe(false);
    });
  });

  describe("Given a sparse UTM object", () => {
    it("When parsed, Then it is accepted", () => {
      const r = waitlistSchema.safeParse({
        ...validBase,
        utm: { utm_source: "fb", utm_campaign: "lux" },
      });
      expect(r.success).toBe(true);
    });
  });

  describe("Given client viewport + timezone hints", () => {
    it("When parsed, Then they pass through", () => {
      const r = waitlistSchema.safeParse({
        ...validBase,
        client: { viewport: { w: 1280, h: 800 }, timezone: "Europe/Luxembourg" },
      });
      expect(r.success).toBe(true);
    });
  });
});
