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
    }
  | {
      readonly kind: "question";
      readonly unit: Unit;
      readonly number: number;
      readonly total: number;
      readonly exercise: Exercise;
    }
  | {
      readonly kind: "feedback";
      readonly unit: Unit;
      readonly number: number;
      readonly total: number;
      readonly exercise: Exercise;
      readonly selectedIndex: number;
      readonly correct: boolean;
    }
  | { readonly kind: "done"; readonly total: number; readonly correct: number };

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
 * One unit session: meet every glyph, answer generated questions, complete the
 * unit and enqueue its glyphs into the shared review queue (spec 4.4).
 * Calls that do not match the current state are ignored.
 */
export class LessonSession {
  readonly #deps: LessonDeps;
  readonly #state = writable<LessonState>({ kind: "initial" });
  readonly state: Readable<LessonState> = readonly(this.#state);

  #unit: Unit | null = null;
  #plan: readonly Exercise[] = [];
  #meetIndex = 0;
  #questionIndex = 0;
  #correct = 0;
  /** Set while a write is pending; a double tap must not run it twice. */
  #busy = false;

  constructor(deps: LessonDeps) {
    this.#deps = deps;
  }

  /** `taughtGlyphs` are the glyph ids of the completed units (W06). */
  start(unit: Unit, taughtGlyphs: ReadonlySet<string>): void {
    this.#unit = unit;
    this.#meetIndex = 0;
    this.#questionIndex = 0;
    this.#correct = 0;
    this.#busy = false;
    this.#plan = generateExercises({
      unit,
      taughtGlyphs,
      corpus: this.#deps.corpus,
      seed: this.#deps.seedSource(),
      glyphInfo: this.#deps.glyphInfo,
    });
    this.#emitMeet(unit);
  }

  async meetNext(): Promise<void> {
    const unit = this.#unit;
    const current = get(this.#state);
    if (unit === null || current.kind !== "meet" || this.#busy) return;
    if (this.#meetIndex + 1 < unit.glyphs.length) {
      this.#meetIndex += 1;
      this.#emitMeet(unit);
    } else if (this.#plan.length === 0) {
      await this.#complete();
    } else {
      this.#emitQuestion(unit);
    }
  }

  async answer(index: number): Promise<void> {
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

  /** After the last question's feedback (W05) this completes the unit. */
  async continueAfterFeedback(): Promise<void> {
    const unit = this.#unit;
    if (unit === null || get(this.#state).kind !== "feedback" || this.#busy) {
      return;
    }
    if (this.#questionIndex === this.#plan.length - 1) {
      await this.#complete();
      return;
    }
    this.#questionIndex += 1;
    this.#emitQuestion(unit);
  }

  #emitMeet(unit: Unit): void {
    const id = unit.glyphs[this.#meetIndex];
    this.#state.set({
      kind: "meet",
      unit,
      index: this.#meetIndex,
      total: unit.glyphs.length,
      glyph:
        (id === undefined ? undefined : this.#deps.glyphInfo.byId.get(id)) ??
        unknownGlyph,
    });
  }

  #emitQuestion(unit: Unit): void {
    const exercise = this.#plan[this.#questionIndex];
    if (exercise === undefined) return;
    this.#state.set({
      kind: "question",
      unit,
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
