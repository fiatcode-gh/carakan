import { get, writable, type Readable } from "svelte/store";
import { toAksara } from "../../engine/index.ts";

/** Engine text stays raw here; the page localizes it (W15). */
export type LatinToAksaraState =
  | { kind: "initial" }
  | { kind: "idle"; output: string }
  | { kind: "ambiguous"; candidates: string[]; reason: string }
  | { kind: "error"; message: string; index: number };

export class LatinToAksaraConverter {
  readonly #state = writable<LatinToAksaraState>({ kind: "initial" });
  readonly state: Readable<LatinToAksaraState> = {
    subscribe: this.#state.subscribe,
  };
  input(text: string): void {
    const trimmed = text.trim();
    if (trimmed === "") {
      this.#state.set({ kind: "initial" });
      return;
    }
    const result = toAksara(trimmed);
    switch (result.kind) {
      case "success":
        this.#state.set({ kind: "idle", output: result.output });
        break;
      case "ambiguous":
        this.#state.set({
          kind: "ambiguous",
          candidates: result.candidates.map((c) => c.output),
          reason: result.reason,
        });
        break;
      case "error":
        this.#state.set({
          kind: "error",
          message: result.message,
          index: result.index,
        });
        break;
    }
  }

  choose(candidateIndex: number): void {
    const current = get(this.#state);
    const output =
      current.kind === "ambiguous"
        ? current.candidates[candidateIndex]
        : undefined;
    if (output === undefined) return;
    this.#state.set({ kind: "idle", output });
  }

  /** Writes the output; the state is unchanged (W01). False when nothing was copied. */
  async copy(writeText: (text: string) => Promise<void>): Promise<boolean> {
    const current = get(this.#state);
    if (current.kind !== "idle") return false;
    try {
      await writeText(current.output);
      return true;
    } catch {
      return false;
    }
  }
}
