import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Loads a JSON-LD snippet from `lib/jsonld/snippets/<name>.jsonld`.
 *
 * Why pure `.jsonld` files instead of TS builders:
 * - The source files are valid JSON-LD that can be pasted into
 *   validator.schema.org or any RDF tool without transformation.
 * - Editorial review of the schema text doesn't require reading TS.
 * - One file per Schema.org type matches the team's preference for
 *   transparent, file-per-resource RDF artefacts.
 *
 * Usage is server-side only (Server Components, route handlers,
 * `generateMetadata`). The file system is read at module-resolution
 * time on the server; the parsed result is shipped to the browser as
 * the inline JSON-LD `<script>` body.
 */
export function loadJsonLdSnippet<T = unknown>(name: string): T {
  const path = join(process.cwd(), "lib", "jsonld", "snippets", `${name}.jsonld`);
  const raw = readFileSync(path, "utf8");
  try {
    return JSON.parse(raw) as T;
  } catch (error) {
    throw new Error(
      `JSON-LD snippet "${name}" at ${path} is not valid JSON: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
}
