import { describe, expect, test } from "vitest";
import { nglegena } from "../../../src/engine/index.ts";
import {
  isDisplayCovered,
  readingFontClass,
} from "../../../src/ui/reading-font.ts";

const cp = (n: number) => String.fromCodePoint(n);

describe("reading font rule", () => {
  test("a plain syllable is covered and renders in Bricolage", () => {
    expect(isDisplayCovered("pa")).toBe(true);
    expect(readingFontClass("pa")).toBe("reading--display");
  });

  test("every base letter's PUJL reading is covered", () => {
    for (const letter of nglegena) {
      expect(isDisplayCovered(letter.latinPujl), letter.latinPujl).toBe(true);
    }
  });

  test("a string with a code point Bricolage lacks falls back whole", () => {
    const ta = cp(0x1e6d) + "a";
    expect(isDisplayCovered(ta)).toBe(false);
    expect(readingFontClass(ta)).toBe("reading--latin");
  });

  test("one uncovered code point switches a mixed string entirely", () => {
    expect(readingFontClass("pa " + cp(0x1e0d))).toBe("reading--latin");
  });

  test("the empty string and accented Latin are covered", () => {
    expect(isDisplayCovered("")).toBe(true);
    expect(isDisplayCovered("é")).toBe(true);
  });

  test("astral code points are read as one code point, not two surrogates", () => {
    expect(isDisplayCovered(cp(0x1f600))).toBe(false);
  });
});
