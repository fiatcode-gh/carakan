import { writable, type Readable } from "svelte/store";
import { toAksara } from "../../engine/index.ts";

/** Engine text stays raw here; the page localizes it (W15). */
export type LatinToAksaraState =
  | { kind: "initial" }
  | { kind: "idle"; output: string; lockedFromAmbiguity: boolean }
  | { kind: "ambiguous"; input: string; candidates: string[]; reason: string }
  | { kind: "error"; message: string; index: number };

export class LatinToAksaraConverter {
  readonly #state = writable<LatinToAksaraState>({ kind: "initial" });
  readonly state: Readable<LatinToAksaraState> = {
    subscribe: this.#state.subscribe,
  };
  #current: LatinToAksaraState = { kind: "initial" };

  #emit(state: LatinToAksaraState): void {
    this.#current = state;
    this.#state.set(state);
  }

  input(text: string): void {
    const trimmed = text.trim();
    if (trimmed === "") {
      this.#emit({ kind: "initial" });
      return;
    }
    const result = toAksara(trimmed);
    switch (result.kind) {
      case "success":
        this.#emit({
          kind: "idle",
          output: result.output,
          lockedFromAmbiguity: false,
        });
        break;
      case "ambiguous":
        this.#emit({
          kind: "ambiguous",
          input: trimmed,
          candidates: result.candidates.map((c) => c.output),
          reason: result.reason,
        });
        break;
      case "error":
        this.#emit({
          kind: "error",
          message: result.message,
          index: result.index,
        });
        break;
    }
  }

  choose(candidateIndex: number): void {
    const current = this.#current;
    const output =
      current.kind === "ambiguous"
        ? current.candidates[candidateIndex]
        : undefined;
    if (output === undefined) return;
    this.#emit({ kind: "idle", output, lockedFromAmbiguity: true });
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
