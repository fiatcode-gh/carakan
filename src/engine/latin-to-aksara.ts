import { ClusterWriter } from "./aksara-clusters.ts";
import { angkaDigitToChar, angkaFlanker } from "./angka.ts";
import { javaneseChar } from "./codepoints.ts";
import type {
  TextSpan,
  ToAksaraAmbiguous,
  ToAksaraResult,
  ToAksaraSuccess,
} from "./convert-result.ts";
import {
  LatinParseError,
  latinToken,
  tokenize,
  withAksara,
  type LatinToken,
  type Vowel,
} from "./latin/latin-tokenizer.ts";
import { syllabify, syllable, type Syllable } from "./latin/syllabifier.ts";
import { murdaFor } from "./murda.ts";
import { nglegenaByUnicodeName } from "./nglegena.ts";
import { zeroWidthNonJoiner } from "./pada.ts";
import { cecakTelu } from "./rekan.ts";
import {
  sandhanganCakra,
  sandhanganCecak,
  sandhanganKeret,
  sandhanganLayar,
  sandhanganPangkon,
  sandhanganPengkal,
  sandhanganPepet,
  sandhanganSuku,
  sandhanganTaling,
  sandhanganTarung,
  sandhanganWignyan,
  sandhanganWulu,
} from "./sandhangan.ts";

type ChunkKind = "word" | "digits" | "space" | "comma" | "period";

interface Chunk {
  readonly kind: ChunkKind;
  readonly text: string;
  /** Offset in UTF-16 code units of the input. */
  readonly start: number;
}

/** A tokenized word with its offset in the input, or a non-word chunk. */
type Item = { readonly tokens: LatinToken[]; readonly start: number } | Chunk;

/** Absolute input spans of `tokens`; synthetic (empty) tokens add nothing. */
function spansOf(
  wordStart: number,
  ...tokens: readonly (LatinToken | null)[]
): TextSpan[] {
  const spans: TextSpan[] = [];
  for (const t of tokens) {
    if (t === null || t.sourceEnd <= t.sourceIndex) continue;
    spans.push({
      start: wordStart + t.sourceIndex,
      end: wordStart + t.sourceEnd,
    });
  }
  return spans;
}

const isAsciiDigit = (ch: string): boolean => /^[0-9]$/.test(ch);

/**
 * Latin -> aksara converter. Ruleset kaj1-2021-simplified-v3. Vowel signs,
 * taling included, are stored after their base in Unicode order; the shaper
 * draws taling before it. Word-initial vowels take the ha carrier (KAJ I
 * p.5 3.b, p.124 8.b); only a capitalized vowel-initial word inside a
 * sentence keeps its swara letter.
 */
export function latinToAksara(
  input: string,
  useMurda: boolean,
): ToAksaraResult {
  try {
    const chunks = splitChunks(input);
    // Phase 1: tokenize every word so lexical errors surface before any
    // ambiguity handling.
    const tokenized: Item[] = [];
    let bareE = false;
    for (const chunk of chunks) {
      if (chunk.kind === "word") {
        try {
          const tokens = tokenize(chunk.text);
          tokenized.push({ tokens, start: chunk.start });
          if (tokens.some((t) => t.vowel === "eBare")) bareE = true;
        } catch (e) {
          if (e instanceof LatinParseError) {
            return {
              kind: "error",
              input,
              index: chunk.start + e.index,
              message: e.message,
            };
          }
          throw e;
        }
      } else {
        tokenized.push(chunk);
      }
    }

    if (bareE) {
      return ambiguous(input, tokenized, useMurda);
    }

    return renderSentence(tokenized, useMurda, null);
  } catch (e) {
    if (e instanceof LatinParseError) {
      return { kind: "error", input, index: e.index, message: e.message };
    }
    throw e;
  }
}

/**
 * Renders words and punctuation as joined writing (KAJ I p.24, p.126):
 * spaces write nothing, so a word-final pangkon links to the next word as
 * pasangan. A comma after a pangkon is that pangkon itself; the ZWNJ stops
 * the font from linking it to the next word. A full stop after a pangkon
 * is pada lingsa.
 */
