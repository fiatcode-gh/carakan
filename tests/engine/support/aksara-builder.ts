import { javaneseCodepoints } from "../../../src/engine/codepoints.ts";

const prefixes = [
  "JAVANESE LETTER ",
  "JAVANESE VOWEL SIGN ",
  "JAVANESE CONSONANT SIGN ",
  "JAVANESE SIGN ",
  "JAVANESE PADA ",
  "JAVANESE ",
];

/**
 * Builds aksara text from Unicode character names so expectations are never
 * typed as literals. Tokens are space separated; `_` inside a token stands
 * for a space in the name (`NGA_LELET`); `ZWNJ` is U+200C.
 *
 * `ak('SA TA TALING')` is the Unicode-order spelling of sate.
 */
export function ak(spec: string): string {
  let out = "";
  for (const token of spec.split(" ")) {
    if (token === "ZWNJ") {
      out += String.fromCodePoint(0x200c);
      continue;
    }
    const name = token.replaceAll("_", " ");
    const hits = new Set<number>();
    for (const p of prefixes) {
      const cp = javaneseCodepoints[`${p}${name}`];
      if (cp !== undefined) hits.add(cp);
    }
    if (hits.size !== 1) {
      throw new Error(
        `Invalid value "${token}" for spec: ${hits.size === 0 ? "no such character" : "ambiguous character name"}`,
      );
    }
    out += String.fromCodePoint(...hits);
  }
  return out;
}
