import { writable, type Readable } from "svelte/store";
import {
  defaultRulesetId,
  isRulesetId,
  type RulesetId,
} from "../../engine/index.ts";

export const RULESET_STORAGE_KEY = "carakan.ruleset";

/** The persisted writing-ruleset choice. `null` storage = storage unavailable. */
export class RulesetController {
  readonly #storage: Pick<Storage, "getItem" | "setItem"> | null;
  readonly #setting = writable<RulesetId>(defaultRulesetId);
  readonly setting: Readable<RulesetId> = {
    subscribe: this.#setting.subscribe,
  };
  #current: RulesetId = defaultRulesetId;

  constructor(storage: Pick<Storage, "getItem" | "setItem"> | null) {
    this.#storage = storage;
  }

  /** Unknown or unreadable stored value keeps the default; never throws. */
  load(): void {
    try {
      const raw = this.#storage?.getItem(RULESET_STORAGE_KEY) ?? null;
      if (isRulesetId(raw)) this.#apply(raw);
    } catch {
      // Unreadable store: keep the default ruleset.
    }
  }

  /**
   * Persists then applies. A choice that cannot be persisted is not applied:
   * it would silently revert on the next launch. Returns whether it holds.
   */
  select(id: RulesetId): boolean {
    if (id === this.#current) return true;
    try {
      if (!this.#storage) return false;
      this.#storage.setItem(RULESET_STORAGE_KEY, id);
    } catch {
      return false;
    }
    this.#apply(id);
    return true;
  }

  #apply(id: RulesetId): void {
    this.#current = id;
    this.#setting.set(id);
  }
}
