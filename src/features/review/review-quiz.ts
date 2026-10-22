import { get, readonly, writable, type Readable } from "svelte/store";
import type { Services } from "../../app/services.ts";
import type { GlyphInfoTable } from "../../content/glyph-info-table.ts";
import { Unit } from "../../content/unit.ts";
import type { Word } from "../../content/word.ts";
import type { ReviewQueue } from "../../core/srs/review-queue.ts";
import {
  generateExercises,
  type Exercise,
} from "../lessons/exercise-generator.ts";
import { reviewSession, type ReviewSession } from "./review-session.ts";

export type ReviewQuizState =
  | { readonly kind: "loading" }
  | { readonly kind: "empty" }
  | {
      readonly kind: "question";
      readonly itemId: string;
      readonly number: number;
      readonly total: number;
      readonly exercise: Exercise;
    }
  | {
      readonly kind: "feedback";
      readonly itemId: string;
      readonly number: number;
      readonly total: number;
      readonly exercise: Exercise;
      readonly selectedIndex: number;
      readonly correct: boolean;
    }
  | { readonly kind: "done"; readonly correct: number; readonly total: number };

export interface ReviewQuizDeps {
  review: ReviewSession;
  queue: ReviewQueue;
  glyphInfo: GlyphInfoTable;
  corpus: readonly Word[];
  seedSource: () => number;
}

/**
 * One review run: each listed card is asked once as glyph → sound; a right
 * answer grades `good`, a wrong one `again` and asks the card again later in
 * the same run. Grades go through the shared `ReviewSession`, so the retry
 * list, the strength rows and the refresh rules stay as they are.
 */
export class ReviewQuiz {
  readonly #deps: ReviewQuizDeps;
  readonly #state = writable<ReviewQuizState>({ kind: "loading" });
  readonly state: Readable<ReviewQuizState> = readonly(this.#state);

  #taught: ReadonlySet<string> = new Set();
  /** Card ids in ask order; a missed card is appended. */
  #queue: string[] = [];
  #position = -1;
  #answered = 0;
  #correct = 0;
  /** Set while a grade is pending; a double tap must not grade twice. */
  #busy = false;
  readonly #failed = writable(false);
  /** True while the last answer could not be stored; the state is unchanged. */
  readonly failed: Readable<boolean> = readonly(this.#failed);
  #retryStep: (() => Promise<void>) | null = null;

  constructor(deps: ReviewQuizDeps) {
    this.#deps = deps;
  }

  async start(): Promise<void> {
    this.#state.set({ kind: "loading" });
    this.#busy = false;
    this.#failed.set(false);
    this.#retryStep = null;
    this.#answered = 0;
    this.#correct = 0;
    this.#position = -1;
    await this.#deps.review.refresh();
    const listed = get(this.#deps.review.state);
    try {
      this.#taught = new Set(
        (await this.#deps.queue.allStates()).map((s) => s.itemId),
      );
    } catch {
      this.#queue = [];
      this.#state.set({ kind: "empty" });
      return;
    }
    this.#queue =
      listed.kind === "ready" ? listed.items.map((i) => i.itemId) : [];
    this.#advance();
  }

  async answer(index: number): Promise<void> {
    const current = get(this.#state);
    if (current.kind !== "question" || this.#busy) return;
    await this.#grade(current, index);
  }

  /** After the feedback: the next card, or the end of the run. */
  continue(): void {
    if (get(this.#state).kind === "feedback") this.#advance();
  }

  /** Grades the answer that failed to store again. */
  async retry(): Promise<void> {
    const step = this.#retryStep;
    if (step !== null) await step();
  }

  async #grade(
    question: Extract<ReviewQuizState, { kind: "question" }>,
    index: number,
  ): Promise<void> {
    this.#busy = true;
    try {
      const correct = index === question.exercise.answerIndex;
      const stored = await this.#deps.review.grade(
        question.itemId,
        correct ? "good" : "again",
      );
      if (!stored) {
        this.#retryStep = () => this.#grade(question, index);
        this.#failed.set(true);
        return;
      }
      this.#retryStep = null;
      this.#failed.set(false);
      this.#answered += 1;
      if (correct) this.#correct += 1;
      else this.#queue.push(question.itemId);
      this.#state.set({
        kind: "feedback",
        itemId: question.itemId,
        number: question.number,
        total: this.#queue.length,
        exercise: question.exercise,
        selectedIndex: index,
        correct,
      });
    } finally {
      this.#busy = false;
    }
  }

  /** The next quizzable card; cards with no usable question are dropped. */
  #advance(): void {
    for (this.#position += 1; this.#position < this.#queue.length;) {
      const itemId = this.#queue[this.#position] as string;
      const exercise = this.#exerciseFor(itemId);
      if (exercise !== undefined) {
        this.#state.set({
          kind: "question",
          itemId,
          number: this.#position + 1,
          total: this.#queue.length,
          exercise,
        });
        return;
      }
      this.#queue.splice(this.#position, 1);
    }
    this.#state.set(
      this.#answered === 0
        ? { kind: "empty" }
        : { kind: "done", correct: this.#correct, total: this.#answered },
    );
  }

  /** Always glyph → sound; a card the generator cannot ask is skipped. */
  #exerciseFor(itemId: string): Exercise | undefined {
    const exercise = generateExercises({
      unit: new Unit({
        id: "review",
        name: "review",
        glyphs: [itemId],
        unlock: "previous",
      }),
      taughtGlyphs: this.#taught,
      corpus: this.#deps.corpus,
      seed: this.#deps.seedSource(),
      glyphInfo: this.#deps.glyphInfo,
    })[0];
    if (exercise?.kind !== "glyphToSound") return undefined;
    return exercise.options.length >= 2 ? exercise : undefined;
  }
}

export function createReviewQuiz(
  services: Pick<
    Services,
    | "singleton"
    | "reviewQueue"
    | "progress"
    | "now"
    | "content"
    | "glyphInfo"
    | "seedSource"
  >,
): ReviewQuiz {
  return new ReviewQuiz({
    review: reviewSession(services),
    queue: services.reviewQueue,
    glyphInfo: services.glyphInfo,
    corpus: services.content.words,
    seedSource: services.seedSource,
  });
}
