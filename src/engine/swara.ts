import { aksaraChar, type AksaraChar } from "./aksara-char.ts";
import { javaneseChar } from "./codepoints.ts";

function entry(
  id: string,
  unicodeName: string,
  latinPujl: string,
  latinJgst: string,
): AksaraChar {
  return aksaraChar({
    id,
    unicodeName,
    latinPujl,
    latinJgst,
    category: "swara",
  });
}

/**
 * Independent vowels (aksara swara) — used for vowel syllables, especially
 * word-initially and in loan words (KAJ I Yogyakarta 2021, Bab I A.3).
 * Pa cerek (ṛ/re) and nga lelet (ḷ/le) replace pepet on ra/la syllables.
 */
export const swara: readonly AksaraChar[] = [
  entry("a", "JAVANESE LETTER A", "a", "a"),
  entry("i", "JAVANESE LETTER I", "i", "i"),
  entry("u", "JAVANESE LETTER U", "u", "u"),
  entry("e", "JAVANESE LETTER E", "é", "é"),
  entry("o", "JAVANESE LETTER O", "o", "o"),
  entry("paCerek", "JAVANESE LETTER PA CEREK", "re", "ṛ"),
  entry("ngaLelet", "JAVANESE LETTER NGA LELET", "le", "ḷ"),
];

/**
 * A swara lengthened with tarung (KAJ I Bab I A.5.b.2). Stored as data: the
 * encoded form is the base swara followed by JAVANESE VOWEL SIGN TARUNG.
 */
export interface SwaraLongForm {
  readonly baseId: string;
  readonly latinPujl: string;
  readonly latinJgst: string;
  readonly tarungChar: string;
}

function longForm(
  baseId: string,
  latinPujl: string,
  latinJgst: string,
): SwaraLongForm {
  return {
    baseId,
    latinPujl,
    latinJgst,
    get tarungChar() {
      return javaneseChar("JAVANESE VOWEL SIGN TARUNG");
    },
  };
}

const swaraLongFormList: readonly SwaraLongForm[] = [
  longForm("a", "aa", "ā"),
  longForm("u", "uu", "ū"),
  longForm("o", "au", "au"),
  longForm("paCerek", "reu", "ṛě"),
];

export const swaraLongForms: ReadonlyMap<string, SwaraLongForm> = new Map(
  swaraLongFormList.map((f) => [f.baseId, f]),
);

/**
 * Swara present in Unicode but out of converter scope for v1 — data only,
 * for the chart feature (plan 2).
 */
export const swaraCatalogue: readonly AksaraChar[] = [
  entry("iKawi", "JAVANESE LETTER I KAWI", "i", "i"),
  entry("ii", "JAVANESE LETTER II", "i", "ī"),
  entry("ngaLeletRaswadi", "JAVANESE LETTER NGA LELET RASWADI", "leu", "ḷě"),
  entry("ai", "JAVANESE LETTER AI", "ai", "ai"),
];

export function swaraById(id: string): AksaraChar | null {
  for (const s of swara) {
    if (s.id === id) return s;
  }
  return null;
}

export const swaraByCodepoint: ReadonlyMap<number, AksaraChar> = new Map(
  [...swara, ...swaraCatalogue].map((s) => [s.codepoint, s]),
);
