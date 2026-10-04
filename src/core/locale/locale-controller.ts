import { writable, type Readable } from "svelte/store";

export type LocaleSetting = "system" | "id" | "en";

export const LOCALE_STORAGE_KEY = "carakan.uiLocale";

const SETTINGS: readonly string[] = ["system", "id", "en"];

const isSetting = (raw: string | null): raw is LocaleSetting =>
  raw !== null && SETTINGS.includes(raw);

/** The persisted UI-language choice. `null` storage = storage unavailable. */
export class LocaleController {
  readonly #storage: Pick<Storage, "getItem" | "setItem"> | null;
  readonly #setting = writable<LocaleSetting>("system");
  readonly setting: Readable<LocaleSetting> = {
    subscribe: this.#setting.subscribe,
  };
  #current: LocaleSetting = "system";

  constructor(storage: Pick<Storage, "getItem" | "setItem"> | null) {
    this.#storage = storage;
  }

  /** Unknown or unreadable stored value keeps `system`; never throws. */
  load(): void {
    try {
      const raw = this.#storage?.getItem(LOCALE_STORAGE_KEY) ?? null;
      if (isSetting(raw)) this.#apply(raw);
    } catch {
      // Unreadable store: keep the browser-default behavior.
    }
  }

  /**
   * Persists then applies. A choice that cannot be persisted is not applied:
   * it would silently revert on the next launch. Returns whether it holds.
   */
  select(setting: LocaleSetting): boolean {
    if (setting === this.#current) return true;
    try {
      if (!this.#storage) return false;
      this.#storage.setItem(LOCALE_STORAGE_KEY, setting);
    } catch {
      return false;
    }
    this.#apply(setting);
    return true;
  }

  #apply(setting: LocaleSetting): void {
    this.#current = setting;
    this.#setting.set(setting);
  }
}
