import { describe, expect, it } from "vitest";
import { metadata as senderSurveyMeta } from "@/app/(marketing)/sondaj/expeditori/page";
import { metadata as adminMeta } from "@/app/admin/rute/page";

describe("noindex on transient pages", () => {
  it("/sondaj/expeditori is noindex, nofollow", () => {
    expect(senderSurveyMeta.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it("/admin/rute is noindex, nofollow", () => {
    expect(adminMeta.robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});
