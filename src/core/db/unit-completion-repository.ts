import { createEmitter, type Emitter } from "../emitter.ts";
import type { CarakanDb } from "./database.ts";

export class UnitCompletionRepository {
  readonly changes: Emitter = createEmitter();
  readonly #db: CarakanDb;

  constructor(db: CarakanDb) {
    this.#db = db;
  }

  async completedUnitIds(): Promise<Set<string>> {
    return new Set(await this.#db.getAllKeys("unitCompletions"));
  }

  async complete(unitId: string, now: number): Promise<void> {
    await this.#db.put("unitCompletions", { unitId, completedAt: now });
    this.changes.emit();
  }
}
