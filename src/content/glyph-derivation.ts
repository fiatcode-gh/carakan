import {
  javaneseCodepoints,
  murdaLinks,
  nglegena,
  sandhangan,
  swara,
  swaraCatalogue,
} from "../engine/index.ts";
import { glyphUniverseIds } from "./glyph-universe.ts";

const nameByCp: ReadonlyMap<number, string> = new Map(
  Object.entries(javaneseCodepoints).map(([name, cp]) => [cp, name] as const),
);
const idByCp: ReadonlyMap<number, string> = new Map([
  ...nglegena.map((a) => [a.codepoint, a.id] as const),
  ...murdaLinks.map((m) => [m.aksara.codepoint, m.aksara.id] as const),
  ...[...swara, ...swaraCatalogue].map((s) => [s.codepoint, s.id] as const),
]);
const sandhanganByCp: ReadonlyMap<number, string> = new Map(
  sandhangan.map((s) => [s.codepoint, s.id] as const),
);

const cp = (name: string): number => javaneseCodepoints[name]!;
const letterPa = cp("JAVANESE LETTER PA");
const letterWa = cp("JAVANESE LETTER WA");
const cecakTelu = cp("JAVANESE SIGN CECAK TELU");
const dirgaMure = cp("JAVANESE VOWEL SIGN DIRGA MURE");
const tarung = cp("JAVANESE VOWEL SIGN TARUNG");

/**
 * True when the base at `i` is subjoined: the pangkon directly precedes
 * it (Unicode order stores any taling after the base).
 */
function precededByPangkon(runes: readonly number[], i: number): boolean {
  return i > 0 && nameByCp.get(runes[i - 1]!) === "JAVANESE PANGKON";
}

/**
 * Derives a word's required glyph ids (sorted by universe index) and
 * required capabilities from its engine-rendered aksara string. The corpus
 * tests assert the JSON values match this derivation — hand-typed sets that
 * disagree with the engine are test failures.
 */
export function deriveGlyphs(aksara: string): {
  ids: string[];
  caps: string[];
} {
  const ids = new Set<string>();
  const caps = new Set<string>();
  const runes = Array.from(aksara, (c) => c.codePointAt(0)!);
  for (let i = 0; i < runes.length; i++) {
    const rune = runes[i]!;
    const name = nameByCp.get(rune);
    if (name === undefined) {
      throw new Error(
        `codepoint U+${rune.toString(16)} not in the archived Javanese block data`,
      );
    }
    // Rekan: PA/WA + cecak telu = one fa/va id (never pa/wa + sign).
    if (
      (rune === letterPa || rune === letterWa) &&
      i + 1 < runes.length &&
      runes[i + 1] === cecakTelu
    ) {
      ids.add(rune === letterPa ? "fa" : "va");
      if (precededByPangkon(runes, i)) caps.add("pasangan");
      i++; // skip the cecak telu
      continue;
    }
    // Dirga mure: ai alone, au when followed by tarung.
    if (rune === dirgaMure) {
      if (i + 1 < runes.length && runes[i + 1] === tarung) {
        ids.add("au");
        i++;
      } else {
        ids.add("ai");
      }
      continue;
    }
    const baseId = idByCp.get(rune);
    if (baseId !== undefined) {
      ids.add(baseId);
      // pangkon + following base = subjoined form
      if (precededByPangkon(runes, i)) caps.add("pasangan");
    } else if (name === "JAVANESE PANGKON") {
      ids.add("pangkon");
    } else {
      const s = sandhanganByCp.get(rune);
      if (s === undefined) {
        throw new Error(`unmapped character ${name} in "${aksara}"`);
      }
      ids.add(s);
    }
  }
  const sorted = [...ids].sort(
    (a, b) => glyphUniverseIds.indexOf(a) - glyphUniverseIds.indexOf(b),
  );
  return { ids: sorted, caps: [...caps] };
}