function renderSentence(
  items: readonly Item[],
  useMurda: boolean,
  eSubstitution: Vowel | null,
): ToAksaraSuccess {
  const w = new ClusterWriter();
  let pangkonOpen = false; // output ends with PANGKON (ignoring a ZWNJ)
  let breakPending = false; // previous word ended with an explicit `/`
  let endsWithZwnj = false;
  let sentenceStart = true; // input start or right after a full stop
  const zwnj = String.fromCodePoint(zeroWidthNonJoiner);

  for (const item of items) {
    if ("tokens" in item) {
      const tokens =
        eSubstitution === null
          ? item.tokens
          : substituteE(item.tokens, eSubstitution);
      if (breakPending) {
        w.write(zwnj, []);
        endsWithZwnj = true;
      }
      const before = w.text.length;
      renderWord(tokens, useMurda, sentenceStart, item.start, w);
      sentenceStart = false;
      endsWithZwnj = false;
      pangkonOpen =
        w.text.length > before && w.text.endsWith(sandhanganPangkon.char);
      breakPending =
        pangkonOpen && tokens[tokens.length - 1]!.kind === "pangkon";
      continue;
    }
    const chunk = item;
    const here = [{ start: chunk.start, end: chunk.start + 1 }];
    switch (chunk.kind) {
      case "space":
        break;
      case "comma":
        breakPending = false;
        if (pangkonOpen) {
          if (!endsWithZwnj) {
            w.write(zwnj, here);
            endsWithZwnj = true;
          } else {
            w.attribute(here);
          }
        } else {
          w.write(javaneseChar("JAVANESE PADA LINGSA"), here);
          endsWithZwnj = false;
        }
        break;
      case "period":
        sentenceStart = true;
        breakPending = false;
        w.write(
          javaneseChar(
            pangkonOpen ? "JAVANESE PADA LINGSA" : "JAVANESE PADA LUNGSI",
          ),
          here,
        );
        endsWithZwnj = false;
        pangkonOpen = false;
        break;
      case "digits": {
        breakPending = false;
        const run = [
          { start: chunk.start, end: chunk.start + chunk.text.length },
        ];
        w.write(angkaFlanker.char, run);
        let d = chunk.start;
        for (const digit of chunk.text) {
          w.write(angkaDigitToChar(Number(digit)), [{ start: d, end: d + 1 }]);
          d++;
        }
        w.write(angkaFlanker.char, run);
        endsWithZwnj = false;
        pangkonOpen = false;
        break;
      }
      case "word":
        throw new Error("word chunks must be tokenized before rendering");
    }
  }
  if (endsWithZwnj) w.dropLast();
  return { kind: "success", ...w.finish() };
}

function renderWord(
  tokens: readonly LatinToken[],
  useMurda: boolean,
  sentenceStart: boolean,
  wordStart: number,
  w: ClusterWriter,
): void {
  const effective = useMurda ? applyMurda(tokens) : tokens;
  const first = effective[0]!;
  const isVowel = first.kind === "vowel";
  // KAJ I p.5 3.b: swara only for capitalized names inside a sentence.
  const swaraName = isVowel && first.capitalized && !sentenceStart;
  const carried =
    isVowel && !swaraName
      ? [
          latinToken({
            kind: "consonant",
            text: "h",
            sourceIndex: first.sourceIndex,
            aksaraUnicodeName: "JAVANESE LETTER HA",
          }),
          ...effective,
        ]
      : effective;
  render(withGlides(syllabify(carried)), w, wordStart);
  const last = tokens[tokens.length - 1]!;
  if (last.kind === "pangkon") w.attribute(spansOf(wordStart, last));
}

/**
 * KAJ I "Kata Asing": a vowel-initial syllable after a consonant-final
 * syllable gets a glide onset — w after u/o, y after i/é (the "pelancar"
 * convention). Lossy by design: corpus canonicals write the glide
 * explicitly (decision 5). After a the swara letter is used instead (T5.3),
 * and after a pepet the hiatus stays an explicit error (rendered later).
 */
