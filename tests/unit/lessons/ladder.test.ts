import { get } from "svelte/store";
import { describe, expect, test, vi } from "vitest";
import { loadContent } from "../../../src/content/content-repository.ts";
import { GlyphInfoTable } from "../../../src/content/glyph-info-table.ts";
import { RetiredUnit, Unit } from "../../../src/content/unit.ts";
import { LearnerProgress } from "../../../src/core/db/learner-progress.ts";
import { UnitCompletionRepository } from "../../../src/core/db/unit-completion-repository.ts";
import { createEmitter } from "../../../src/core/emitter.ts";
import {
  computeLadder,
  LadderModel,
  ladderPreview,
  unitsCompletedByRetired,
} from "../../../src/features/lessons/ladder.ts";
import { loadFromPublic } from "../../support/content-files.ts";
import { openFreshDb } from "../core/db-helpers.ts";

const units = [
  new Unit({
    id: "u1",
    name: "Baris pertama: ha na ca ra ka",
    glyphs: ["ha", "na", "ca", "ra", "ka"],
    unlock: "previous",
  }),
  new Unit({
    id: "u2",
    name: "Wulu dan suku",
    glyphs: ["wulu", "suku"],
    unlock: "previous",
  }),
  new Unit({
    id: "u3",
    name: "Baris kedua: da ta sa wa la",
    glyphs: ["da", "ta", "sa", "wa", "la"],
    unlock: "previous",
  }),
];

const statusesOf = (done: string[]) =>
  computeLadder(units, new Set(done)).statuses.map((e) => e.status);

async function content() {
  const loaded = await loadContent(loadFromPublic);
  return { loaded, table: GlyphInfoTable.build(loaded) };
}

test("[P-B03] first launch: only unit 1 is ready", () => {
  expect(statusesOf([])).toEqual(["ready", "locked", "locked"]);
});

test("[P-B03] completing unit 1 unlocks unit 2 and teaches its glyphs", () => {
  const ladder = computeLadder(units, new Set(["u1"]));
  expect(ladder.statuses.map((e) => e.status)).toEqual([
    "completed",
    "ready",
    "locked",
  ]);
  expect(units[0]!.glyphs.length).toBeGreaterThan(0);
  expect(ladder.taughtGlyphIds).toEqual(new Set(units[0]!.glyphs));
});

test("[P-B03] a unit stays completed while a later one is still locked", () => {
  expect(statusesOf(["u1", "u3"])).toEqual(["completed", "ready", "completed"]);
});

test("[P-B05] LadderModel starts loading, becomes ready on refresh and follows completions", async () => {
  const completions = new UnitCompletionRepository(await openFreshDb());
  const model = new LadderModel({
    units,
    retiredUnits: [],
    completions,
    erased: createEmitter(),
    now: () => 1,
  });
  expect(get(model.state)).toEqual({ kind: "loading" });
  await model.refresh();
  const first = get(model.state);
  expect(first.kind).toBe("ready");
  if (first.kind !== "ready") return;
  expect(first.statuses.map((e) => e.status)).toEqual([
    "ready",
    "locked",
    "locked",
  ]);

  await completions.complete("u1", 1);
  await new Promise((resolve) => setTimeout(resolve, 20));
  const after = get(model.state);
  expect(after.kind).toBe("ready");
  if (after.kind !== "ready") return;
  expect(after.statuses.map((e) => e.status)).toEqual([
    "completed",
    "ready",
    "locked",
  ]);
});

test("[P-B10] (W06) taughtGlyphIds is the glyph ids of completed units", async () => {
  expect([...computeLadder(units, new Set()).taughtGlyphIds]).toEqual([]);
  const ladder = computeLadder(units, new Set(["u1", "u2"]));
  expect([...ladder.taughtGlyphIds].sort()).toEqual(
    ["ha", "na", "ca", "ra", "ka", "wulu", "suku"].sort(),
  );
});

test("[P-B02] no unit glyph starts with a bare combining mark (dotted circle)", async () => {
  const isCombiningMark = (r: number) =>
    (r >= 0xa980 && r <= 0xa983) || (r >= 0xa9b3 && r <= 0xa9c0);
  const { loaded, table } = await content();
  for (const unit of loaded.units) {
    for (const id of unit.glyphs) {
      const char = table.byId.get(id)?.char ?? "";
      if (char === "") continue;
      expect(
        isCombiningMark(char.codePointAt(0)!),
        `unit ${unit.id} glyph ${id} starts with a bare mark`,
      ).toBe(false);
    }
  }
});

