import { describe, it, expect } from "vitest";
import { surveySchema } from "@/lib/survey-schema";

const identity = {
  name: "Ion Popescu",
  email: "ion@example.com",
  role: "expeditor" as const,
  source: "standalone" as const,
};

describe("surveySchema — identity (required fields)", () => {
  it("accepts minimum identity-only payload", () => {
    const result = surveySchema.safeParse(identity);
    expect(result.success).toBe(true);
  });

  it("rejects missing email", () => {
    const { email: _o, ...rest } = identity;
    expect(surveySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects invalid email format", () => {
    expect(
      surveySchema.safeParse({ ...identity, email: "nope" }).success,
    ).toBe(false);
  });

  it("rejects missing source", () => {
    const { source: _o, ...rest } = identity;
    expect(surveySchema.safeParse(rest).success).toBe(false);
  });

  it("rejects unknown role", () => {
    expect(
      surveySchema.safeParse({ ...identity, role: "unknown" }).success,
    ).toBe(false);
  });

  it("rejects unknown source", () => {
    expect(
      surveySchema.safeParse({ ...identity, source: "spam" }).success,
    ).toBe(false);
  });

  it("trims whitespace on identity fields", () => {
    const result = surveySchema.safeParse({
      name: "  Ion  ",
      email: "  ion@x.com  ",
      role: "ambele",
      source: "other",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("Ion");
      expect(result.data.email).toBe("ion@x.com");
    }
  });
});

describe("surveySchema — enum research fields", () => {
  it("accepts sendingFrequency values", () => {
    expect(
      surveySchema.safeParse({ ...identity, sendingFrequency: "lunar" })
        .success,
    ).toBe(true);
  });

  it("rejects unknown sendingFrequency", () => {
    expect(
      surveySchema.safeParse({ ...identity, sendingFrequency: "daily" })
        .success,
    ).toBe(false);
  });

  it("accepts a packageTypes array", () => {
    const result = surveySchema.safeParse({
      ...identity,
      packageTypes: ["alimente", "haine"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown packageTypes entry", () => {
    expect(
      surveySchema.safeParse({ ...identity, packageTypes: ["weapons"] })
        .success,
    ).toBe(false);
  });

  it("accepts an ordered selectionCriteria array", () => {
    const result = surveySchema.safeParse({
      ...identity,
      selectionCriteria: ["siguranta", "pret", "viteza"],
    });
    expect(result.success).toBe(true);
  });

  it("caps selectionCriteria at 5 entries", () => {
    const result = surveySchema.safeParse({
      ...identity,
      selectionCriteria: [
        "pret", "siguranta", "viteza", "reputatie", "recomandare", "pret",
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts issuesExperienced with independent entries", () => {
    const result = surveySchema.safeParse({
      ...identity,
      issuesExperienced: ["intarzieri", "lipsa_comunicare"],
    });
    expect(result.success).toBe(true);
  });
});

describe("surveySchema — free text + booleans", () => {
  it("accepts long open-ended answers", () => {
    const result = surveySchema.safeParse({
      ...identity,
      idealExperience: "x".repeat(2000),
      biggestTimeSaver: "y".repeat(2000),
      painPointDetails: "z".repeat(2000),
      platformTrustRequirements: "w".repeat(2000),
    });
    expect(result.success).toBe(true);
  });

  it("treats empty text fields as undefined", () => {
    const result = surveySchema.safeParse({
      ...identity,
      idealExperience: "   ",
      packageTypesOther: "",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.idealExperience).toBeUndefined();
      expect(result.data.packageTypesOther).toBeUndefined();
    }
  });

  it("accepts boolean conversion flags", () => {
    const result = surveySchema.safeParse({
      ...identity,
      willShipSoon: true,
      wantsCallback: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("surveySchema — callbackPhone refinement", () => {
  it("rejects wantsCallback:true without callbackPhone", () => {
    const result = surveySchema.safeParse({
      ...identity,
      wantsCallback: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects wantsCallback:true with empty callbackPhone", () => {
    const result = surveySchema.safeParse({
      ...identity,
      wantsCallback: true,
      callbackPhone: "   ",
    });
    expect(result.success).toBe(false);
  });

  it("accepts wantsCallback:true with a non-empty phone", () => {
    const result = surveySchema.safeParse({
      ...identity,
      wantsCallback: true,
      callbackPhone: "+373 600 00 000",
    });
    expect(result.success).toBe(true);
  });

  it("ignores callbackPhone when wantsCallback is false", () => {
    const result = surveySchema.safeParse({
      ...identity,
      wantsCallback: false,
      callbackPhone: "+373 600",
    });
    expect(result.success).toBe(true);
  });
});
