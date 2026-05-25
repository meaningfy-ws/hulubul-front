// Implements: INV-5 (no free strings) — auth-related literals must come from
// named constants, not be inlined in components/route handlers.
import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();

function walk(dir: string, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, acc);
    else if (/\.(tsx?|jsx?)$/.test(name) && !p.includes(".test.")) acc.push(p);
  }
  return acc;
}

const FORBIDDEN_LITERALS = [
  // Romanian copy belongs in lib/auth-copy.ts
  "Continuă cu Google",
  "Continuă cu Facebook",
  "verificat prin Google",
  "verificat prin Facebook",
  // Cookie names belong in lib/cookies.ts
  "hulubul.auth.prefill",
  "hulubul.auth.flow",
];

const EXEMPT_FILES = new Set<string>([
  // The constants themselves
  join(ROOT, "lib/auth-copy.ts"),
  join(ROOT, "lib/cookies.ts"),
]);

const SCAN_DIRS = ["components", "app/api/auth"].map((d) => join(ROOT, d));

describe("Feature: INV-5 — no free strings in auth code path", () => {
  it("Given the auth source tree, Then no forbidden literal occurs outside its single source of truth", () => {
    const files = SCAN_DIRS.flatMap((d) => walk(d));
    const violations: { file: string; literal: string }[] = [];
    for (const file of files) {
      if (EXEMPT_FILES.has(file)) continue;
      const content = readFileSync(file, "utf8");
      for (const literal of FORBIDDEN_LITERALS) {
        if (content.includes(literal)) {
          violations.push({ file, literal });
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
