import { get, readonly, writable, type Readable } from "svelte/store";
import type { ConfusionPair } from "../../content/confusion-pair.ts";
import type {
  GlyphInfo,
  GlyphInfoTable,
} from "../../content/glyph-info-table.ts";
import type { Unit } from "../../content/unit.ts";
import type { Word } from "../../content/word.ts";
import type { MistakeLogRepository } from "../../core/db/mistake-log-repository.ts";
import type { UnitCompletionRepository } from "../../core/db/unit-completion-repository.ts";
import type { ReviewQueue } from "../../core/srs/review-queue.ts";
import { isTraceable } from "../tracing/traceable.ts";
import { confusionPairKeyFor } from "./confusion-pair-lookup.ts";
import { generateExercises, type Exercise } from "./exercise-generator.ts";

export type LessonState =
  | { readonly kind: "initial" }
  | {
      readonly kind: "meet";
      readonly unit: Unit;
      readonly index: number;
      readonly total: number;
      readonly glyph: GlyphInfo;
      readonly traceable: boolean;
    }
  | {
      readonly kind: "trace";
      readonly unit: Unit;
      readonly index: number;
      readonly total: number;
      readonly glyph: GlyphInfo;
    }
  | {
      readonly kind: "question";
      readonly unit: Unit;
      readonly index: number;
      readonly glyph: GlyphInfo;
      readonly number: number;
      readonly total: number;
      readonly exercise: Exercise;
    }
  | {
      readonly kind: "feedback";
      readonly unit: Unit;
      readonly index: number;
      readonly glyph: GlyphInfo;
      readonly number: number;
      readonly total: number;
      readonly exercise: Exercise;
      readonly selectedIndex: number;
      readonly correct: boolean;
    }
  | { readonly kind: "done"; readonly total: number; readonly correct: number };

/**
 * Stable regroup of a plan by the position of each exercise's glyph in the
 * unit; glyph ids not in the unit sort last, keeping their relative order.
 */
export function groupByGlyph(
  plan: readonly Exercise[],
  glyphs: readonly string[],
): Exercise[] {
  const rank = (e: Exercise): number => {
    const i = glyphs.indexOf(e.glyphId);
    return i === -1 ? glyphs.length : i;
  };
  return plan
    .map((exercise, order) => ({ exercise, order, rank: rank(exercise) }))
    .sort((a, b) => a.rank - b.rank || a.order - b.order)
    .map((x) => x.exercise);
}

export interface LessonDeps {
  corpus: readonly Word[];
  glyphInfo: GlyphInfoTable;
  completions: UnitCompletionRepository;
  reviewQueue: ReviewQueue;
  mistakes: MistakeLogRepository;
  confusionPairs: readonly ConfusionPair[];
  /** Epoch milliseconds. */
  now: () => number;
  seedSource: () => number;
}

const unknownGlyph: GlyphInfo = { id: "", name: "", char: "", pujl: "" };

/**
 * One unit session: for each glyph in turn meet it, trace it (base letters
 * only) and answer its generated questions; then complete the unit and
 * enqueue its glyphs into the shared review queue (spec 4.4).
 * Calls that do not match the current state are ignored.
 */
export class LessonSession {
  readonly #deps: LessonDeps;
  readonly #state = writable<LessonState>({ kind: "initial" });
  readonly state: Readable<LessonState> = readonly(this.#state);

  #unit: Unit | null = null;
  #plan: readonly Exercise[] = [];
  #glyphIndex = 0;
  #questionIndex = 0;
  #correct = 0;
  /** Set while a write is pending; a double tap must not run it twice. */
  #busy = false;
  readonly #failed = writable(false);
  /** True while the last step could not be stored; the state is unchanged. */
  readonly failed: Readable<boolean> = readonly(this.#failed);
  #retryStep: (() => Promise<void>) | null = null;

  constructor(deps: LessonDeps) {
    this.#deps = deps;
  }

  /** `taughtGlyphs` are the glyph ids of the completed units (W06). */
  start(unit: Unit, taughtGlyphs: ReadonlySet<string>): void {
    this.#unit = unit;
    this.#glyphIndex = 0;
    this.#questionIndex = 0;
    this.#correct = 0;
    this.#busy = false;
    this.#plan = groupByGlyph(
      generateExercises({
        unit,
        taughtGlyphs,
        corpus: this.#deps.corpus,
        seed: this.#deps.seedSource(),
        glyphInfo: this.#deps.glyphInfo,
      }),
      unit.glyphs,
    );
    this.#emitMeet(unit);
  }

  meetNext(): Promise<void> {
    return this.#attempt(() => this.#meetNext());
  }

  finishTrace(): Promise<void> {
    return this.#attempt(() => this.#finishTrace());
  }

  answer(index: number): Promise<void> {
    return this.#attempt(() => this.#answer(index));
  }

  /** After the last question's feedback (W05) this completes the unit. */
  continueAfterFeedback(): Promise<void> {
    return this.#attempt(() => this.#continueAfterFeedback());
  }

  /** Runs the step that failed to store again. */
  async retry(): Promise<void> {
    const step = this.#retryStep;
    if (step !== null) await this.#attempt(step);
  }

  /** A failed write leaves the state as it was and raises `failed`. */
  async #attempt(step: () => Promise<void>): Promise<void> {
    try {
      await step();
      this.#retryStep = null;
      this.#failed.set(false);
    } catch {
      this.#retryStep = step;
      this.#failed.set(true);
    }
  }

