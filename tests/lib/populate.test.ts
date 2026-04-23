import { describe, it, expect } from "vitest";
import qs from "qs";
import { buildLandingPopulate, LANDING_POPULATE_KEYS } from "@/lib/populate";

describe("buildLandingPopulate", () => {
  const populate = buildLandingPopulate();

  it("covers every top-level component attribute on the landing-page schema", () => {
    // The schema.json on the backend declares exactly these 10 required components.
    // If the backend adds one, populate must grow too — otherwise the frontend renders a gap.
    expect(Object.keys(populate).sort()).toEqual(LANDING_POPULATE_KEYS.slice().sort());
    expect(LANDING_POPULATE_KEYS).toEqual([
      "seo",
      "nav",
      "hero",
      "problem",
      "howItWorks",
      "audience",
      "trust",
      "signup",
      "faq",
      "footer",
    ]);
  });

  it("hydrates every nested repeatable (depth-2 components)", () => {
    // Asserting the shape directly — these are the repeatables discovered in the schema.
    expect(populate.hero).toMatchObject({ populate: ["handwrittenLines"] });
    expect(populate.problem).toMatchObject({ populate: ["cards"] });
    expect(populate.howItWorks).toMatchObject({ populate: ["steps"] });
    expect(populate.audience).toMatchObject({ populate: ["cards"] });
    expect(populate.trust).toMatchObject({ populate: ["items"] });
    expect(populate.signup).toMatchObject({ populate: ["roleOptions"] });
    expect(populate.faq).toMatchObject({ populate: ["items"] });
  });

  it("hydrates the depth-3 footer.columns.links chain", () => {
    expect(populate.footer).toEqual({
      populate: { columns: { populate: ["links"] } },
    });
  });

  it("hydrates seo.shareImage as a media field", () => {
    expect(populate.seo).toMatchObject({ populate: ["shareImage"] });
  });

  it("serialises into a URL query Strapi accepts", () => {
    const query = qs.stringify({ populate }, { encodeValuesOnly: true });
    // spot-check the serialised shape
    expect(query).toContain("populate[hero][populate][0]=handwrittenLines");
    expect(query).toContain(
      "populate[footer][populate][columns][populate][0]=links",
    );
    expect(query).toContain("populate[seo][populate][0]=shareImage");
  });
});
