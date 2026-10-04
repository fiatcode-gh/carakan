import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  javaneseChar,
  javaneseCodepoints,
} from "../../src/engine/codepoints.ts";

describe("[P-D01] codepoints", () => {
  test("exposes all 91 assigned characters of the Javanese block", () => {
    expect(Object.keys(javaneseCodepoints).length).toBe(91);
  });

  test("maps spot-checked official names to their codepoints", () => {
    // Official names from UnicodeData.txt (docs/references archive).
    expect(javaneseCodepoints["JAVANESE LETTER KA"]).toBe(0xa98f);
    expect(javaneseCodepoints["JAVANESE LETTER HA"]).toBe(0xa9b2);
    expect(javaneseCodepoints["JAVANESE PANGKON"]).toBe(0xa9c0);
    expect(javaneseCodepoints["JAVANESE VOWEL SIGN TALING"]).toBe(0xa9ba);
    expect(javaneseCodepoints["JAVANESE SIGN CECAK"]).toBe(0xa981);
    expect(javaneseCodepoints["JAVANESE LETTER PA CEREK"]).toBe(0xa989);
    expect(javaneseCodepoints["JAVANESE DIGIT ZERO"]).toBe(0xa9d0);
  });

  test("javaneseChar resolves a name to its character", () => {
    expect(javaneseChar("JAVANESE LETTER KA")).toBe("\u{A98F}");
    expect(() => javaneseChar("JAVANESE LETTER NONEXISTENT")).toThrow(Error);
  });

  test("generated file matches a fresh regeneration (no drift)", () => {
    const slice = readFileSync(
      "docs/references/unicode-javanese-block.txt",
      "utf8",
    );
    const body = readFileSync("src/engine/codepoints.ts", "utf8");
    for (const line of slice.split("\n")) {
      const parts = line.split(";");
      if (parts.length >= 2) {
        const entry = `'${parts[1]}': 0x${parts[0]!.toLowerCase()},`;
        expect(
          body,
          "codepoints.ts is out of sync with the Unicode archive",
        ).toContain(entry);
      }
    }
  });
});
