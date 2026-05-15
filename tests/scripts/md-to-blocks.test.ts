import { describe, expect, it } from "vitest";
import { mdToBlocks } from "@/scripts/editorial-seed/md-to-blocks";

describe("mdToBlocks", () => {
  it("converts ## and ### into heading blocks with levels", () => {
    expect(mdToBlocks("## Titlu doi")).toEqual([
      { type: "heading", level: 2, children: [{ type: "text", text: "Titlu doi" }] },
    ]);
    expect(mdToBlocks("### Titlu trei")[0]).toMatchObject({
      type: "heading",
      level: 3,
    });
  });

  it("converts a plain line into a paragraph", () => {
    expect(mdToBlocks("Salut lume")).toEqual([
      { type: "paragraph", children: [{ type: "text", text: "Salut lume" }] },
    ]);
  });

  it("parses inline bold, italic and code marks", () => {
    const [p] = mdToBlocks("Are **bold**, *ital* și `cod` aici.");
    expect(p).toEqual({
      type: "paragraph",
      children: [
        { type: "text", text: "Are " },
        { type: "text", text: "bold", bold: true },
        { type: "text", text: ", " },
        { type: "text", text: "ital", italic: true },
        { type: "text", text: " și " },
        { type: "text", text: "cod", code: true },
        { type: "text", text: " aici." },
      ],
    });
  });

  it("parses a markdown link into a link node", () => {
    const [p] = mdToBlocks("Vezi [confidențialitate](/confidentialitate) acum.");
    expect(p).toEqual({
      type: "paragraph",
      children: [
        { type: "text", text: "Vezi " },
        {
          type: "link",
          url: "/confidentialitate",
          children: [{ type: "text", text: "confidențialitate" }],
        },
        { type: "text", text: " acum." },
      ],
    });
  });

  it("groups consecutive '- ' lines into one unordered list with inline marks", () => {
    const blocks = mdToBlocks("- **Ce:** text\n- Simplu");
    expect(blocks).toEqual([
      {
        type: "list",
        format: "unordered",
        children: [
          {
            type: "list-item",
            children: [
              { type: "text", text: "Ce:", bold: true },
              { type: "text", text: " text" },
            ],
          },
          {
            type: "list-item",
            children: [{ type: "text", text: "Simplu" }],
          },
        ],
      },
    ]);
  });

  it("treats a fully *…*-wrapped line as an italic paragraph", () => {
    expect(mdToBlocks("*Notă de subsol.*")).toEqual([
      {
        type: "paragraph",
        children: [{ type: "text", text: "Notă de subsol.", italic: true }],
      },
    ]);
  });

  it("separates blocks on blank lines and preserves order", () => {
    const blocks = mdToBlocks("Intro\n\n## Secțiune\n\n- unu\n- doi\n\nFinal");
    expect(blocks.map((b) => b.type)).toEqual([
      "paragraph",
      "heading",
      "list",
      "paragraph",
    ]);
  });
});
