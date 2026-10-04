import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { renderCodepointsModule } from "../../tools/gen-codepoints.ts";

describe("[P-D01] codepoints generator", () => {
  test("rendering the slice reproduces src/engine/codepoints.ts byte-for-byte", () => {
    const slice = readFileSync(
      "docs/references/unicode-javanese-block.txt",
      "utf8",
    );
    expect(renderCodepointsModule(slice)).toBe(
      readFileSync("src/engine/codepoints.ts", "utf8"),
    );
  });
});
