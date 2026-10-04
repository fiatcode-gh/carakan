import { LatinParseError, type LatinToken } from "./latin-tokenizer.ts";

/** One syllable of Latin input, ready for aksara rendering. */
export interface Syllable {
  /**
   * 0..2 consonant tokens. Two = onset cluster (cakra/keret/pengkal/panjing
   * or generic pasangan).
   */
  readonly onset: readonly LatinToken[];
  /** Null when `keret` supplies the implicit pepet. */
  readonly vowelToken: LatinToken | null;
  /** Last onset member was JGST ṛ: consonant + r + pepet fused (keret). */
  readonly keret: boolean;
  /** Syllable IS a ṛ (pa cerek): empty onset, inherent vowel rě. */
  readonly cerek: boolean;
  /** Word-final or pre-cluster coda. */
  readonly coda: LatinToken | null;
}

export function syllable(init: {
  onset: readonly LatinToken[];
  vowelToken?: LatinToken | null;
  keret?: boolean;
  cerek?: boolean;
  coda?: LatinToken | null;
}): Syllable {
  return {
    onset: init.onset,
    vowelToken: init.vowelToken ?? null,
    keret: init.keret ?? false,
    cerek: init.cerek ?? false,
    coda: init.coda ?? null,
  };
}

/**
 * Splits a token stream into Javanese (C)(C)V(C) syllables.
 *
 * Rules (KAJ I orthography, applied to Latin input):
 * - one consonant between vowels -> onset of the next syllable;
 * - two consonants between vowels -> first closes, second opens;
 * - three -> first closes, rest form the onset cluster;
 * - word-initial consonant run of two -> onset cluster; longer -> error;
 * - JGST ṛ fuses with a preceding consonant (keret) or stands alone
 *   (pa cerek).
 */
export function syllabify(tokens: readonly LatinToken[]): Syllable[] {
  const sylls: Syllable[] = [];
  let i = 0;

  while (i < tokens.length) {
    const onset: LatinToken[] = [];
    let keret = false;
    let cerek = false;

    // Onset collection.
    while (i < tokens.length && tokens[i]!.kind === "consonant") {
      const t = tokens[i]!;
      if (t.sigegId !== null) break; // coda markers never open a syllable
      if (t.isCerekR) {
        if (onset.length === 0) {
          cerek = true; // pa cerek syllable: ṛ carries its own vowel
          i++;
        } else {
          onset.push(t); // keret: C + r + implicit pepet
          keret = true;
          i++;
        }
        break;
      }
      if (t.isCakraR || t.isPengkalY) {
        if (onset.length === 0) {
          throw new LatinParseError(
            t.sourceIndex,
            "Cluster marker without a leading consonant",
          );
        }
        onset.push(t);
        i++;
        break;
      }
      if (onset.length === 2) {
        throw new LatinParseError(
          t.sourceIndex,
          "Unsupported consonant cluster",
        );
      }
      onset.push(t);
      i++;
    }

    if (cerek) {
      const coda = maybeCoda(tokens, i);
      if (coda !== null) i++;
      sylls.push(syllable({ onset: [], cerek: true, coda }));
      continue;
    }

    if (keret) {
      const coda = maybeCoda(tokens, i);
      if (coda !== null) i++;
      sylls.push(syllable({ onset, keret: true, coda }));
      continue;
    }

    if (i >= tokens.length || tokens[i]!.kind !== "vowel") {
      if (onset.length === 0) {
        // A JGST '/' is only the visible pangkon of a consonant coda that
        // ends the word; anywhere else it would silently drop what follows.
        if (
          i < tokens.length &&
          tokens[i]!.kind === "pangkon" &&
          !(
            i === tokens.length - 1 &&
            i > 0 &&
            tokens[i - 1]!.kind === "consonant"
          )
        ) {
          throw new LatinParseError(
            tokens[i]!.sourceIndex,
            'A "/" must directly follow a final consonant',
          );
        }
        break;
      }
      throw new LatinParseError(
        onset[0]!.sourceIndex,
        "Syllable without a vowel",
      );
    }
    const vowelToken = tokens[i]!;
    i++;

    const coda = maybeCoda(tokens, i);
    if (coda !== null) i++;
    sylls.push(syllable({ onset, vowelToken, coda }));
  }
  return sylls;
}

/** A coda candidate: a consonant NOT followed by a vowel. */
function maybeCoda(
  tokens: readonly LatinToken[],
  i: number,
): LatinToken | null {
  if (i >= tokens.length) return null;
  const t = tokens[i]!;
  if (t.kind !== "consonant") return null;
  if (t.sigegId !== null) return t; // ṙ ŋ ḥ are always codas
  if (i + 1 < tokens.length && tokens[i + 1]!.kind === "vowel") {
    return null; // next syllable onset
  }
  if (
    i + 1 < tokens.length &&
    (tokens[i + 1]!.isCakraR || tokens[i + 1]!.isPengkalY)
  ) {
    return null; // next syllable onset cluster (C+r / C+y)
  }
  if (t.isCakraR || t.isPengkalY || t.isCerekR) {
    throw new LatinParseError(
      t.sourceIndex,
      "Cluster marker cannot close a syllable",
    );
  }
  return t;
}
