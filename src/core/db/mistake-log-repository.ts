import { createEmitter, type Emitter } from "../emitter.ts";
import type { CarakanDb } from "./database.ts";
import type { MistakeLogRow } from "./schema.ts";

export class MistakeLogRepository {
  /** Emits after `record` only; `recover` is silent, as in the source. */
  readonly changes: Emitter = createEmitter();
  readonly #db: CarakanDb;

  constructor(db: CarakanDb) {
    this.#db = db;
  }

  async record(pair: string, now: number): Promise<void> {
    const tx = this.#db.transaction("mistakeLogs", "readwrite");
    const existing = await tx.store.get(pair);
    await tx.store.put({
      confusionPair: pair,
      count: (existing?.count ?? 0) + 1,
      lastAt: now,
    });
    await tx.done;
    this.changes.emit();
  }

  /** Highest count first; ties keep key order (IndexedDB returns by key). */
  async topPairs(limit = 3): Promise<MistakeLogRow[]> {
    const rows = await this.#db.getAll("mistakeLogs");
    return rows.sort((a, b) => b.count - a.count).slice(0, limit);
  }

  async recover(pair: string, now: number): Promise<void> {
    const tx = this.#db.transaction("mistakeLogs", "readwrite");
    const existing = await tx.store.get(pair);
    if (existing) {
      await tx.store.put({
        ...existing,
        count: Math.max(existing.count - 1, 0),
        lastAt: now,
      });
    }
    await tx.done;
  }
}
