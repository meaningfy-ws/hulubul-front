/**
 * Minimal Markdown → Strapi 5 Blocks converter for the editorial seed.
 *
 * Supports exactly the subset used in `lib/editorial-fallback.ts`:
 * `##`/`###` headings, `-` unordered lists, paragraphs, and inline
 * `**bold**`, `*italic*`, `` `code` ``, `[label](url)`. No nesting of
 * marks (the source never nests them). Pure, unit-tested — not product
 * code; used only to generate the import seed.
 */

export type InlineNode =
  | { type: "text"; text: string; bold?: true; italic?: true; code?: true }
  | { type: "link"; url: string; children: { type: "text"; text: string }[] };

export type Block =
  | { type: "paragraph"; children: InlineNode[] }
  | { type: "heading"; level: number; children: InlineNode[] }
  | {
      type: "list";
      format: "unordered";
      children: { type: "list-item"; children: InlineNode[] }[];
    };

const LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)/;
const HEADING_RE = /^(#{1,6})\s+(.*)$/;

function parseInline(s: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buf = "";
  const flush = () => {
    if (buf) {
      nodes.push({ type: "text", text: buf });
      buf = "";
    }
  };
  let i = 0;
  while (i < s.length) {
    // `code`
    if (s[i] === "`") {
      const end = s.indexOf("`", i + 1);
      if (end > -1) {
        flush();
        nodes.push({ type: "text", text: s.slice(i + 1, end), code: true });
        i = end + 1;
        continue;
      }
    }
    // **bold**
    if (s[i] === "*" && s[i + 1] === "*") {
      const end = s.indexOf("**", i + 2);
      if (end > -1) {
        flush();
        nodes.push({ type: "text", text: s.slice(i + 2, end), bold: true });
        i = end + 2;
        continue;
      }
    }
    // *italic* (single asterisk, not part of **)
    if (s[i] === "*" && s[i + 1] !== "*") {
      const end = s.indexOf("*", i + 1);
      if (end > -1) {
        flush();
        nodes.push({ type: "text", text: s.slice(i + 1, end), italic: true });
        i = end + 1;
        continue;
      }
    }
    // [label](url)
    if (s[i] === "[") {
      const m = s.slice(i).match(LINK_RE);
      if (m) {
        flush();
        nodes.push({
          type: "link",
          url: m[2]!,
          children: [{ type: "text", text: m[1]! }],
        });
        i += m[0].length;
        continue;
      }
    }
    buf += s[i];
    i += 1;
  }
  flush();
  return nodes.length > 0 ? nodes : [{ type: "text", text: "" }];
}

export function mdToBlocks(md: string): Block[] {
  const lines = md.split("\n");
  const blocks: Block[] = [];
  let list: { type: "list-item"; children: InlineNode[] }[] | null = null;

  const closeList = () => {
    if (list) {
      blocks.push({ type: "list", format: "unordered", children: list });
      list = null;
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (line === "") {
      closeList();
      continue;
    }
    if (line.startsWith("- ")) {
      (list ??= []).push({
        type: "list-item",
        children: parseInline(line.slice(2)),
      });
      continue;
    }
    closeList();
    const h = line.match(HEADING_RE);
    if (h) {
      blocks.push({
        type: "heading",
        level: h[1]!.length,
        children: parseInline(h[2]!),
      });
      continue;
    }
    blocks.push({ type: "paragraph", children: parseInline(line) });
  }
  closeList();
  return blocks;
}
