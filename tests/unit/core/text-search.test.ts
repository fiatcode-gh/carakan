import { describe, expect, test } from "vitest";
import { searchMatcher } from "../../../src/core/text-search.ts";

const matches = (query: string, ...texts: (string | null)[]): boolean => {
  const match = searchMatcher(query);
  if (match === null) throw new Error(`blank query: "${query}"`);
  return match(...texts);
};

describe("searchMatcher", () => {
  test("[P-U08] [P-C01] a blank query has no matcher: everything shows", () => {
    expect(searchMatcher("")).toBeNull();
    expect(searchMatcher("  \t ")).toBeNull();
    expect(searchMatcher("()")).toBeNull();
  });

  test("[P-U08] [P-C01] ka finds ka, ka murda and pasangan ka, never cakra", () => {
    expect(matches("ka", "ka", "ka")).toBe(true);
    expect(matches("ka", "ka murda", "ka")).toBe(true);
    expect(matches("ka", "pasangan ka", "ka")).toBe(true);
    expect(matches("ka", "cakra (ra)", "ra")).toBe(false);
    expect(matches("ka", "taling (é)", "é")).toBe(false);
  });

  test("[P-U08] [P-C01] a query matches the start of a word, never its middle", () => {
    expect(matches("pas", "pasangan ka", null)).toBe(true);
    expect(matches("mur", "ka murda", null)).toBe(true);
    expect(matches("akra", "cakra (ra)", null)).toBe(false);
    expect(matches("rda", "ka murda", null)).toBe(false);
  });

  test("[P-U08] [P-C01] case is ignored on the query and on the text", () => {
    expect(matches("KA", "ka murda", null)).toBe(true);
    expect(matches("ka", "Pasangan KA", null)).toBe(true);
  });

  test("[P-U08] [P-C01] accents are ignored: e finds é, and é finds e", () => {
    expect(matches("e", "é", "é")).toBe(true);
    expect(matches("e", "pa cerek (rě) panjang", "rě")).toBe(false);
    expect(matches("re", "pa cerek (rě) panjang", null)).toBe(true);
    expect(matches("é", "e", null)).toBe(true);
  });

  test("[P-U08] [P-C01] the Latin reading matches when the name does not", () => {
    expect(matches("i", "wulu (i)", null)).toBe(true);
    expect(matches("ru", "suku (u)", "u")).toBe(false);
    expect(matches("u", "suku (u)", "u")).toBe(true);
    expect(matches("ha", "angka 3", null)).toBe(false);
    expect(matches("ha", "aksara nomor", "ha")).toBe(true);
  });

  test("[P-U08] [P-C01] punctuation and spacing do not matter; words follow in order", () => {
    expect(matches("  wulu   i ", "wulu (i)", null)).toBe(true);
    expect(matches("pasangan k", "pasangan ka", null)).toBe(true);
    expect(matches("murda ka", "ka murda", null)).toBe(false);
  });
});
