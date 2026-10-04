import { javaneseChar, javaneseCodepoints } from "./codepoints.ts";

/** Codepoint of an official Unicode name; throws for unknown names. */
export function codepointOf(unicodeName: string): number {
  const cp = Object.hasOwn(javaneseCodepoints, unicodeName)
    ? javaneseCodepoints[unicodeName]
    : undefined;
  if (cp === undefined) {
    throw new Error(`Unknown Javanese Unicode name: "${unicodeName}"`);
  }
  return cp;
}

/** Category of a base character in the Javanese script. */
export type AksaraCategory = "nglegena" | "murda" | "swara" | "rekan";

/**
 * One base character (aksara) of the Javanese script.
 *
 * `latinPujl` is the user-facing school spelling (PUJL — Pelatinan Umum Jawa
 * Latin, per Balai Bahasa Yogyakarta), as tabulated in KAJ I Yogyakarta 2021.
 * `latinJgst` is the scholarly transliteration (JGST — Javanese General System
 * of Transliteration, Komisi I KAJ I Yogyakarta 2021). JGST is lossless: every
 * aksara has a distinct JGST form.
 */
export interface AksaraChar {
  /** Stable identifier, e.g. 'dha' for JAVANESE LETTER DA MAHAPRANA. */
  readonly id: string;
  /** Official Unicode character name — the only link to codepoints. */
  readonly unicodeName: string;
  readonly latinPujl: string;
  readonly latinJgst: string;
  readonly category: AksaraCategory;
  readonly char: string;
  readonly codepoint: number;
}

export function aksaraChar(init: {
  id: string;
  unicodeName: string;
  latinPujl: string;
  latinJgst: string;
  category?: AksaraCategory;
}): AksaraChar {
  return {
    id: init.id,
    unicodeName: init.unicodeName,
    latinPujl: init.latinPujl,
    latinJgst: init.latinJgst,
    category: init.category ?? "nglegena",
    get char() {
      return javaneseChar(this.unicodeName);
    },
    get codepoint() {
      return codepointOf(this.unicodeName);
    },
  };
}

/**
 * Consonant onset without the inherent vowel. Both Latin forms of every
 * nglegena end in 'a' (asserted in nglegena.test.ts).
 */
export function onset(a: AksaraChar, { jgst }: { jgst: boolean }): string {
  const latin = jgst ? a.latinJgst : a.latinPujl;
  return latin.endsWith("a") ? latin.substring(0, latin.length - 1) : latin;
}
