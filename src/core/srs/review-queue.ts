import type { CarakanDb } from "../db/database.ts";
import { createEmitter, type Emitter } from "../emitter.ts";
import {
  grade,
  newItem,
  type ReviewGrade,
  type SrsState,
} from "./srs-scheduler.ts";

export class ReviewQueue {
  readonly changes: Emitter = createEmitter();
  readonly #db: CarakanDb;

  constructor(db: CarakanDb) {
    this.#db = db;
  }

  /** No-op when the item already exists. */
  async enqueue(itemId: string, now: number): Promise<void> {
    const tx = this.#db.transaction("srsItems", "readwrite");
    if (!(await tx.store.get(itemId))) await tx.store.put(newItem(itemId, now));
    await tx.done;
    this.changes.emit();
  }

  async dueItems(now: number): Promise<string[]> {
    return (await this.dueStates(now)).map((s) => s.itemId);
  }

  /** Oldest due first; ties come back in itemId order (index key order). */
  dueStates(now: number): Promise<SrsState[]> {
    return this.#db.getAllFromIndex(
      "srsItems",
      "dueAt",
      IDBKeyRange.upperBound(now),
    );
  }

  async grade(itemId: string, g: ReviewGrade, now: number): Promise<void> {
    const tx = this.#db.transaction("srsItems", "readwrite");
    const state = await tx.store.get(itemId);
    if (!state) {
      tx.abort();
      await tx.done.catch(() => undefined);
      throw new Error(`srs item not found: ${itemId}`);
    }
    await tx.store.put(grade(state, g, now));
    await tx.done;
    this.changes.emit();
  }
}
