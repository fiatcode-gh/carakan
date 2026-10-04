import type { GlyphInfoTable } from "../../content/glyph-info-table.ts";
import {
  bitOf,
  containsGlyph,
  pasanganCap,
} from "../../content/glyph-universe.ts";
import type { Unit } from "../../content/unit.ts";
import type { Word } from "../../content/word.ts";
import {
  javaneseChar,
  murdaLinks,
  nglegenaById,
  sandhanganById,
  swaraById,
} from "../../engine/index.ts";
import { mulberry32, shuffle } from "./seeded-random.ts";

/**
 * Recognition options are PUJL strings (glyph to sound) or aksara strings
 * (sound to glyph); the correct one is at `answerIndex`.
 */
export type Exercise =
  | {
      readonly kind: "glyphToSound";
      readonly glyphId: string;
      readonly options: readonly string[];
      readonly answerIndex: number;
    }
  | {
      readonly kind: "soundToGlyph";
      readonly glyphId: string;
      readonly options: readonly string[];
      readonly answerIndex: number;
    }
  | {
      readonly kind: "wordReading";
      readonly glyphId: `word-${string}`;
      readonly word: Word;
      readonly glossOptions: readonly string[];
      readonly answerIndex: number;
    };

const maxRecognitionGlyphs = 12;
const wordReadings = 3;
const pasanganPrefix = "pasangan-";

export interface GenerateArgs {
  unit: Unit;
  taughtGlyphs: ReadonlySet<string>;
  corpus: readonly Word[];
  seed: number;
  glyphInfo: GlyphInfoTable;
  /** Member pairs `[a, b]`; a target's partner is always among its distractors. */
  confusionPairs?: readonly (readonly [string, string])[];
  /** The vocabulary quiz is drill-only; lessons never ask for it. */
  includeWordReadings?: boolean;
}

/**
 * Deterministic exercise generation (spec 4.1.2/4.1.3): seeded, options of 4
 * unique strings, a confusion-pair member forced into the distractors
 * (decision 10).
 */
export function generateExercises(args: GenerateArgs): Exercise[] {
  const {
    unit,
    taughtGlyphs,
    corpus,
    glyphInfo,
    confusionPairs = [],
    includeWordReadings = false,
  } = args;
  const rng = mulberry32(args.seed);
  const exercises: Exercise[] = [];

  const unitGlyphs = shuffle([...unit.glyphs], rng);
  const selected = unitGlyphs.slice(0, maxRecognitionGlyphs);
  const taught = new Set([
    ...taughtGlyphs,
    ...unit.glyphs.filter(containsGlyph),
  ]);

  selected.forEach((g, i) => {
    const base = g.startsWith(pasanganPrefix)
      ? g.substring(pasanganPrefix.length)
      : g;
    const targetPujl = pujlOf(base, glyphInfo);
    if (targetPujl === "") return;
    const candidates = distractorCandidates(
      g,
      base,
      taught,
      rng,
      confusionPairs,
    );
    if (i % 2 === 0) {
      const distractors = distinctOptions(targetPujl, candidates, (d) =>
        pujlOf(d, glyphInfo),
      );
      const options = shuffle([targetPujl, ...distractors], rng);
      exercises.push({
        kind: "glyphToSound",
        glyphId: g,
        options,
        answerIndex: options.indexOf(targetPujl),
      });
    } else {
      const answerChar = charOf(base, glyphInfo);
      // The prompt is the target's sound: a distractor that reads the same
      // (naMurda for na) would be a second right answer.
      const distractors = distinctOptions(
        answerChar,
        candidates.filter((d) => pujlOf(d, glyphInfo) !== targetPujl),
        (d) => charOf(d, glyphInfo),
      );
      const options = shuffle([answerChar, ...distractors], rng);
      exercises.push({
        kind: "soundToGlyph",
        glyphId: g,
        options,
        answerIndex: options.indexOf(answerChar),
      });
    }
  });

  if (includeWordReadings) {
    const taughtBits = [...taught].reduce(
      (acc, id) => acc | (containsGlyph(id) ? bitOf(id) : 0n),
      0n,
    );
    const taughtCaps = unit.caps.includes("pasangan") ? pasanganCap : 0n;
    const pool = corpus.filter((w) => w.readableBy(taughtBits, taughtCaps));
    if (pool.length >= 4) {
      const chosen = shuffle([...pool], rng);
      for (const w of chosen.slice(0, wordReadings)) {
        // Distractor glosses must be pairwise unique and differ from the
        // answer: real corpora repeat glosses, so dedupe across the readable
        // pool first, then pad from the full corpus (pool entries come
        // first, so pool glosses are preferred).
        const uniqueDistractors = shuffle(
          [
            ...new Set(
              [...pool, ...corpus]
                .filter((d) => d.id !== w.id && d.gloss !== w.gloss)
                .map((d) => d.gloss),
            ),
          ],
          rng,
        );
        const glossOptions = shuffle(
          [w.gloss, ...uniqueDistractors.slice(0, 3)],
          rng,
        );
        exercises.push({
          kind: "wordReading",
          glyphId: `word-${w.id}`,
          word: w,
          glossOptions,
          answerIndex: glossOptions.indexOf(w.gloss),
        });
      }
    }
  }

  return exercises;
}

