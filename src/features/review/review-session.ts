import { readonly, writable, type Readable } from "svelte/store";
import type { Services } from "../../app/services.ts";
import { containsGlyph } from "../../content/glyph-universe.ts";
import type { Emitter } from "../../core/emitter.ts";
import type { ReviewQueue } from "../../core/srs/review-queue.ts";
import type { ReviewGrade } from "../../core/srs/srs-scheduler.ts";
import { glyphUnits } from "../lessons/unit-display.ts";
import { strengthLevel, type CardStrength } from "./strength.ts";

export type ReviewState =
  | { readonly kind: "empty" }
  | { readonly kind: "error" }
  | {
      readonly kind: "ready";
      /** Due order (oldest first), then in-session retries. */
      readonly items: readonly { readonly itemId: string }[];
    };

/**
 * The shared review queue surface (spec 4.4). Every operation runs through
 * one promise chain, in call order, like the bloc's event queue. A failed
 * storage operation never rejects: it leaves the `error` state, and the next
 * `refresh` retries.
 */
export class ReviewSession {
  readonly #queue: ReviewQueue;
  readonly #now: () => number;
  readonly #state = writable<ReviewState>({ kind: "empty" });
  readonly state: Readable<ReviewState> = readonly(this.#state);

  /** Cards graded `again` this session: they stay for an immediate retest. */
  readonly #retryIds = new Set<string>();
  #tail: Promise<unknown> = Promise.resolve();

  readonly #shows: (itemId: string) => boolean;
  readonly #rank: (itemId: string) => number;

  readonly #strengths = writable<readonly CardStrength[]>([]);
  /** Every stored card the ruleset shows, with its level, in ladder order. */
  readonly strengths: Readable<readonly CardStrength[]> = readonly(
    this.#strengths,
  );

  constructor(deps: {
    queue: ReviewQueue;
    erased: Emitter;
    now: () => number;
    /** Display-only filter: cards the active ruleset lacks stay stored. */
    shows: (itemId: string) => boolean;
    /** Strength rows sort by rank ascending, then by item id. */
    rank: (itemId: string) => number;
  }) {
    this.#shows = deps.shows;
    this.#rank = deps.rank;
    this.#queue = deps.queue;
    this.#now = deps.now;
    // Lives for the app's lifetime, so the subscription is never released.
    deps.queue.changes.subscribe(() => void this.refresh());
    deps.erased.subscribe(() => void this.#forget());
  }

  /** Erased progress: drop the in-session retry set, then re-query. */
  async #forget(): Promise<void> {
    await this.#run(() => {
      this.#retryIds.clear();
      return this.#publish();
    });
  }

  async refresh(): Promise<void> {
    await this.#run(() => this.#publish());
  }

  /**
   * Resolves `true` when the grade and the re-query succeeded, `false` when a
   * failure left the `error` state. Never rejects.
   */
  grade(itemId: string, g: ReviewGrade): Promise<boolean> {
    return this.#run(async () => {
      await this.#queue.grade(itemId, g, this.#now());
      if (g === "again") this.#retryIds.add(itemId);
      else this.#retryIds.delete(itemId);
      await this.#publish();
    });
  }

  async #run(operation: () => Promise<void>): Promise<boolean> {
    const result = this.#tail
      .then(operation)
      .then(() => true)
      .catch(() => {
        this.#state.set({ kind: "error" });
        return false;
      });
    this.#tail = result;
    return result;
  }

  /** Due order (oldest first), then retries not already listed. */
  async #publish(): Promise<void> {
    const items: { itemId: string }[] = [];
    for (const s of await this.#queue.dueStates(this.#now())) {
      if (this.#shows(s.itemId)) items.push({ itemId: s.itemId });
    }
    for (const id of this.#retryIds) {
      if (this.#shows(id) && !items.some((i) => i.itemId === id)) {
        items.push({ itemId: id });
      }
    }
    const strengths: CardStrength[] = [];
    for (const s of await this.#queue.allStates()) {
      if (this.#shows(s.itemId)) {
        strengths.push({ itemId: s.itemId, level: strengthLevel(s) });
      }
    }
    strengths.sort(
      (a, b) =>
        this.#rank(a.itemId) - this.#rank(b.itemId) ||
        (a.itemId < b.itemId ? -1 : a.itemId > b.itemId ? 1 : 0),
    );
    this.#strengths.set(strengths);
    this.#state.set(
      items.length === 0 ? { kind: "empty" } : { kind: "ready", items },
    );
  }
}

/** The app-lifetime review session; the first query runs at creation. */
export function reviewSession(
  services: Pick<
    Services,
    "singleton" | "reviewQueue" | "progress" | "now" | "content"
  >,
): ReviewSession {
  return services.singleton("review", () => {
    // Ladder unit index × 100 + the glyph's position in that unit.
    const ranks = new Map<string, number>();
    for (const [id, { unit, index }] of glyphUnits(services.content.units)) {
      ranks.set(id, index * 100 + unit.glyphs.indexOf(id));
    }
    const session = new ReviewSession({
      queue: services.reviewQueue,
      erased: services.progress.erased,
      now: services.now,
      // Pasangan items are not universe ids, so they always show.
      shows: (id) => !containsGlyph(id) || services.content.glyphIds.has(id),
      rank: (id) => ranks.get(id) ?? Number.MAX_SAFE_INTEGER,
    });
    void session.refresh();
    return session;
  });
}
