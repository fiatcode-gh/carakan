import { murdaLinks } from "../murda.ts";
import { nglegena } from "../nglegena.ts";

/** Thrown for Latin input the engine cannot tokenize or syllabify. */
export class LatinParseError extends Error {
  readonly index: number;

  constructor(index: number, message: string) {
    super(message);
    this.name = "LatinParseError";
    this.index = index;
  }
}

/** Vowels recognized by the tokenizer. */
export type Vowel =
  | "a"
  | "i"
  | "u"
  | "o"
  | "eTaling" // é / è
  | "ePepet" // ě / ê
  | "eBare" // plain e — ambiguous; the engine surfaces candidates, never guesses
  | "aa"
  | "ii"
  | "uu"
  | "ai"
  | "au";

export type TokenKind = "consonant" | "vowel" | "pangkon" | "digit";

/** One token of Latin input. */
export interface LatinToken {
  readonly kind: TokenKind;
  readonly text: string;
  /**
   * For consonant tokens: official Unicode name of the aksara this onset
   * maps to (nglegena, murda or mahaprana). Null for marker tokens.
   */
  readonly aksaraUnicodeName: string | null;
  readonly vowel: Vowel | null;
  /**
   * JGST ṛ — consonant r with inherent pepet: keret after a consonant,
   * pa cerek at a syllable start.
   */
  readonly isCerekR: boolean;
  /** JGST ŕ — r as a cakra cluster member. */
  readonly isCakraR: boolean;
  /** JGST ỿ — y as a pengkal cluster member. */
  readonly isPengkalY: boolean;
  /** JGST coda sigeg markers: ṙ = layar, ŋ = cecak, ḥ = wignyan. */
  readonly sigegId: string | null;
  /** Rekan id ('fa' / 'va') when this consonant is a cecak-telu form. */
  readonly rekanId: string | null;
  /** Source letter was uppercase (drives the murda opt-in). */
  readonly capitalized: boolean;
  readonly sourceIndex: number;
}

export function latinToken(init: {
  kind: TokenKind;
  text: string;
  sourceIndex: number;
  aksaraUnicodeName?: string | null;
  vowel?: Vowel | null;
  isCerekR?: boolean;
  isCakraR?: boolean;
  isPengkalY?: boolean;
  sigegId?: string | null;
  rekanId?: string | null;
  capitalized?: boolean;
}): LatinToken {
  return {
    kind: init.kind,
    text: init.text,
    sourceIndex: init.sourceIndex,
    aksaraUnicodeName: init.aksaraUnicodeName ?? null,
    vowel: init.vowel ?? null,
    isCerekR: init.isCerekR ?? false,
    isCakraR: init.isCakraR ?? false,
    isPengkalY: init.isPengkalY ?? false,
    sigegId: init.sigegId ?? null,
    rekanId: init.rekanId ?? null,
    capitalized: init.capitalized ?? false,
  };
}

export function withAksara(token: LatinToken, unicodeName: string): LatinToken {
  return { ...token, aksaraUnicodeName: unicodeName };
}

interface OnsetEntry {
  readonly onset: readonly number[];
  readonly unicodeName: string;
}

const runesOf = (s: string): number[] =>
  Array.from(s, (c) => c.codePointAt(0)!);

/**
 * Nglegena onsets are matched before murda onsets, so where the two collide
 * (e.g. "tha" = PUJL TTA vs JGST TA MURDA) the school reading wins; murda
 * input stays reachable through its unique diacritics.
 */
function buildOnsets(): OnsetEntry[] {
  const seen = new Set<string>();
  const entries: OnsetEntry[] = [];
  const addAll = (latin: string, unicodeName: string): void => {
    const onset = latin.endsWith("a")
      ? latin.substring(0, latin.length - 1)
      : latin;
    if (onset.length === 0 || seen.has(onset)) return;
    seen.add(onset);
    entries.push({ onset: runesOf(onset), unicodeName });
  };

  // Nglegena first: PUJL digraphs and JGST single letters.
  for (const a of nglegena) {
    addAll(a.latinPujl, a.unicodeName);
    addAll(a.latinJgst, a.unicodeName);
  }
  // Then murda; collisions keep the nglegena reading.
  for (const m of murdaLinks) {
    addAll(m.aksara.latinJgst, m.aksara.unicodeName);
  }
  entries.sort((a, b) => b.onset.length - a.onset.length);
  return entries;
}

const onsets: readonly OnsetEntry[] = buildOnsets();

const vowels: ReadonlyMap<number, Vowel> = new Map<number, Vowel>([
  [0x61, "a"], // a
  [0x69, "i"], // i
  [0x75, "u"], // u
  [0x6f, "o"], // o
  [0x65, "eBare"], // e
  [0xe9, "eTaling"], // é
  [0xe8, "eTaling"], // è
  [0x11b, "ePepet"], // ě
  [0xea, "ePepet"], // ê
  [0x101, "aa"], // ā (JGST long a)
  [0x12b, "ii"], // ī
  [0x16b, "uu"], // ū
]);

const isAsciiDigit = (ch: string): boolean => /^[0-9]$/.test(ch);

const lowerRune = (rune: number): string =>
  String.fromCodePoint(rune).toLowerCase();

