import { get, writable, type Readable } from "svelte/store";
import {
  toAksara,
  type AksaraCluster,
  type ToAksaraSuccess,
} from "../../engine/index.ts";

/**
 * Engine text stays raw here; the page localizes it (W15). `input` is the
 * trimmed text passed to `toAksara`; every cluster index refers to it.
 */
export type LatinToAksaraState =
  | { kind: "initial" }
  | {
      kind: "idle";
      input: string;
      output: string;
      clusters: readonly AksaraCluster[];
      selected: number | null;
    }
  | {
      kind: "ambiguous";
      input: string;
      candidates: readonly ToAksaraSuccess[];
      reason: string;
    }
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
        this.#state.set({
          kind: "idle",
          input: trimmed,
          output: result.output,
          clusters: result.clusters,
          selected: null,
        });
        break;
      case "ambiguous":
        this.#state.set({
          kind: "ambiguous",
          input: trimmed,
          candidates: result.candidates,
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
    const candidate =
      current.kind === "ambiguous"
        ? current.candidates[candidateIndex]
        : undefined;
    if (candidate === undefined || current.kind !== "ambiguous") return;
    this.#state.set({
      kind: "idle",
      input: current.input,
      output: candidate.output,
      clusters: candidate.clusters,
      selected: null,
    });
  }

  select(index: number): void {
    const current = get(this.#state);
    if (current.kind !== "idle") return;
    if (!Number.isInteger(index) || index < 0) return;
    if (index >= current.clusters.length || index === current.selected) return;
    this.#state.set({ ...current, selected: index });
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
