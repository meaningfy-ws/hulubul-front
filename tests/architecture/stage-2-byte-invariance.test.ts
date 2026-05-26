// Implements: 02-facebook-tiktok.md §5 (Acceptance criteria — byte-identical
// modules) and 02-facebook-tiktok-plan.md Step 0 (Verify Stage-1 invariants).
//
// The Stage-2 promise is that adding a new provider is config + UI only.
// Concretely: lib/zitadel.ts, lib/prefill-cookie.ts, and the two
// /api/auth route handlers must be byte-identical to their Stage-1 merged
// content. Anything else means the Stage-1 architecture failed its
// "new provider = no new code" contract.
//
// The guard pins each file's SHA-256 captured at Stage-1 merge. A
// legitimate change to a guarded file (e.g. the documented Step T5
// exception for the TikTok CONDITIONAL branch) requires updating the
// pinned hash in the same PR with a written justification — the test
// failing is the prompt to think about whether the change is allowed.

import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const STAGE_1_PINNED_SHA256: Record<string, string> = {
  // BUMPED in the Instagram/TikTok PR — added `instagram: PROVIDER_INSTAGRAM`
  // to `ID_TOKEN_PROVIDER_CLAIMS` so callbacks from the Instagram IdP infer
  // the correct provider (otherwise inferProvider falls back to Google and
  // Instagram users get a "verificat prin Google" tag). This is a one-line,
  // pure-data extension of the existing claim-map, mirroring how
  // PROVIDER_TIKTOK was already present. No control-flow changes; no
  // contract change to buildAuthStart / completeAuthCallback. Considered a
  // legitimate Stage-2 exception of the same shape as the documented Step T5
  // (see 02-facebook-tiktok-plan.md). Future modifications still trip this
  // guard and require the same justification.
  "lib/zitadel.ts":
    "f5a9c4e388f422178bb4f457f0ec547a181a142d24d9e3955b15b623c985a561",
  "lib/prefill-cookie.ts":
    "44da357f57f9c9b42812720bcbfc4ccc221d1a642cb98f8a6985bf0b1e394d52",
  "app/api/auth/start/route.ts":
    "baa5c3832e02a09c6179cf6fa5e6f6a0ecbf97d7e786356ff53e385ef038ce3f",
  "app/api/auth/callback/route.ts":
    "62119aed5f94f90429289fa4317676186b8e87bf1f5df2034e0c218dcd2cef32",
};

function sha256Of(relPath: string): string {
  const content = readFileSync(join(process.cwd(), relPath));
  return createHash("sha256").update(content).digest("hex");
}

describe("Architecture: Stage-2 byte-invariance for Stage-1 modules", () => {
  for (const [path, expected] of Object.entries(STAGE_1_PINNED_SHA256)) {
    it(`Then ${path} is byte-identical to its Stage-1 merge`, () => {
      const actual = sha256Of(path);
      expect(
        actual,
        `${path} changed (was ${expected}, now ${actual}). If this change is intentional and within the documented Stage-2 exception (see 02-facebook-tiktok-plan.md Step T5), update the pinned SHA in this test in the same PR and add justification.`,
      ).toBe(expected);
    });
  }
});