function pujlOf(id: string, glyphInfo: GlyphInfoTable): string {
  const info = glyphInfo.byId.get(id);
  if (info !== undefined && info.pujl !== "") return info.pujl;
  const aksara = nglegenaById(id);
  if (aksara !== null) return aksara.latinPujl;
  const sandhangan = sandhanganById(id);
  if (sandhangan !== null) return sandhangan.latinPujl;
  for (const m of murdaLinks) {
    if (m.aksara.id === id) return m.aksara.latinPujl;
  }
  return swaraById(id)?.latinPujl ?? "";
}

function charOf(id: string, glyphInfo: GlyphInfoTable): string {
  const info = glyphInfo.byId.get(id);
  if (info !== undefined && info.char !== "") return info.char;
  const aksara = nglegenaById(id);
  if (aksara !== null) return aksara.char;
  const sandhangan = sandhanganById(id);
  // A sandhangan alone shapes as a dotted circle; carry it on a ha.
  if (sandhangan !== null) {
    return javaneseChar("JAVANESE LETTER HA") + sandhangan.char;
  }
  for (const m of murdaLinks) {
    if (m.aksara.id === id) return m.aksara.char;
  }
  return swaraById(id)?.char ?? "";
}

/**
 * Every candidate id: the target's confusion-pair partners first (pair
 * order), then the rest of the taught universe, shuffled. Putting the
 * partners first guarantees they survive the cut however large the taught
 * pool is.
 */
function distractorCandidates(
  targetId: string,
  targetBase: string,
  taught: ReadonlySet<string>,
  rng: () => number,
  confusionPairs: readonly (readonly [string, string])[],
): string[] {
  const excluded = (id: string) => id === targetId || id === targetBase;
  const partners = new Set<string>();
  for (const [a, b] of confusionPairs) {
    if (a === targetBase) partners.add(b);
    if (b === targetBase) partners.add(a);
  }
  const forced = [...partners].filter((id) => !excluded(id));
  const rest = shuffle(
    [...taught].filter(
      (id) => !excluded(id) && containsGlyph(id) && !partners.has(id),
    ),
    rng,
  );
  return [...forced, ...rest];
}

/**
 * The first 3 candidates, as the strings the learner sees. Strings must be
 * non-empty, differ from the answer and from each other: a murda shares its
 * PUJL with its nglegena (naMurda and na both read "na"), and two identical
 * options would make a wrong choice look right.
 */
function distinctOptions(
  answer: string,
  candidates: readonly string[],
  display: (id: string) => string,
): string[] {
  const taken = new Set([answer]);
  const options: string[] = [];
  for (const id of candidates) {
    const shown = display(id);
    if (shown === "" || taken.has(shown)) continue;
    taken.add(shown);
    options.push(shown);
    if (options.length === 3) break;
  }
  return options;
}