function withGlides(sylls: readonly Syllable[]): Syllable[] {
  const result: Syllable[] = [];
  for (let s = 0; s < sylls.length; s++) {
    const syll = sylls[s]!;
    if (
      s === 0 ||
      syll.onset.length > 0 ||
      syll.cerek ||
      syll.keret ||
      syll.vowelToken === null
    ) {
      result.push(syll);
      continue;
    }
    const prev = result[result.length - 1]!.vowelToken?.vowel ?? null;
    let glide: "w" | "y" | null;
    switch (prev) {
      case "u":
      case "o":
        glide = "w";
        break;
      case "i":
      case "eTaling":
        glide = "y";
        break;
      default:
        glide = null; // a → swara letter; ě/null → error (rendered later)
    }
    if (glide === null) {
      result.push(syll);
      continue;
    }
    result.push(
      syllable({
        onset: [
          latinToken({
            kind: "consonant",
            text: glide,
            sourceIndex: 0,
            aksaraUnicodeName:
              glide === "w" ? "JAVANESE LETTER WA" : "JAVANESE LETTER YA",
          }),
        ],
        vowelToken: syll.vowelToken,
        coda: syll.coda,
      }),
    );
  }
  return result;
}

/**
 * KAJ I Bab I A.2: murda is honorific and never mandatory. This opt-in
 * applies the honorific style seen in the KAJ examples (Nabi Nuh: every
 * aksara that has a murda form takes it). Triggered only by a capitalized
 * first letter. Rule d's single-murda variant for ordinary names would
 * require name classification; deferred to a later ruleset.
 */
function applyMurda(tokens: readonly LatinToken[]): readonly LatinToken[] {
  if (tokens.length === 0 || !tokens[0]!.capitalized) return tokens;
  let changed = false;
  const copy = tokens.slice();
  for (let t = 0; t < copy.length; t++) {
    const tok = copy[t]!;
    if (
      tok.kind !== "consonant" ||
      tok.aksaraUnicodeName === null ||
      tok.rekanId !== null
    ) {
      continue;
    }
    const base = nglegenaByUnicodeName(tok.aksaraUnicodeName);
    if (base === null) continue; // already murda or a marker
    const link = murdaFor(base.id);
    if (link === null) continue;
    copy[t] = withAksara(tok, link.aksara.unicodeName);
    changed = true;
  }
  return changed ? copy : tokens;
}

/**
 * Spec 6.2: bare "e" is unresolvable by rule — PUJL writes pepet and
 * taling alike. Return both readings; the UI (converter toggle) chooses.
 */
function ambiguous(
  input: string,
  tokenized: readonly Item[],
  useMurda: boolean,
): ToAksaraAmbiguous {
  const candidates: ToAksaraSuccess[] = [];
  for (const substitution of ["ePepet", "eTaling"] as const) {
    candidates.push(renderSentence(tokenized, useMurda, substitution));
  }
  return {
    kind: "ambiguous",
    input,
    candidates,
    reason:
      'Bare "e" is pepet (ě) or taling (é) — PUJL does not mark ' +
      "the difference (KAJ I Daftar Transliterasi). Choose a reading, " +
      "or type ě/ê/é/è.",
  };
}

/**
 * Replace every bare-e token with `substitution`.
 *
 * For pepet after a consonant cluster ending in r (C+r+ě), restructure
 * the token list so the syllabifier takes the keret path: mark r as
 * isCerekR and drop the vowel token (keret carries an implicit pepet).
 * KAJ I Bab I A.5.b: "clusters use keret".
 */
