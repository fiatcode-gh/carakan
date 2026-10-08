import { get, readonly, writable, type Readable } from "svelte/store";
import type { Services } from "../../app/services.ts";
import type { ConfusionPair } from "../../content/confusion-pair.ts";
import type { GlyphInfoTable } from "../../content/glyph-info-table.ts";
import { bitOf } from "../../content/glyph-universe.ts";
import { Unit } from "../../content/unit.ts";
import type { Word } from "../../content/word.ts";
import type { MistakeLogRepository } from "../../core/db/mistake-log-repository.ts";
import type { Emitter } from "../../core/emitter.ts";
import {
  generateExercises,
  type Exercise,
} from "../lessons/exercise-generator.ts";

export type DrillState =
  | { readonly kind: "empty" }
  | { readonly kind: "error" }
  | {
      readonly kind: "ready";
      readonly pairKey: string;
      readonly exercises: readonly Exercise[];
      /** Latest correctness per exercise index (W02 renders it). */
      readonly answered: ReadonlyMap<number, boolean>;
    };

export interface DrillDeps {
  pairs: readonly ConfusionPair[];
  corpus: readonly Word[];
  glyphInfo: GlyphInfoTable;
  mistakes: MistakeLogRepository;
  /** Fires after the learner's saved progress was erased. */
  erased: Emitter;
  seedSource: () => number;
  /** Epoch milliseconds. */
  now: () => number;
}

/**
 * Targeted drill (spec 7): the mistake log's top pair becomes the focus and
 * the generator's confusion-pair machinery forces discrimination.
 */
export class DrillSession {
  readonly #deps: DrillDeps;
  readonly #state = writable<DrillState>({ kind: "empty" });
  readonly state: Readable<DrillState> = readonly(this.#state);

  constructor(deps: DrillDeps) {
    this.#deps = deps;
    // The drill lives across tab switches, so a mistake logged by a later
    // lesson must still surface. An active drill is left alone: its own
    // answers already update the plan.
    deps.mistakes.changes.subscribe(() => {
      if (get(this.#state).kind === "empty") void this.refresh();
    });
    deps.erased.subscribe(() => void this.refresh());
  }

  /** Never rejects: a failed read is the `error` state, and a refresh retries. */
  async refresh(): Promise<void> {
    try {
      await this.#refresh();
    } catch {
      this.#state.set({ kind: "error" });
    }
  }

  async #refresh(): Promise<void> {
    const { pairs, corpus, glyphInfo, mistakes, seedSource } = this.#deps;
    const [top] = await mistakes.topPairs(1);
    const pair =
      top === undefined
        ? undefined
        : pairs.find((p) => p.key === top.confusionPair);
    if (top === undefined || pair === undefined) {
      this.#state.set({ kind: "empty" });
      return;
    }
    const memberBits = bitOf(pair.a) | bitOf(pair.b);
    const focusWords = corpus.filter((w) => (w.glyphBits & memberBits) !== 0n);
    // `Unit` is a carrier: it supplies the glyph list to the generator; the
    // drill has no curriculum progression.
    const exercises = generateExercises({
      unit: new Unit({
        id: "drill",
        name: "drill",
        glyphs: [pair.a, pair.b],
        unlock: "previous",
      }),
      taughtGlyphs: new Set([pair.a, pair.b]),
      corpus: focusWords.length >= 4 ? focusWords : corpus,
      seed: seedSource(),
      glyphInfo,
      confusionPairs: [[pair.a, pair.b]],
      includeWordReadings: true,
    });
    this.#state.set({
      kind: "ready",
      pairKey: top.confusionPair,
      exercises,
      answered: new Map(),
    });
  }

  /** False when the answer could not be stored; the exercise stays open. */
  async answer(exerciseIndex: number, selectedIndex: number): Promise<boolean> {
    const current = get(this.#state);
    if (current.kind !== "ready") return true;
    const exercise = current.exercises[exerciseIndex];
    if (exercise === undefined) return true;
    const correct = selectedIndex === exercise.answerIndex;
    const { mistakes, now } = this.#deps;
    try {
      if (correct) await mistakes.recover(current.pairKey, now());
      else await mistakes.record(current.pairKey, now());
    } catch {
      return false;
    }
    // Another answer or a refresh may have landed during the write.
    const latest = get(this.#state);
    if (latest.kind !== "ready" || latest.exercises !== current.exercises) {
      return true;
    }
    this.#state.set({
      ...latest,
      answered: new Map(latest.answered).set(exerciseIndex, correct),
    });
    return true;
  }
}

/** The app-lifetime drill; the first query runs at creation. */
export function drillSession(
  services: Pick<
    Services,
    | "singleton"
    | "content"
    | "glyphInfo"
    | "mistakes"
    | "progress"
    | "now"
    | "seedSource"
  >,
): DrillSession {
  return services.singleton("drill", () => {
    const session = new DrillSession({
      pairs: services.content.confusionPairs,
      corpus: services.content.words,
      glyphInfo: services.glyphInfo,
      mistakes: services.mistakes,
      erased: services.progress.erased,
      seedSource: services.seedSource,
      now: services.now,
    });
    void session.refresh();
    return session;
  });
}
