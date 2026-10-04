import { codepointOf } from "./aksara-char.ts";
import { javaneseChar } from "./codepoints.ts";

/** Function of a sandhangan per KAJ I Yogyakarta 2021, Bab I A.5. */
export type SandhanganFunction =
  "vowelChanging" | "syllableClosing" | "consonantModifying" | "vowelKiller";

/**
 * A sandhangan: a sign that changes or adds sound to an aksara or pasangan.
 *
 * Latin values per KAJ I Daftar Transliterasi (JGST and PUJL columns).
 * Note: in PUJL the pepet is written as plain "e", colliding with the bare
 * Latin "e" users type for taling — the engine surfaces this as an explicit
 * ambiguity instead of guessing (spec 6.2).
 */
export interface Sandhangan {
  readonly id: string;
  readonly unicodeName: string;
  readonly function: SandhanganFunction;
  readonly latinPujl: string;
  readonly latinJgst: string;
  readonly char: string;
  readonly codepoint: number;
}

function entry(
  id: string,
  unicodeName: string,
  fn: SandhanganFunction,
  latinPujl: string,
  latinJgst: string,
): Sandhangan {
  return {
    id,
    unicodeName,
    function: fn,
    latinPujl,
    latinJgst,
    get char() {
      return javaneseChar(this.unicodeName);
    },
    get codepoint() {
      return codepointOf(this.unicodeName);
    },
  };
}

export const sandhanganWulu = entry(
  "wulu",
  "JAVANESE VOWEL SIGN WULU",
  "vowelChanging",
  "i",
  "i",
);

export const sandhanganSuku = entry(
  "suku",
  "JAVANESE VOWEL SIGN SUKU",
  "vowelChanging",
  "u",
  "u",
);

export const sandhanganTaling = entry(
  "taling",
  "JAVANESE VOWEL SIGN TALING",
  "vowelChanging",
  "é",
  "é",
);

/**
 * Standalone tarung lengthens the inherent a (raswadi). Combined with a
 * preceding taling it yields the vowel o (taling tarung).
 */
export const sandhanganTarung = entry(
  "tarung",
  "JAVANESE VOWEL SIGN TARUNG",
  "vowelChanging",
  "aa",
  "ā",
);

export const sandhanganPepet = entry(
  "pepet",
  "JAVANESE VOWEL SIGN PEPET",
  "vowelChanging",
  "e",
  "ě",
);

export const sandhanganLayar = entry(
  "layar",
  "JAVANESE SIGN LAYAR",
  "syllableClosing",
  "r",
  "ṙ",
);

export const sandhanganCecak = entry(
  "cecak",
  "JAVANESE SIGN CECAK",
  "syllableClosing",
  "ng",
  "ŋ",
);

export const sandhanganWignyan = entry(
  "wignyan",
  "JAVANESE SIGN WIGNYAN",
  "syllableClosing",
  "h",
  "ḥ",
);

export const sandhanganPangkon = entry(
  "pangkon",
  "JAVANESE PANGKON",
  "vowelKiller",
  "",
  "",
);

export const sandhanganCakra = entry(
  "cakra",
  "JAVANESE CONSONANT SIGN CAKRA",
  "consonantModifying",
  "r",
  "ŕ",
);

/** Keret = cakra + pepet combined (syllable "rě" after a consonant); KAJ I Bab I A.5.e. */
export const sandhanganKeret = entry(
  "keret",
  "JAVANESE CONSONANT SIGN KERET",
  "consonantModifying",
  "re",
  "ṛ",
);

export const sandhanganPengkal = entry(
  "pengkal",
  "JAVANESE CONSONANT SIGN PENGKAL",
  "consonantModifying",
  "y",
  "ỿ",
);

export const sandhangan: readonly Sandhangan[] = [
  sandhanganWulu,
  sandhanganSuku,
  sandhanganTaling,
  sandhanganTarung,
  sandhanganPepet,
  sandhanganLayar,
  sandhanganCecak,
  sandhanganWignyan,
  sandhanganPangkon,
  sandhanganCakra,
  sandhanganKeret,
  sandhanganPengkal,
];

export function sandhanganById(id: string): Sandhangan | null {
  for (const s of sandhangan) {
    if (s.id === id) return s;
  }
  return null;
}

export const sandhanganByCodepoint: ReadonlyMap<number, Sandhangan> = new Map(
  sandhangan.map((s) => [s.codepoint, s]),
);
