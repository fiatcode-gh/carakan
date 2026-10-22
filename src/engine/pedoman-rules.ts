import {
  LatinParseError,
  latinToken,
  withAksara,
  type LatinToken,
} from "./latin/latin-tokenizer.ts";
import { murdaLinks } from "./murda.ts";
import { nglegenaByUnicodeName } from "./nglegena.ts";
import { pedomanRulesetId, rulesetById } from "./ruleset.ts";

const pedomanMurda = rulesetById(pedomanRulesetId).murda;
const pedomanMurdaNames: ReadonlySet<string> = new Set(
  pedomanMurda.map((m) => m.aksara.unicodeName),
);
const murdaNames: ReadonlySet<string> = new Set(
  murdaLinks.map((m) => m.aksara.unicodeName),
);

/**
 * Pedoman 2002 lexical checks on one word's tokens; the first offender wins.
 * `v` becomes the single fa/va letter (Ped p.16).
 */
export function checkPedomanTokens(
  tokens: readonly LatinToken[],
): LatinToken[] {
  const out: LatinToken[] = [];
  for (let i = 0; i < tokens.length; i++) {
    let token = tokens[i]!;
    if (token.rekanId === "va") {
      token = {
        ...token,
        aksaraUnicodeName: "JAVANESE LETTER PA",
        rekanId: "fa",
      };
    }
    const name = token.kind === "consonant" ? token.aksaraUnicodeName : null;
    if (name !== null && murdaNames.has(name)) {
      if (!pedomanMurdaNames.has(name)) {
        // Ped p.11 no.1
        throw new LatinParseError(
          token.sourceIndex,
          "This murda is not part of Pedoman 2002",
        );
      }
      if (i > 0) {
        // Ped p.11-13; also a murda closing letter (p.11-12 no.3)
        throw new LatinParseError(
          token.sourceIndex,
          "Murda is written only on the first aksara of a word",
        );
      }
    }
    if (
      token.kind === "vowel" &&
      (token.vowel === "ii" || token.vowel === "uu")
    ) {
      throw new LatinParseError(
        token.sourceIndex,
        "Long vowels have no sign in Pedoman 2002",
      );
    }
    out.push(token);
  }
  return out;
}

/**
 * Pedoman `useMurda`: only a capitalized word's first consonant, and only
 * when the Pedoman has that murda (Ped p.11-13).
 */
export function applyInitialMurda(
  tokens: readonly LatinToken[],
): readonly LatinToken[] {
  const first = tokens[0];
  if (
    first === undefined ||
    !first.capitalized ||
    first.kind !== "consonant" ||
    first.rekanId !== null ||
    first.aksaraUnicodeName === null
  ) {
    return tokens;
  }
  const base = nglegenaByUnicodeName(first.aksaraUnicodeName);
  if (base === null) return tokens;
  const link = pedomanMurda.find((m) => m.baseId === base.id);
  if (link === undefined) return tokens;
  return [withAksara(first, link.aksara.unicodeName), ...tokens.slice(1)];
}

/** How a Pedoman ai/au is written: ha between the vowels (Ped p.33 baé) or a swara letter (Ped p.59 aula). */
export type VowelPairReading = "ha" | "swara";

/**
 * Splits every ai/au token into its two vowels (a + i/u), with a synthetic ha
 * between them for the "ha" reading. Each input span stays attributed: the
 * first vowel keeps the first letter, the second the rest.
 */
export function splitVowelPairs(
  tokens: readonly LatinToken[],
  reading: VowelPairReading,
): LatinToken[] {
  const out: LatinToken[] = [];
  for (const t of tokens) {
    if (t.vowel !== "ai" && t.vowel !== "au") {
      out.push(t);
      continue;
    }
    out.push(
      latinToken({
        kind: "vowel",
        text: "a",
        vowel: "a",
        capitalized: t.capitalized,
        sourceIndex: t.sourceIndex,
        sourceEnd: t.sourceIndex + 1,
      }),
    );
    if (reading === "ha") {
      out.push(
        latinToken({
          kind: "consonant",
          text: "h",
          sourceIndex: t.sourceIndex + 1,
          aksaraUnicodeName: "JAVANESE LETTER HA",
        }),
      );
    }
    const second = t.vowel === "ai" ? "i" : "u";
    out.push(
      latinToken({
        kind: "vowel",
        text: second,
        vowel: second,
        sourceIndex: t.sourceIndex + 1,
        sourceEnd: t.sourceEnd,
      }),
    );
  }
  return out;
}
