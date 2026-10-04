import { codepointOf } from "./aksara-char.ts";
import { javaneseChar } from "./codepoints.ts";

/**
 * A pada: Javanese punctuation. `latin` is the converter mapping
 * (null = no plain-Latin equivalent; catalogue-only for the chart feature).
 */
export interface Pada {
  readonly id: string;
  readonly unicodeName: string;
  readonly latin: string | null;
  readonly char: string;
  readonly codepoint: number;
}

function pada(init: { id: string; unicodeName: string; latin?: string }): Pada {
  return {
    id: init.id,
    unicodeName: init.unicodeName,
    latin: init.latin ?? null,
    get char() {
      return javaneseChar(this.unicodeName);
    },
    get codepoint() {
      return codepointOf(this.unicodeName);
    },
  };
}

/**
 * Shaping break written after a pangkon that stands in for a comma (KAJ I
 * p.24 A.5.d): stops the font from forming a pasangan with the next consonant.
 */
export const zeroWidthNonJoiner = 0x200c;

/**
 * Pada used by the converters. Pangkon-as-comma and pangkon-lingsa-as-period
 * (KAJ I Bab I A.5.d) are input concerns handled in latin-to-aksara.
 */
export const padaActive: readonly Pada[] = [
  pada({ id: "lingsa", unicodeName: "JAVANESE PADA LINGSA", latin: "," }),
  pada({ id: "lungsi", unicodeName: "JAVANESE PADA LUNGSI", latin: "." }),
];

/**
 * Remaining pada — data only (chart feature, plan 2). Unicode names from the
 * archived UnicodeData slice.
 */
export const padaCatalogue: readonly Pada[] = [
  pada({ id: "adeg", unicodeName: "JAVANESE PADA ADEG" }),
  pada({ id: "adegAdeg", unicodeName: "JAVANESE PADA ADEG ADEG" }),
  pada({ id: "windu", unicodeName: "JAVANESE PADA WINDU" }),
  pada({ id: "rerengganKiwa", unicodeName: "JAVANESE LEFT RERENGGAN" }),
  pada({ id: "rerengganTengen", unicodeName: "JAVANESE RIGHT RERENGGAN" }),
  pada({ id: "andap", unicodeName: "JAVANESE PADA ANDAP" }),
  pada({ id: "madya", unicodeName: "JAVANESE PADA MADYA" }),
  pada({ id: "luhur", unicodeName: "JAVANESE PADA LUHUR" }),
  pada({ id: "piseleh", unicodeName: "JAVANESE PADA PISELEH" }),
  pada({ id: "turnedPiseleh", unicodeName: "JAVANESE TURNED PADA PISELEH" }),
  pada({ id: "pangrangkep", unicodeName: "JAVANESE PANGRANGKEP" }),
  pada({ id: "tirtaTumetes", unicodeName: "JAVANESE PADA TIRTA TUMETES" }),
  pada({ id: "isenIsen", unicodeName: "JAVANESE PADA ISEN-ISEN" }),
];

export function padaById(id: string): Pada | null {
  for (const p of [...padaActive, ...padaCatalogue]) {
    if (p.id === id) return p;
  }
  return null;
}

export const padaByCodepoint: ReadonlyMap<number, Pada> = new Map(
  [...padaActive, ...padaCatalogue].map((p) => [p.codepoint, p]),
);
