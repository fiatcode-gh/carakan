import { aksaraChar, type AksaraChar } from "./aksara-char.ts";

function entry(
  id: string,
  unicodeName: string,
  latinPujl: string,
  latinJgst: string,
): AksaraChar {
  return aksaraChar({ id, unicodeName, latinPujl, latinJgst });
}

/**
 * The 20 aksara nglegena (carakan) in teaching order — KAJ I Yogyakarta 2021,
 * Tata Tulis Simplified, Bab I A.1. PUJL = school spelling, JGST = canonical
 * scholarly transliteration (Daftar Transliterasi KAJ I).
 */
export const nglegena: readonly AksaraChar[] = [
  entry("ha", "JAVANESE LETTER HA", "ha", "ha"),
  entry("na", "JAVANESE LETTER NA", "na", "na"),
  entry("ca", "JAVANESE LETTER CA", "ca", "ca"),
  entry("ra", "JAVANESE LETTER RA", "ra", "ra"),
  entry("ka", "JAVANESE LETTER KA", "ka", "ka"),
  entry("da", "JAVANESE LETTER DA", "da", "da"),
  entry("ta", "JAVANESE LETTER TA", "ta", "ta"),
  entry("sa", "JAVANESE LETTER SA", "sa", "sa"),
  entry("wa", "JAVANESE LETTER WA", "wa", "wa"),
  entry("la", "JAVANESE LETTER LA", "la", "la"),
  entry("pa", "JAVANESE LETTER PA", "pa", "pa"),
  entry("dha", "JAVANESE LETTER DA MAHAPRANA", "dha", "ḍa"),
  entry("ja", "JAVANESE LETTER JA", "ja", "ja"),
  entry("ya", "JAVANESE LETTER YA", "ya", "ya"),
  entry("nya", "JAVANESE LETTER NYA", "nya", "ña"),
  entry("ma", "JAVANESE LETTER MA", "ma", "ma"),
  entry("ga", "JAVANESE LETTER GA", "ga", "ga"),
  entry("ba", "JAVANESE LETTER BA", "ba", "ba"),
  entry("tha", "JAVANESE LETTER TTA", "tha", "ṭa"),
  entry("nga", "JAVANESE LETTER NGA", "nga", "ṅa"),
];

/**
 * Nglegena that cannot close a syllable; they are replaced by sandhangan
 * instead: ha -> wignyan, ra -> layar, nga -> cecak (KAJ I Bab I A.1.b).
 */
export const noSigegNglegena: ReadonlySet<string> = new Set([
  "ha",
  "ra",
  "nga",
]);

/**
 * Nglegena whose pasangan is written behind (right of) the preceding aksara
 * instead of below it (KAJ I Bab I A.1, note a). Rendering/chart data.
 */
export const rightSidePasangan: ReadonlySet<string> = new Set([
  "ha",
  "sa",
  "pa",
]);

export function nglegenaById(id: string): AksaraChar | null {
  for (const a of nglegena) {
    if (a.id === id) return a;
  }
  return null;
}

export function nglegenaByUnicodeName(unicodeName: string): AksaraChar | null {
  for (const a of nglegena) {
    if (a.unicodeName === unicodeName) return a;
  }
  return null;
}

export const nglegenaByPujl: ReadonlyMap<string, AksaraChar> = new Map(
  nglegena.map((a) => [a.latinPujl, a]),
);

export const nglegenaByCodepoint: ReadonlyMap<number, AksaraChar> = new Map(
  nglegena.map((a) => [a.codepoint, a]),
);