function substituteE(
  tokens: readonly LatinToken[],
  substitution: Vowel,
): LatinToken[] {
  const result: LatinToken[] = [];
  for (const t of tokens) {
    if (t.vowel !== "eBare") {
      result.push(t);
      continue;
    }
    // C+r+ě → keret: cluster ending in RA + pepet substitution.
    if (
      substitution === "ePepet" &&
      result.length >= 2 &&
      result[result.length - 1]!.kind === "consonant" &&
      result[result.length - 1]!.aksaraUnicodeName === "JAVANESE LETTER RA" &&
      result[result.length - 2]!.kind === "consonant"
    ) {
      const r = result.pop()!;
      result.push(
        latinToken({
          kind: r.kind,
          text: r.text,
          sourceIndex: r.sourceIndex,
          // The dropped e stays attributed to the keret cluster.
          sourceEnd: t.sourceEnd,
          aksaraUnicodeName: r.aksaraUnicodeName,
          isCerekR: true,
          capitalized: r.capitalized,
        }),
      );
      // Vowel token is dropped — keret carries implicit pepet.
    } else {
      result.push(
        latinToken({
          kind: "vowel",
          text: substitution === "ePepet" ? "ě" : "é",
          vowel: substitution,
          capitalized: t.capitalized,
          sourceIndex: t.sourceIndex,
          sourceEnd: t.sourceEnd,
        }),
      );
    }
  }
  return result;
}

function writeCoda(
  w: ClusterWriter,
  coda: LatinToken | null,
  wordStart: number,
): void {
  if (coda !== null) w.write(codaText(coda), spansOf(wordStart, coda));
}

function render(
  sylls: readonly Syllable[],
  w: ClusterWriter,
  wordStart: number,
): void {
  for (let s = 0; s < sylls.length; s++) {
    const syll = sylls[s]!;

    if (syll.cerek) {
      w.write(
        javaneseChar("JAVANESE LETTER PA CEREK"),
        spansOf(wordStart, syll.cerekToken),
      );
      writeCoda(w, syll.coda, wordStart);
      continue;
    }

    if (syll.onset.length === 0) {
      if (s !== 0) {
        // Mid-word vowel-initial syllable. After a the KAJ uses the swara
        // letter; after a pepet (or after a keret/cerek syllable with no
        // vowel token) the hiatus is not supported — explicit error, never
        // a guess.
        const prev = sylls[s - 1]!.vowelToken?.vowel ?? null;
        if (prev !== "a") {
          throw new LatinParseError(
            syll.vowelToken?.sourceIndex ?? 0,
            "Vowel hiatus after a pepet is not supported",
          );
        }
      }
      w.write(swaraFor(syll.vowelToken), spansOf(wordStart, syll.vowelToken));
      writeCoda(w, syll.coda, wordStart);
      continue;
    }

    const v = syll.vowelToken?.vowel ?? null;
    const first = syll.onset[0]!;
    let buf = "";
    let vowelSpans = spansOf(wordStart, syll.vowelToken);
    let tail: { text: string; spans: TextSpan[] } | null = null;

    // KAJ I Bab I A.5.b: re/le syllables never take pepet — ra+ě becomes
    // pa cerek, la+ě becomes nga lelet (single onset only; clusters use
    // keret). KAJ I p.7 Catatan b: la+ě right after a pangkon coda in the
    // same word stays la + pepet (pasangan la).
    const subjoined = s > 0 && isPangkonCoda(sylls[s - 1]!.coda);
    let baseName = first.aksaraUnicodeName!;
    if (v === "ePepet" && syll.onset.length === 1) {
      if (baseName === "JAVANESE LETTER RA") {
        baseName = "JAVANESE LETTER PA CEREK";
      } else if (baseName === "JAVANESE LETTER LA" && !subjoined) {
        baseName = "JAVANESE LETTER NGA LELET";
      }
    }

    buf += javaneseChar(baseName);

    // Rekan: the cecak telu (nukta) attaches after the base letter (UTN47).
    if (first.rekanId !== null) {
      buf += cecakTelu.char;
    }

    if (syll.keret) {
      buf += sandhanganKeret.char;
    } else if (syll.onset.length === 2) {
      const second = syll.onset[1]!;
      if (
        second.isCakraR ||
        second.aksaraUnicodeName === "JAVANESE LETTER RA"
      ) {
        buf += sandhanganCakra.char;
      } else if (
        second.isPengkalY ||
        second.aksaraUnicodeName === "JAVANESE LETTER YA"
      ) {
        buf += sandhanganPengkal.char;
      } else if (second.aksaraUnicodeName === "JAVANESE LETTER LA") {
        buf += sandhanganPangkon.char; // panjing la
        buf += javaneseChar("JAVANESE LETTER LA");
      } else if (second.aksaraUnicodeName === "JAVANESE LETTER WA") {
        buf += sandhanganPangkon.char; // panjing wa
        buf += javaneseChar("JAVANESE LETTER WA");
      } else {
        throw new LatinParseError(
          second.sourceIndex,
          "Unsupported onset cluster",
        );
      }
    }

    switch (v) {
      case null:
      case "a":
        break; // inherent a
      case "i":
        buf += sandhanganWulu.char;
        break;
      case "u":
        buf += sandhanganSuku.char;
        break;
      case "ePepet":
        // Already substituted to cerek/lelet above when applicable.
        if (baseName === first.aksaraUnicodeName) {
          buf += sandhanganPepet.char;
        }
        break;
      case "eTaling":
        buf += sandhanganTaling.char;
        break;
      case "o":
        buf += sandhanganTaling.char;
        buf += sandhanganTarung.char;
        break;
      case "aa": {
        // KAJ Kata Asing: a ganda (double a, pronounced separately) is
        // the swara A — maaf, taat. The first a belongs to the base letter,
        // the second to the swara. A lone ā has no first a: when its onset
        // is a real consonant it belongs wholly to the swara; when the onset
        // is synthetic (ha carrier or glide, nothing in the text) the base
        // letter and the swara both point at the ā.
        const span = vowelSpans[0];
        const text = javaneseChar("JAVANESE LETTER A");
        if (span !== undefined && span.end - span.start >= 2) {
          vowelSpans = [{ start: span.start, end: span.start + 1 }];
          tail = { text, spans: [{ start: span.start + 1, end: span.end }] };
        } else {
          if (spansOf(wordStart, ...syll.onset).length > 0) vowelSpans = [];
          tail = { text, spans: span === undefined ? [] : [span] };
        }
        break;
      }
      case "ii":
        buf += javaneseChar("JAVANESE VOWEL SIGN WULU MELIK");
        break;
      case "uu":
        buf += javaneseChar("JAVANESE VOWEL SIGN SUKU MENDUT");
        break;
      case "ai":
      case "au":
        // Both write the sign; only au adds the tarung.
        buf += javaneseChar("JAVANESE VOWEL SIGN DIRGA MURE");
        if (v === "au") {
          buf += sandhanganTarung.char;
        }
        break;
      case "eBare":
        throw new LatinParseError(
          syll.vowelToken!.sourceIndex,
          "Bare e reached the renderer; ambiguity must be resolved first",
        );
    }

    w.write(buf, [...spansOf(wordStart, ...syll.onset), ...vowelSpans]);
    if (tail !== null) w.write(tail.text, tail.spans);
    writeCoda(w, syll.coda, wordStart);
  }
}

