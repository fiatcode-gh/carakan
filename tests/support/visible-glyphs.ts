import {
  javaneseCodepoints,
  murdaLinks,
  nglegena,
  padaActive,
  padaCatalogue,
  sandhangan,
  swara,
  swaraCatalogue,
  zeroWidthNonJoiner,
} from "../../src/engine/index.ts";

const pangkon = javaneseCodepoints["JAVANESE PANGKON"]!;
const taling = javaneseCodepoints["JAVANESE VOWEL SIGN TALING"]!;
const tarung = javaneseCodepoints["JAVANESE VOWEL SIGN TARUNG"]!;
const dirgaMure = javaneseCodepoints["JAVANESE VOWEL SIGN DIRGA MURE"]!;
const cecakTelu = javaneseCodepoints["JAVANESE SIGN CECAK TELU"]!;
const pa = javaneseCodepoints["JAVANESE LETTER PA"]!;
const wa = javaneseCodepoints["JAVANESE LETTER WA"]!;

const padaCodepoints: ReadonlySet<number> = new Set(
  [...padaActive, ...padaCatalogue].map((p) => p.codepoint),
);

const letterIdByCp: ReadonlyMap<number, string> = new Map([
  ...nglegena.map((a) => [a.codepoint, a.id] as const),
  ...murdaLinks.map((m) => [m.aksara.codepoint, m.aksara.id] as const),
  ...[...swara, ...swaraCatalogue].map((s) => [s.codepoint, s.id] as const),
]);

const sandhanganIdByCp: ReadonlyMap<number, string> = new Map(
  sandhangan.map((s) => [s.codepoint, s.id] as const),
);

function isLetter(cp: number): boolean {
  return cp >= 0xa984 && cp <= 0xa9b2;
}

function runesOf(text: string): number[] {
  return Array.from(text, (c) => c.codePointAt(0)!);
}

/**
 * Which glyph ids a reader actually SEES in `aksara` (plan D13).
 *
 * Differs from `deriveGlyphs`, which lists every glyph a word *requires*:
 * a letter right after a pangkon is drawn as a pasangan (subjoined form), so
 * its base glyph is not visible; a pangkon that links to a following letter
 * is absorbed into that pasangan and is not drawn either.
 */
export function visibleGlyphs(aksara: string): Set<string> {
  const runes = runesOf(aksara);
  const visible = new Set<string>();

  for (let i = 0; i < runes.length; i++) {
    const cp = runes[i]!;
    if (cp === zeroWidthNonJoiner) continue;
    if (padaCodepoints.has(cp)) continue;

    const subjoined = i > 0 && runes[i - 1] === pangkon;
    const next = runes[i + 1];

    if (cp === pangkon) {
      if (next === undefined || !isLetter(next)) visible.add("pangkon");
    } else if (cp === cecakTelu) {
      throw new Error(`cecak telu without PA/WA in "${aksara}"`);
    } else if ((cp === pa || cp === wa) && next === cecakTelu) {
      if (!subjoined) visible.add(cp === pa ? "fa" : "va");
      i++;
    } else if (cp === dirgaMure) {
      if (next === tarung) {
        visible.add("au");
        i++;
      } else {
        visible.add("ai");
      }
    } else {
      const letterId = letterIdByCp.get(cp);
      const sandhanganId = sandhanganIdByCp.get(cp);
      if (letterId !== undefined) {
        if (!subjoined) visible.add(letterId);
      } else if (sandhanganId !== undefined) {
        visible.add(sandhanganId);
      } else {
        throw new Error(
          `unmapped codepoint U+${cp.toString(16)} in "${aksara}"`,
        );
      }
    }
  }
  return visible;
}

/**
 * True when `aksara` contains a pasangan (plan D13b): a PANGKON directly
 * followed by a letter, or by TALING then a letter (defensive; D1 order
 * never emits it). Panjing la/wa (klapa) is pasangan too. Cakra, keret,
 * pengkal and a word-final (or pre-pada) pangkon are not.
 */
export function hasPasangan(aksara: string): boolean {
  const runes = runesOf(aksara);
  for (let i = 0; i + 1 < runes.length; i++) {
    if (runes[i] !== pangkon) continue;
    let next = i + 1;
    if (runes[next] === taling && next + 1 < runes.length) next++;
    if (isLetter(runes[next]!)) return true;
  }
  return false;
}
