import { readonly, writable, type Readable } from "svelte/store";
import type { Services } from "../../app/services.ts";
import type { RetiredUnit, Unit } from "../../content/unit.ts";
import type { UnitCompletionRepository } from "../../core/db/unit-completion-repository.ts";
import type { Emitter } from "../../core/emitter.ts";

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

/**
 * Current units, in order, that are not completed and whose every glyph id
 * was taught by a completed retired unit (contract A.5). Compares glyph-id
 * strings: `glyphBits` drops pasangan items and would cover them vacuously.
 */
export function unitsCompletedByRetired(
  units: readonly Unit[],
  retiredUnits: readonly Pick<RetiredUnit, "id" | "glyphs">[],
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
  readonly #retiredUnits: readonly Pick<RetiredUnit, "id" | "glyphs">[];
  readonly #now: () => number;
  readonly #completions: UnitCompletionRepository;
  readonly #state = writable<LadderState>({ kind: "loading" });
  readonly state: Readable<LadderState> = readonly(this.#state);

  constructor(deps: {
    units: readonly Unit[];
    retiredUnits: readonly Pick<RetiredUnit, "id" | "glyphs">[];
    completions: UnitCompletionRepository;
    /** Fires after the learner's saved progress was erased. */
    erased: Emitter;
    now: () => number;
  }) {
    this.#units = deps.units;
    this.#retiredUnits = deps.retiredUnits;
    this.#now = deps.now;
    this.#completions = deps.completions;
    // Lives for the app's lifetime, so the subscription is never released.
    deps.completions.changes.subscribe(() => void this.refresh());
    deps.erased.subscribe(() => void this.refresh());
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
  services: Pick<
    Services,
    "singleton" | "content" | "completions" | "progress" | "now"
  >,
): LadderModel {
  return services.singleton(
    "ladder",
    () =>
      new LadderModel({
        units: services.content.units,
        // Another ruleset's units map exactly like retired ones (contract 2.4):
        // a unit counts as complete when all its glyphs were completed in
        // either ruleset.
        retiredUnits: [
          ...services.content.retiredUnits,
          ...services.content.otherRulesetUnits,
        ],
        completions: services.completions,
        erased: services.progress.erased,
        now: services.now,
      }),
  );
}
