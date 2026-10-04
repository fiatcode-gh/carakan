import { aksaraChar, type AksaraChar } from "./aksara-char.ts";

/**
 * KAJ I Yogyakarta 2021, Bab I A.2.f: murda usage is honorific and NEVER
 * mandatory — writing without murda "tetap dianggap benar" (is still correct).
 * The engine therefore never auto-applies murda; it is opt-in only.
 */
export const murdaNeverMandatory = true;

/** Link between an nglegena and its murda (capital/honorific) form. */
export interface MurdaLink {
  /** Id of the nglegena this murda belongs to. */
  readonly baseId: string;
  readonly aksara: AksaraChar;
  /** One of the 8 traditional murda (true) or a Unicode-era addition (false). */
  readonly traditional: boolean;
}

function link(
  baseId: string,
  traditional: boolean,
  id: string,
  unicodeName: string,
  latinPujl: string,
  latinJgst: string,
): MurdaLink {
  return {
    baseId,
    traditional,
    aksara: aksaraChar({
      id,
      unicodeName,
      latinPujl,
      latinJgst,
      category: "murda",
    }),
  };
}

/**
 * Murda catalog. PUJL has no distinct murda letters (school spelling is
 * case-blind), so `latinPujl` mirrors the JGST form for data completeness;
 * the converters never emit murda from PUJL input.
 */
export const murdaLinks: readonly MurdaLink[] = [
  link("na", true, "naMurda", "JAVANESE LETTER NA MURDA", "ṇa", "ṇa"),
  link("ka", true, "kaMurda", "JAVANESE LETTER KA MURDA", "ḳa", "ḳa"),
  // v2: dotted canonical JGST — the bare "tha" collides
  link("ta", true, "taMurda", "JAVANESE LETTER TA MURDA", "tha", "ṭha"),
  link("sa", true, "saMurda", "JAVANESE LETTER SA MURDA", "śa", "śa"),
  link("pa", true, "paMurda", "JAVANESE LETTER PA MURDA", "p̣a", "p̣a"),
  link("nya", true, "nyaMurda", "JAVANESE LETTER NYA MURDA", "jña", "jña"),
  link("ga", true, "gaMurda", "JAVANESE LETTER GA MURDA", "g̣a", "g̣a"),
  link("ba", true, "baMurda", "JAVANESE LETTER BA MURDA", "ḅa", "ḅa"),
  link("ca", false, "caMurda", "JAVANESE LETTER CA MURDA", "c̣a", "c̣a"),
  link("ja", false, "jaMurda", "JAVANESE LETTER JA MAHAPRANA", "j̣a", "j̣a"),
  link("ra", false, "raAgung", "JAVANESE LETTER RA AGUNG", "ṟa", "ṟa"),
];

export function murdaFor(baseId: string): MurdaLink | null {
  for (const m of murdaLinks) {
    if (m.baseId === baseId) return m;
  }
  return null;
}
