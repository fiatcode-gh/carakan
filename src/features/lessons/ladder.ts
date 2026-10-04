import { readonly, writable, type Readable } from "svelte/store";
import type { Services } from "../../app/services.ts";
import type { GlyphInfoTable } from "../../content/glyph-info-table.ts";
import type { Unit } from "../../content/unit.ts";
import type { UnitCompletionRepository } from "../../core/db/unit-completion-repository.ts";

export type UnitStatus = "locked" | "ready" | "completed";

export interface ComputedLadder {
  readonly statuses: readonly { unit: Unit; status: UnitStatus }[];
  /** Glyph ids of completed units; the lessons' taught pool (W06). */
  readonly taughtGlyphIds: ReadonlySet<string>;
}

export type LadderState =
  { readonly kind: "loading" } | ({ readonly kind: "ready" } & ComputedLadder);

/**
 * Unit 1 is ready; unit n is ready iff unit n-1 is completed; a unit with a
 * completion record is completed, whatever the units before it.
 */
export function computeLadder(
  units: readonly Unit[],
  completedIds: ReadonlySet<string>,
): ComputedLadder {
  const taughtGlyphIds = new Set<string>();
  const statuses = units.map((unit, i) => {
    const done = completedIds.has(unit.id);
    if (done) {
      for (const g of unit.glyphs) taughtGlyphIds.add(g);
    }
    const previous = units[i - 1];
    const unlocked = previous === undefined || completedIds.has(previous.id);
    const status: UnitStatus = done
      ? "completed"
      : unlocked
        ? "ready"
        : "locked";
    return { unit, status };
  });
  return { statuses, taughtGlyphIds };
}

/** First five non-empty glyph chars of the unit, joined by a space. */
export function ladderPreview(unit: Unit, glyphInfo: GlyphInfoTable): string {
  return unit.glyphs
    .map((g) => glyphInfo.byId.get(g)?.char ?? "")
    .filter((c) => c !== "")
    .slice(0, 5)
    .join(" ");
}

export class LadderModel {
  readonly #units: readonly Unit[];
  readonly #completions: UnitCompletionRepository;
  readonly #state = writable<LadderState>({ kind: "loading" });
  readonly state: Readable<LadderState> = readonly(this.#state);

  constructor(deps: {
    units: readonly Unit[];
    completions: UnitCompletionRepository;
  }) {
    this.#units = deps.units;
    this.#completions = deps.completions;
    // Lives for the app's lifetime, so the subscription is never released.
    deps.completions.changes.subscribe(() => void this.refresh());
  }

  async refresh(): Promise<void> {
    const done = await this.#completions.completedUnitIds();
    this.#state.set({ kind: "ready", ...computeLadder(this.#units, done) });
  }
}

/** The app-lifetime ladder: lessons and the ladder page share one. */
export function ladderModel(
  services: Pick<Services, "singleton" | "content" | "completions">,
): LadderModel {
  return services.singleton(
    "ladder",
    () =>
      new LadderModel({
        units: services.content.units,
        completions: services.completions,
      }),
  );
}
