import { codepointOf } from "./aksara-char.ts";
import { javaneseChar } from "./codepoints.ts";

/**
 * Cecak telu, the Javanese nukta (KAJ I Daftar Transliterasi; UTN47).
 * Attaches after a base character to produce loan sounds.
 */
export interface CecakTelu {
  readonly unicodeName: string;
  readonly char: string;
  readonly codepoint: number;
}

export const cecakTelu: CecakTelu = {
  unicodeName: "JAVANESE SIGN CECAK TELU",
  get char() {
    return javaneseChar(this.unicodeName);
  },
  get codepoint() {
    return codepointOf(this.unicodeName);
  },
};

/**
 * A rekan (aksara rekaan): a character or composition created to write
 * sounds from loan words (KAJ I Yogyakarta 2021, Bab I A.4).
 */
export interface Rekan {
  readonly id: string;
  readonly latinPujl: string;
  readonly latinJgst: string;
  /** Non-null when the rekan is a single encoded character. */
  readonly encodedAs: string | null;
  /** Non-null when the rekan is a base character plus cecak telu. */
  readonly baseUnicodeName: string | null;
  readonly usesCecakTelu: boolean;
  /** Non-null when the rekan is a multi-codepoint composition. */
  readonly composition: readonly string[] | null;
}

function rekanEntry(init: {
  id: string;
  latinPujl: string;
  latinJgst: string;
  encodedAs?: string;
  baseUnicodeName?: string;
  usesCecakTelu?: boolean;
  composition?: readonly string[];
}): Rekan {
  return {
    id: init.id,
    latinPujl: init.latinPujl,
    latinJgst: init.latinJgst,
    encodedAs: init.encodedAs ?? null,
    baseUnicodeName: init.baseUnicodeName ?? null,
    usesCecakTelu: init.usesCecakTelu ?? false,
    composition: init.composition ?? null,
  };
}

/**
 * v1 catalogue. Consonant rekan entries are limited to the two attested in
 * the planning sources (UTN47: pa+cecak-telu = f; KAJ I: wa+cecak-telu = v);
 * the corpus workstream expands this set from verified school references.
 */
export const rekan: readonly Rekan[] = [
  rekanEntry({
    id: "fa",
    latinPujl: "fa",
    latinJgst: "fa",
    baseUnicodeName: "JAVANESE LETTER PA",
    usesCecakTelu: true,
  }),
  rekanEntry({
    id: "va",
    latinPujl: "va",
    latinJgst: "va",
    baseUnicodeName: "JAVANESE LETTER WA",
    usesCecakTelu: true,
  }),
  rekanEntry({
    id: "le",
    latinPujl: "le",
    latinJgst: "ḷ",
    encodedAs: "JAVANESE LETTER NGA LELET",
  }),
  rekanEntry({
    id: "ai",
    latinPujl: "ai",
    latinJgst: "ai",
    encodedAs: "JAVANESE LETTER AI",
  }),
  rekanEntry({
    id: "au",
    latinPujl: "au",
    latinJgst: "au",
    composition: ["JAVANESE LETTER O", "JAVANESE VOWEL SIGN TARUNG"],
  }),
  rekanEntry({
    id: "reu",
    latinPujl: "reu",
    latinJgst: "ṛě",
    composition: ["JAVANESE LETTER PA CEREK", "JAVANESE VOWEL SIGN TARUNG"],
  }),
  rekanEntry({
    id: "leu",
    latinPujl: "leu",
    latinJgst: "ḷě",
    encodedAs: "JAVANESE LETTER NGA LELET RASWADI",
  }),
];

export function rekanById(id: string): Rekan | null {
  for (const r of rekan) {
    if (r.id === id) return r;
  }
  return null;
}
