import { readonly, writable, type Readable } from "svelte/store";
import type { Services } from "../../app/services.ts";
import type { SrsItemRow } from "../../core/db/schema.ts";
import type { ReviewQueue } from "../../core/srs/review-queue.ts";
import { MINUTE, type ReviewGrade } from "../../core/srs/srs-scheduler.ts";

/** Why a card is in the list; the page renders a group header per run. */
export type ReviewItemKind = "fresh" | "due" | "retry";

export type ReviewState =
  | { readonly kind: "empty" }
  | { readonly kind: "error" }
  | {
      readonly kind: "ready";
      readonly items: readonly {
        readonly itemId: string;
        readonly kind: ReviewItemKind;
        /** W14: the answer stays hidden until the learner reveals it. */
        readonly revealed: boolean;
      }[];
    };

/** `again` is the only grade with a stored gap this short (10 minutes). */
const retryGap = 30 * MINUTE;

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
  /** W14: revealed cards; survives tab switches, resets on reload. */
  readonly #revealed = new Set<string>();
  #listed = new Set<string>();
  #tail: Promise<unknown> = Promise.resolve();

  constructor(deps: { queue: ReviewQueue; now: () => number }) {
    this.#queue = deps.queue;
    this.#now = deps.now;
    // Lives for the app's lifetime, so the subscription is never released.
    deps.queue.changes.subscribe(() => void this.refresh());
  }

  refresh(): Promise<void> {
    return this.#run(() => this.#publish());
  }

  reveal(itemId: string): Promise<void> {
    return this.#run(() => {
      if (!this.#listed.has(itemId)) return Promise.resolve();
      this.#revealed.add(itemId);
      return this.#publish();
    });
  }

  grade(itemId: string, g: ReviewGrade): Promise<void> {
    return this.#run(async () => {
      await this.#queue.grade(itemId, g, this.#now());
      if (g === "again") this.#retryIds.add(itemId);
      else this.#retryIds.delete(itemId);
      // A card graded `again` comes back hidden.
      this.#revealed.delete(itemId);
      await this.#publish();
    });
  }

  #run(operation: () => Promise<void>): Promise<void> {
    const result = this.#tail
      .then(operation)
      .catch(() => this.#state.set({ kind: "error" }));
    this.#tail = result;
    return result;
  }

  /** Due order (oldest first), then retries not already listed. */
  async #publish(): Promise<void> {
    const items: { itemId: string; kind: ReviewItemKind }[] = [];
    for (const s of await this.#queue.dueStates(this.#now())) {
      items.push({ itemId: s.itemId, kind: kindOf(s) });
    }
    for (const id of this.#retryIds) {
      if (!items.some((i) => i.itemId === id)) {
        items.push({ itemId: id, kind: "retry" });
      }
    }
    this.#listed = new Set(items.map((i) => i.itemId));
    for (const id of this.#revealed) {
      if (!this.#listed.has(id)) this.#revealed.delete(id);
    }
    this.#state.set(
      items.length === 0
        ? { kind: "empty" }
        : {
            kind: "ready",
            items: items.map((i) => ({
              ...i,
              revealed: this.#revealed.has(i.itemId),
            })),
          },
    );
  }
}

function kindOf(s: SrsItemRow): ReviewItemKind {
  if (s.lastReviewedAt === null) return "fresh";
  return s.dueAt - s.lastReviewedAt <= retryGap ? "retry" : "due";
}

/** The app-lifetime review session; the first query runs at creation. */
export function reviewSession(
  services: Pick<Services, "singleton" | "reviewQueue" | "now">,
): ReviewSession {
  return services.singleton("review", () => {
    const session = new ReviewSession({
      queue: services.reviewQueue,
      now: services.now,
    });
    void session.refresh();
    return session;
  });
}
