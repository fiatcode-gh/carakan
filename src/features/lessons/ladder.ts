import { readonly, writable, type Readable } from "svelte/store";
import type { Services } from "../../app/services.ts";
import type { GlyphInfoTable } from "../../content/glyph-info-table.ts";
import type { RetiredUnit, Unit } from "../../content/unit.ts";
import type { UnitCompletionRepository } from "../../core/db/unit-completion-repository.ts";

export type UnitStatus = "locked" | "ready" | "completed";

export interface ComputedLadder {
  readonly statuses: readonly { unit: Unit; status: UnitStatus }[];
  /** Glyph ids of completed units; the lessons' taught pool (W06). */
  readonly taughtGlyphIds: ReadonlySet<string>;
}

export type LadderState =
  | { readonly kind: "loading" }
  | { readonly kind: "error" }
  | ({ readonly kind: "ready" } & ComputedLadder);

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

/**
 * Current units, in order, that are not completed and whose every glyph id
 * was taught by a completed retired unit (contract A.5). Compares glyph-id
 * strings: `glyphBits` drops pasangan items and would cover them vacuously.
 */
export function unitsCompletedByRetired(
  units: readonly Unit[],
  retiredUnits: readonly RetiredUnit[],
  completedIds: ReadonlySet<string>,
): string[] {
  const learned = new Set<string>();
  for (const retired of retiredUnits) {
    if (completedIds.has(retired.id)) {
      for (const g of retired.glyphs) learned.add(g);
    }
  }
  return units
    .filter(
      (unit) =>
        !completedIds.has(unit.id) &&
        unit.glyphs.length > 0 &&
        unit.glyphs.every((g) => learned.has(g)),
    )
    .map((unit) => unit.id);
}

export class LadderModel {
  readonly #units: readonly Unit[];
  readonly #retiredUnits: readonly RetiredUnit[];
  readonly #now: () => number;
  readonly #completions: UnitCompletionRepository;
  readonly #state = writable<LadderState>({ kind: "loading" });
  readonly state: Readable<LadderState> = readonly(this.#state);

  constructor(deps: {
    units: readonly Unit[];
    retiredUnits: readonly RetiredUnit[];
    completions: UnitCompletionRepository;
    now: () => number;
  }) {
    this.#units = deps.units;
    this.#retiredUnits = deps.retiredUnits;
    this.#now = deps.now;
    this.#completions = deps.completions;
    // Lives for the app's lifetime, so the subscription is never released.
    deps.completions.changes.subscribe(() => void this.refresh());
  }

  /** Never rejects: a failed read is the `error` state, and a refresh retries. */
  async refresh(): Promise<void> {
    try {
      const done = await this.#completions.completedUnitIds();
      const migrated = unitsCompletedByRetired(
        this.#units,
        this.#retiredUnits,
        done,
      );
      if (migrated.length > 0) {
        await this.#completions.completeAll(migrated, this.#now());
        for (const id of migrated) done.add(id);
      }
      this.#state.set({ kind: "ready", ...computeLadder(this.#units, done) });
    } catch {
      this.#state.set({ kind: "error" });
    }
  }
}

/** The app-lifetime ladder: lessons and the ladder page share one. */
export function ladderModel(
  services: Pick<Services, "singleton" | "content" | "completions" | "now">,
): LadderModel {
  return services.singleton(
    "ladder",
    () =>
      new LadderModel({
        units: services.content.units,
        retiredUnits: services.content.retiredUnits,
        completions: services.completions,
        now: services.now,
      }),
  );
}