function matches(
  runes: readonly number[],
  i: number,
  onset: readonly number[],
): boolean {
  if (i + onset.length > runes.length) return false;
  for (let k = 0; k < onset.length; k++) {
    if (lowerRune(runes[i + k]!) !== String.fromCodePoint(onset[k]!)) {
      return false;
    }
  }
  return true;
}

/**
 * Tokenizes one Latin word for the engine. Accepts both PUJL (school
 * spelling: dh/th/ny/ng digraphs, é/è/ě/ê diacritics) and JGST (lossless
 * IAST-style input). Token `sourceIndex` is a rune index within the word.
 */
export function tokenize(word: string): LatinToken[] {
  const tokens: LatinToken[] = [];
  const runes = runesOf(word);
  let i = 0;

  while (i < runes.length) {
    const start = i;
    const r = runes[i]!;
    const ch = String.fromCodePoint(r);

    if (isAsciiDigit(ch)) {
      tokens.push(latinToken({ kind: "digit", text: ch, sourceIndex: start }));
      i++;
      continue;
    }

    const lower = ch.toLowerCase();
    const capitalized = lower !== ch;
    const lowerFirst = lower.codePointAt(0)!;

    const vowel = vowels.get(lowerFirst);
    if (vowel !== undefined) {
      // PUJL long vowels double the letter; ai/au are diphthongs.
      if (i + 1 < runes.length) {
        const next = lowerRune(runes[i + 1]!).codePointAt(0)!;
        let pair: { text: string; vowel: Vowel } | null = null;
        if (vowel === "a" && next === 0x61) pair = { text: "aa", vowel: "aa" };
        else if (vowel === "i" && next === 0x69)
          pair = { text: "ii", vowel: "ii" };
        else if (vowel === "u" && next === 0x75)
          pair = { text: "uu", vowel: "uu" };
        else if (vowel === "a" && next === 0x69)
          pair = { text: "ai", vowel: "ai" };
        else if (vowel === "a" && next === 0x75)
          pair = { text: "au", vowel: "au" };
        if (pair !== null) {
          tokens.push(
            latinToken({
              kind: "vowel",
              text: pair.text,
              vowel: pair.vowel,
              sourceIndex: start,
              capitalized,
            }),
          );
          i += 2;
          continue;
        }
      }
      tokens.push(
        latinToken({
          kind: "vowel",
          text: lower,
          vowel,
          capitalized,
          sourceIndex: start,
        }),
      );
      i++;
      continue;
    }

    // Rekan onsets (KAJ I Bab I A.4): f = PA + cecak telu, v = WA + cecak
    // telu. Single letters; matched before the onset table like the sigeg
    // markers. Capitalized input (F/V) lowers here, as everywhere.
    if (lower === "f" || lower === "v") {
      const isFa = lower === "f";
      tokens.push(
        latinToken({
          kind: "consonant",
          text: lower,
          sourceIndex: start,
          aksaraUnicodeName: isFa ? "JAVANESE LETTER PA" : "JAVANESE LETTER WA",
          rekanId: isFa ? "fa" : "va",
          capitalized,
        }),
      );
      i++;
      continue;
    }

    // JGST coda sigeg markers (always codas).
    if (ch === "ṙ") {
      tokens.push(
        latinToken({
          kind: "consonant",
          text: "ṙ",
          sigegId: "r",
          sourceIndex: start,
        }),
      );
      i++;
      continue;
    }
    if (ch === "ŋ") {
      tokens.push(
        latinToken({
          kind: "consonant",
          text: "ŋ",
          sigegId: "ng",
          sourceIndex: start,
        }),
      );
      i++;
      continue;
    }
    if (ch === "ḥ") {
      tokens.push(
        latinToken({
          kind: "consonant",
          text: "ḥ",
          sigegId: "h",
          sourceIndex: start,
        }),
      );
      i++;
      continue;
    }
    if (ch === "/") {
      tokens.push(
        latinToken({ kind: "pangkon", text: "/", sourceIndex: start }),
      );
      i++;
      continue;
    }

    // JGST cluster/cerek markers.
    if (ch === "ṛ") {
      tokens.push(
        latinToken({
          kind: "consonant",
          text: "ṛ",
          isCerekR: true,
          sourceIndex: start,
        }),
      );
      i++;
      continue;
    }
    if (ch === "ŕ") {
      tokens.push(
        latinToken({
          kind: "consonant",
          text: "ŕ",
          isCakraR: true,
          sourceIndex: start,
        }),
      );
      i++;
      continue;
    }
    if (ch === "ỿ") {
      tokens.push(
        latinToken({
          kind: "consonant",
          text: "ỿ",
          isPengkalY: true,
          sourceIndex: start,
        }),
      );
      i++;
      continue;
    }

    // Onset table, longest match first (covers PUJL digraphs and JGST
    // diacritic onsets alike).
    const hit = onsets.find((e) => matches(runes, i, e.onset));
    if (hit !== undefined) {
      tokens.push(
        latinToken({
          kind: "consonant",
          text: String.fromCodePoint(
            ...runes.slice(i, i + hit.onset.length),
          ).toLowerCase(),
          aksaraUnicodeName: hit.unicodeName,
          capitalized,
          sourceIndex: start,
        }),
      );
      i += hit.onset.length;
      continue;
    }

    throw new LatinParseError(start, `Unknown character "${ch}"`);
  }
  return tokens;
}