/**
 * True when `coda` is written as a consonant + pangkon (which then links to
 * the next onset as pasangan), i.e. everything except the sigeg signs layar
 * (r), cecak (ng) and wignyan (h).
 */
function isPangkonCoda(coda: LatinToken | null): boolean {
  if (coda === null) return false;
  if (
    coda.sigegId === "r" ||
    coda.aksaraUnicodeName === "JAVANESE LETTER RA" ||
    coda.aksaraUnicodeName === "JAVANESE LETTER RA AGUNG"
  ) {
    return false;
  }
  if (
    coda.sigegId === "ng" ||
    coda.aksaraUnicodeName === "JAVANESE LETTER NGA"
  ) {
    return false;
  }
  if (coda.sigegId === "h" || coda.aksaraUnicodeName === "JAVANESE LETTER HA") {
    return false;
  }
  return true;
}

function codaText(coda: LatinToken | null): string {
  if (coda === null) return "";
  // Codas render as sandhangan — never as sigeg aksara — which keeps the
  // no-sigeg rule for ha/ra/nga intact (KAJ I Bab I A.1.b).
  if (!isPangkonCoda(coda)) {
    if (
      coda.sigegId === "r" ||
      coda.aksaraUnicodeName === "JAVANESE LETTER RA" ||
      coda.aksaraUnicodeName === "JAVANESE LETTER RA AGUNG"
    ) {
      return sandhanganLayar.char;
    }
    if (
      coda.sigegId === "ng" ||
      coda.aksaraUnicodeName === "JAVANESE LETTER NGA"
    ) {
      return sandhanganCecak.char;
    }
    return sandhanganWignyan.char;
  }
  // Rekan coda (e.g. the f of maaf): base + cecak telu + pangkon.
  if (coda.rekanId !== null) {
    return (
      javaneseChar(coda.aksaraUnicodeName!) +
      cecakTelu.char +
      sandhanganPangkon.char
    );
  }

  // Any other coda: the consonant letter plus pangkon. The pangkon links to
  // the next syllable's onset (pasangan), also across words (joined
  // writing); word-final at the end of a chunk it stands alone (KAJ I Bab I
  // A.5.d; UTN47 section 4).
  return javaneseChar(coda.aksaraUnicodeName!) + sandhanganPangkon.char;
}