test("[P-B02] unit 2 sandhangan preview carries each sign on a base", async () => {
  const isCombiningMark = (r: number) =>
    (r >= 0xa980 && r <= 0xa983) || (r >= 0xa9b3 && r <= 0xa9c0);
  const { loaded, table } = await content();
  const unit = loaded.units.find((u) => u.id === "u2")!;
  const preview = ladderPreview(unit, table);
  const runes = Array.from(preview, (c) => c.codePointAt(0)!);
  runes.forEach((r, i) => {
    if (isCombiningMark(r)) {
      expect(i).toBeGreaterThan(0);
      expect(runes[i - 1], "mark after a space").not.toBe(0x20);
    }
  });
  expect(preview.split(" ").every((c) => Array.from(c).length >= 2)).toBe(true);
});

test("[P-B02] preview is the first five non-empty glyph chars joined by a space", async () => {
  const { loaded, table } = await content();
  const firstUnit = loaded.units[0]!;
  expect(ladderPreview(firstUnit, table)).toBe(
    firstUnit.glyphs.map((g) => table.byId.get(g)!.char).join(" "),
  );
  const long = loaded.units.find((u) => u.glyphs.length > 5)!;
  expect(ladderPreview(long, table).split(" ")).toHaveLength(5);
  const unknown = new Unit({
    id: "x",
    name: "x",
    glyphs: ["nope", "ha"],
    unlock: "previous",
  });
  expect(ladderPreview(unknown, table)).toBe(table.byId.get("ha")!.char);
});

test("[P-S10] a rejected completions read leaves an error state that a retry clears", async () => {
  const completions = new UnitCompletionRepository(await openFreshDb());
  const model = new LadderModel({
    units,
    retiredUnits: [],
    completions,
    erased: createEmitter(),
    now: () => 1,
  });
  const failing = vi
    .spyOn(completions, "completedUnitIds")
    .mockRejectedValueOnce(new Error("idb closed"));
  await model.refresh();
  expect(get(model.state)).toEqual({ kind: "error" });
  failing.mockRestore();
  await model.refresh();
  expect(get(model.state).kind).toBe("ready");
});

describe("[P-B17] unitsCompletedByRetired", () => {
  const ids = async (completed: string[]) => {
    const { loaded } = await content();
    return unitsCompletedByRetired(
      loaded.units,
      loaded.retiredUnits,
      new Set(completed),
    );
  };

  test("nothing completed maps nothing", async () => {
    expect(await ids([])).toEqual([]);
  });

  test("old u1 and u2 cover no shape group (contract example 5)", async () => {
    expect(await ids(["u1", "u2"])).toEqual([]);
  });

  test("u1-u4 cover the groups whose letters they all taught", async () => {
    expect(await ids(["u1", "u2", "u3", "u4"])).toEqual(["g1", "g3", "g4"]);
  });

  test("all four old rows cover every shape group", async () => {
    expect(await ids(["u1", "u3", "u4", "u5"])).toEqual([
      "g1",
      "g2",
      "g3",
      "g4",
      "g5",
    ]);
  });

  test("an already completed unit is not returned again", async () => {
    expect(await ids(["u1", "u3", "u4", "u5", "g1"])).toEqual([
      "g2",
      "g3",
      "g4",
      "g5",
    ]);
  });

  test("unknown ids are ignored", async () => {
    expect(await ids(["zz"])).toEqual([]);
  });

  test("pasangan items are never covered vacuously", () => {
    const p = new Unit({
      id: "p",
      name: "p",
      glyphs: ["pasangan-ha"],
      unlock: "previous",
    });
    const r = new RetiredUnit({ id: "r", glyphs: ["ha"] });
    expect(unitsCompletedByRetired([p], [r], new Set(["r"]))).toEqual([]);
  });

  test("a unit without glyphs is never returned", () => {
    const empty = new Unit({
      id: "e",
      name: "e",
      glyphs: [],
      unlock: "previous",
    });
    const r = new RetiredUnit({ id: "r", glyphs: ["ha"] });
    expect(unitsCompletedByRetired([empty], [r], new Set(["r"]))).toEqual([]);
  });
});

