import { writable, type Readable } from "svelte/store";
import { toLatin, type LatinScheme } from "../../engine/index.ts";

/** `message` is an engine error message or an ambiguity reason, raw (W15). */
export type AksaraToLatinState =
  | { kind: "initial" }
  | { kind: "idle"; output: string; scheme: LatinScheme }
  | { kind: "error"; message: string };

export class AksaraToLatinConverter {
  readonly #state = writable<AksaraToLatinState>({ kind: "initial" });
  readonly state: Readable<AksaraToLatinState> = {
    subscribe: this.#state.subscribe,
  };
  readonly #scheme = writable<LatinScheme>("pujl");
  readonly scheme: Readable<LatinScheme> = {
    subscribe: this.#scheme.subscribe,
  };
  #schemeValue: LatinScheme = "pujl";
  #lastInput = "";
  #current: AksaraToLatinState = { kind: "initial" };

  #emit(state: AksaraToLatinState): void {
    this.#current = state;
    this.#state.set(state);
  }

  #convert(): void {
    const trimmed = this.#lastInput.trim();
    if (trimmed === "") {
      this.#emit({ kind: "initial" });
      return;
    }
    const result = toLatin(trimmed, { scheme: this.#schemeValue });
    switch (result.kind) {
      case "success":
        this.#emit({
          kind: "idle",
          output: result.output,
          scheme: this.#schemeValue,
        });
        break;
      case "ambiguous":
        this.#emit({ kind: "error", message: result.reason });
        break;
      case "error":
        this.#emit({ kind: "error", message: result.message });
        break;
    }
  }

  input(text: string): void {
    this.#lastInput = text;
    this.#convert();
  }

  toggleScheme(): void {
    this.#schemeValue = this.#schemeValue === "pujl" ? "jgst" : "pujl";
    this.#scheme.set(this.#schemeValue);
    this.#convert();
  }

  /** Writes the output; the state is unchanged (W01). False when nothing was copied. */
  async copy(writeText: (text: string) => Promise<void>): Promise<boolean> {
    const current = this.#current;
    if (current.kind !== "idle") return false;
    try {
      await writeText(current.output);
      return true;
    } catch {
      return false;
    }
  }
}