function swaraFor(t: LatinToken | null): string {
  switch (t?.vowel ?? null) {
    case "a":
      return javaneseChar("JAVANESE LETTER A");
    case "i":
      return javaneseChar("JAVANESE LETTER I");
    case "u":
      return javaneseChar("JAVANESE LETTER U");
    case "eTaling":
      return javaneseChar("JAVANESE LETTER E");
    case "o":
      return javaneseChar("JAVANESE LETTER O");
    case "aa":
      return javaneseChar("JAVANESE LETTER A") + sandhanganTarung.char;
    case "ii":
      return javaneseChar("JAVANESE LETTER II");
    case "uu":
      return javaneseChar("JAVANESE LETTER U") + sandhanganTarung.char;
    case "ai":
      return javaneseChar("JAVANESE LETTER AI");
    case "au":
      return javaneseChar("JAVANESE LETTER O") + sandhanganTarung.char;
    case "ePepet":
      // KAJ I Bab I A.4 rekaan: independent e = a + pepet.
      return javaneseChar("JAVANESE LETTER A") + sandhanganPepet.char;
    default:
      throw new LatinParseError(
        t?.sourceIndex ?? 0,
        "Vowel required for a vowel-only syllable",
      );
  }
}

/** True when `ch` can begin a word (anything but a separator or a digit). */
function startsWord(ch: string): boolean {
  return (
    ch !== " " && ch !== "," && ch !== "." && ch !== "/" && !isAsciiDigit(ch)
  );
}

function splitChunks(input: string): Chunk[] {
  const chunks: Chunk[] = [];
  let word = "";
  let digits = "";
  let wordStart = 0;
  let digitsStart = 0;

  const flushWord = (): void => {
    if (word.length > 0) {
      chunks.push({ kind: "word", text: word, start: wordStart });
      word = "";
    }
  };
  const flushDigits = (): void => {
    if (digits.length > 0) {
      chunks.push({ kind: "digits", text: digits, start: digitsStart });
      digits = "";
    }
  };

  const chars = input.split("");
  for (let idx = 0; idx < chars.length; idx++) {
    const ch = chars[idx]!;
    if (
      ch === "/" &&
      word.length > 0 &&
      idx + 1 < chars.length &&
      startsWord(chars[idx + 1]!)
    ) {
      // JGST `/` written directly against the next word (`bapak/hibu`) ends
      // this word with its visible pangkon, exactly like `bapak/ hibu`
      // (KAJ I p.24). The next word starts a new chunk; without this the
      // rest of the input would be lost behind the slash.
      word += ch;
      flushWord();
    } else if (ch === " ") {
      flushWord();
      flushDigits();
      chunks.push({ kind: "space", text: " ", start: idx });
    } else if (ch === ",") {
      flushWord();
      flushDigits();
      chunks.push({ kind: "comma", text: ",", start: idx });
    } else if (ch === ".") {
      flushWord();
      flushDigits();
      chunks.push({ kind: "period", text: ".", start: idx });
    } else if (isAsciiDigit(ch)) {
      flushWord();
      if (digits.length === 0) digitsStart = idx;
      digits += ch;
    } else {
      flushDigits();
      if (word.length === 0) wordStart = idx;
      word += ch;
    }
  }
  flushWord();
  flushDigits();
  return chunks;
}