  async #meetNext(): Promise<void> {
    const unit = this.#unit;
    const current = get(this.#state);
    if (unit === null || current.kind !== "meet" || this.#busy) return;
    if (current.traceable) {
      this.#state.set({
        kind: "trace",
        unit,
        index: current.index,
        total: current.total,
        glyph: current.glyph,
      });
      return;
    }
    await this.#afterTrace(unit);
  }

  async #finishTrace(): Promise<void> {
    const unit = this.#unit;
    if (unit === null || get(this.#state).kind !== "trace" || this.#busy) {
      return;
    }
    await this.#afterTrace(unit);
  }

  /** The glyph's first question, else the next glyph's meet, else completion. */
  async #afterTrace(unit: Unit): Promise<void> {
    const first = this.#plan.findIndex(
      (e) => e.glyphId === unit.glyphs[this.#glyphIndex],
    );
    if (first !== -1) {
      this.#questionIndex = first;
      this.#emitQuestion(unit);
    } else {
      await this.#nextGlyph(unit);
    }
  }

  async #nextGlyph(unit: Unit): Promise<void> {
    if (this.#glyphIndex + 1 < unit.glyphs.length) {
      this.#glyphIndex += 1;
      this.#emitMeet(unit);
    } else {
      await this.#complete();
    }
  }

  async #answer(index: number): Promise<void> {
    const unit = this.#unit;
    const current = get(this.#state);
    if (unit === null || current.kind !== "question" || this.#busy) return;
    const { exercise } = current;
    const correct = index === exercise.answerIndex;
    this.#busy = true;
    try {
      if (!correct) await this.#recordMistake(exercise, index);
      if (correct) this.#correct += 1;
      this.#state.set({
        kind: "feedback",
        unit,
        index: current.index,
        glyph: current.glyph,
        number: this.#questionIndex + 1,
        total: this.#plan.length,
        exercise,
        selectedIndex: index,
        correct,
      });
    } finally {
      this.#busy = false;
    }
  }

  async #continueAfterFeedback(): Promise<void> {
    const unit = this.#unit;
    if (unit === null || get(this.#state).kind !== "feedback" || this.#busy) {
      return;
    }
    const next = this.#plan[this.#questionIndex + 1];
    if (next !== undefined && next.glyphId === unit.glyphs[this.#glyphIndex]) {
      this.#questionIndex += 1;
      this.#emitQuestion(unit);
    } else {
      await this.#nextGlyph(unit);
    }
  }

  #glyphAt(index: number): GlyphInfo {
    const id = this.#unit?.glyphs[index];
    return (
      (id === undefined ? undefined : this.#deps.glyphInfo.byId.get(id)) ??
      unknownGlyph
    );
  }

  #emitMeet(unit: Unit): void {
    const id = unit.glyphs[this.#glyphIndex];
    this.#state.set({
      kind: "meet",
      unit,
      index: this.#glyphIndex,
      total: unit.glyphs.length,
      glyph: this.#glyphAt(this.#glyphIndex),
      traceable: id !== undefined && isTraceable(id),
    });
  }

  #emitQuestion(unit: Unit): void {
    const exercise = this.#plan[this.#questionIndex];
    if (exercise === undefined) return;
    this.#state.set({
      kind: "question",
      unit,
      index: this.#glyphIndex,
      glyph: this.#glyphAt(this.#glyphIndex),
      number: this.#questionIndex + 1,
      total: this.#plan.length,
      exercise,
    });
  }

  async #recordMistake(exercise: Exercise, index: number): Promise<void> {
    const chosen =
      exercise.kind === "wordReading"
        ? exercise.glossOptions[index]
        : exercise.options[index];
    if (chosen === undefined) return;
    const pairKey = confusionPairKeyFor({
      targetGlyphId: exercise.glyphId,
      chosenOption: chosen,
      optionIsAksara: exercise.kind === "soundToGlyph",
      glyphInfo: this.#deps.glyphInfo,
      pairs: this.#deps.confusionPairs,
    });
    if (pairKey !== null)
      await this.#deps.mistakes.record(pairKey, this.#deps.now());
  }

  async #complete(): Promise<void> {
    const unit = this.#unit;
    if (unit === null) return;
    this.#busy = true;
    try {
      const now = this.#deps.now();
      await this.#deps.completions.complete(unit.id, now);
      for (const g of unit.glyphs) await this.#deps.reviewQueue.enqueue(g, now);
      this.#state.set({
        kind: "done",
        total: this.#plan.length,
        correct: this.#correct,
      });
    } finally {
      this.#busy = false;
    }
  }
}
