import { get } from "svelte/store";
import { expect, test, vi } from "vitest";
import { loadContent } from "../../../src/content/content-repository.ts";
import { GlyphInfoTable } from "../../../src/content/glyph-info-table.ts";
import { Unit } from "../../../src/content/unit.ts";
import { UnitCompletionRepository } from "../../../src/core/db/unit-completion-repository.ts";
import {
  computeLadder,
  LadderModel,
  ladderPreview,
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
  const model = new LadderModel({ units, completions });
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
  const u1 = loaded.units.find((u) => u.id === "u1")!;
  expect(ladderPreview(u1, table)).toBe(
    u1.glyphs.map((g) => table.byId.get(g)!.char).join(" "),
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
  const model = new LadderModel({ units, completions });
  const failing = vi
    .spyOn(completions, "completedUnitIds")
    .mockRejectedValueOnce(new Error("idb closed"));
  await model.refresh();
  expect(get(model.state)).toEqual({ kind: "error" });
  failing.mockRestore();
  await model.refresh();
  expect(get(model.state).kind).toBe("ready");
});
