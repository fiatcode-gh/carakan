import { createEmitter, type Emitter } from "../emitter.ts";
import type { CarakanDb } from "./database.ts";
import { MISTAKE_LOGS, SRS_ITEMS, UNIT_COMPLETIONS } from "./schema.ts";

export class LearnerProgress {
  /** Emits once after an erase has committed; never after a failed one. */
  readonly erased: Emitter = createEmitter();
  readonly #db: CarakanDb;

  constructor(db: CarakanDb) {
    this.#db = db;
  }

  /**
   * Clears srsItems, unitCompletions and mistakeLogs in one readwrite
   * transaction. On failure nothing changes and the promise rejects.
   */
  async erase(): Promise<void> {
    const names = [SRS_ITEMS, UNIT_COMPLETIONS, MISTAKE_LOGS] as const;
    const tx = this.#db.transaction(names, "readwrite");
    const requests: Promise<unknown>[] = [];
    try {
      for (const name of names) requests.push(tx.objectStore(name).clear());
      await Promise.all([...requests, tx.done]);
    } catch (error) {
      // A synchronous throw would otherwise let the issued clears commit.
      try {
        tx.abort();
      } catch {
        /* already finished */
      }
      // The issued clears now reject with AbortError; settle them all.
      await Promise.allSettled([...requests, tx.done]);
      throw error;
    }
    this.erased.emit();
  }
}