describe("[P-B17] LadderModel migration", () => {
  const a = new Unit({
    id: "a",
    name: "a",
    glyphs: ["ha"],
    unlock: "previous",
  });
  const b = new Unit({
    id: "b",
    name: "b",
    glyphs: ["na", "ca"],
    unlock: "previous",
  });
  const retired = [new RetiredUnit({ id: "r", glyphs: ["ha", "na"] })];

  test("writes once and keeps the retired record", async () => {
    const db = await openFreshDb();
    const completions = new UnitCompletionRepository(db);
    await completions.complete("r", 1);
    const spy = vi.spyOn(completions, "completeAll");
    const model = new LadderModel({
      units: [a, b],
      retiredUnits: retired,
      completions,
      erased: createEmitter(),
      now: () => 42,
    });
    await model.refresh();
    const state = get(model.state);
    expect(state.kind).toBe("ready");
    if (state.kind !== "ready") return;
    expect(state.statuses.map((e) => e.status)).toEqual(["completed", "ready"]);
    const first = await db.getAll("unitCompletions");
    expect(first.map((r) => r.unitId).sort()).toEqual(["a", "r"]);
    expect(first.find((r) => r.unitId === "a")!.completedAt).toBe(42);

    await new Promise((resolve) => setTimeout(resolve, 20));
    await model.refresh();
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await db.getAll("unitCompletions")).toEqual(first);
  });

  test("a failed migration write is an error state that a retry heals", async () => {
    const completions = new UnitCompletionRepository(await openFreshDb());
    await completions.complete("r", 1);
    const model = new LadderModel({
      units: [a, b],
      retiredUnits: retired,
      completions,
      erased: createEmitter(),
      now: () => 5,
    });
    const failing = vi
      .spyOn(completions, "completeAll")
      .mockRejectedValueOnce(new Error("idb closed"));
    await model.refresh();
    expect(get(model.state)).toEqual({ kind: "error" });
    failing.mockRestore();
    await model.refresh();
    const state = get(model.state);
    expect(state.kind).toBe("ready");
    if (state.kind !== "ready") return;
    expect(state.statuses[0]!.status).toBe("completed");
  });
});

describe("[P-T07] LadderModel after erased progress", () => {
  const statuses = (model: LadderModel) => {
    const state = get(model.state);
    return state.kind === "ready" ? state.statuses.map((e) => e.status) : [];
  };

  test("[P-T07] erased progress leaves only the first unit ready", async () => {
    const db = await openFreshDb();
    const completions = new UnitCompletionRepository(db);
    const progress = new LearnerProgress(db);
    const model = new LadderModel({
      units,
      retiredUnits: [],
      completions,
      erased: progress.erased,
      now: () => 1,
    });
    await completions.complete(units[0]!.id, 1);
    await completions.complete(units[1]!.id, 1);
    await model.refresh();
    expect(statuses(model)).toEqual(["completed", "completed", "ready"]);
    await progress.erase();
    await vi.waitFor(() =>
      expect(statuses(model)).toEqual(["ready", "locked", "locked"]),
    );
  });

  test("[P-T07] erased retired completions are not migrated again", async () => {
    const { loaded } = await content();
    const db = await openFreshDb();
    const completions = new UnitCompletionRepository(db);
    const progress = new LearnerProgress(db);
    const model = new LadderModel({
      units: loaded.units,
      retiredUnits: loaded.retiredUnits,
      completions,
      erased: progress.erased,
      now: () => 1,
    });
    const retiredIds = loaded.retiredUnits.slice(0, 2).map((r) => r.id);
    for (const id of retiredIds) await completions.complete(id, 1);
    await model.refresh();
    await progress.erase();
    await vi.waitFor(() => {
      const state = get(model.state);
      expect(state.kind).toBe("ready");
      if (state.kind !== "ready") return;
      expect(state.statuses.map((e) => e.status)).toEqual(
        state.statuses.map((_, i) => (i === 0 ? "ready" : "locked")),
      );
    });
    expect((await completions.completedUnitIds()).size).toBe(0);
  });
});
