import { describe, expect, test } from "vitest";
import { GlyphInfoTable } from "../../../src/content/glyph-info-table.ts";
import { Unit } from "../../../src/content/unit.ts";
import { kajRulesetId, pedomanRulesetId } from "../../../src/engine/index.ts";
import {
  glyphUnits,
  splitUnitName,
  unitAccent,
  unitWatermark,
} from "../../../src/features/lessons/unit-display.ts";
import type { UnitAccent } from "../../../src/ui/accent.ts";
import { loadView } from "../../support/content-files.ts";

const d4: readonly UnitAccent[] = [
  "coral",
  "periwinkle",
  "butter",
  "coral",
  "periwinkle",
  "butter",
  "coral",
  "periwinkle",
  "butter",
];

async function content(ruleset: typeof kajRulesetId | typeof pedomanRulesetId) {
  const loaded = await loadView(ruleset);
  return { loaded, table: GlyphInfoTable.build(loaded) };
}

const isCombiningMark = (r: number) =>
  (r >= 0xa980 && r <= 0xa983) || (r >= 0xa9b3 && r <= 0xa9c0);

describe("unitAccent", () => {
  test("cycles coral, periwinkle, butter by ladder index", () => {
    expect(d4.map((_, i) => unitAccent(i))).toEqual(d4);
  });

  test("the KAJ ladder ends with u8 butter and the Pedoman ladder with u8p butter", async () => {
    const kaj = (await content(kajRulesetId)).loaded.units;
    const pedoman = (await content(pedomanRulesetId)).loaded.units;
    expect(kaj.map((u, i) => [u.id, unitAccent(i)])[0]).toEqual([
      "g1",
      "coral",
    ]);
    expect([kaj[8]!.id, unitAccent(8)]).toEqual(["u8", "butter"]);
    expect([pedoman[8]!.id, unitAccent(8)]).toEqual(["u8p", "butter"]);
    expect(kaj.map((_, i) => unitAccent(i))).toEqual(d4);
    expect(pedoman.map((_, i) => unitAccent(i))).toEqual(d4);
  });

  test("a negative or fractional index throws", () => {
    expect(() => unitAccent(-1)).toThrow(RangeError);
    expect(() => unitAccent(1.5)).toThrow(RangeError);
  });
});

describe("glyphUnits", () => {
  test("maps a glyph to the first unit that teaches it, on the KAJ ladder", async () => {
    const { loaded } = await content(kajRulesetId);
    const map = glyphUnits(loaded.units);
    const of = (id: string) => {
      const entry = map.get(id)!;
      return [entry.unit.id, entry.index, entry.accent];
    };
    expect(of("pa")).toEqual(["g1", 0, "coral"]);
    expect(of("wulu")).toEqual(["u2", 1, "periwinkle"]);
    expect(of("pasangan-ha")).toEqual(["u7", 7, "periwinkle"]);
    expect(of("naMurda")).toEqual(["u8", 8, "butter"]);
  });

  test("the Pedoman ladder maps its murda glyph to u8p", async () => {
    const { loaded } = await content(pedomanRulesetId);
    expect(glyphUnits(loaded.units).get("naMurda")!.unit.id).toBe("u8p");
  });

  test("a glyph no unit teaches has no entry", async () => {
    const { loaded } = await content(kajRulesetId);
    expect(glyphUnits(loaded.units).has("angka-1")).toBe(false);
  });

  test("a glyph in two units keeps the first", () => {
    const units = [
      new Unit({ id: "a", name: "a", glyphs: ["x"], unlock: "previous" }),
      new Unit({ id: "b", name: "b", glyphs: ["x", "y"], unlock: "previous" }),
    ];
    const map = glyphUnits(units);
    expect(map.get("x")!.unit.id).toBe("a");
    expect(map.get("y")!.index).toBe(1);
  });
});

describe("splitUnitName", () => {
  test("splits at the first colon-space", () => {
    expect(splitUnitName("Kelompok 1: pa ha ya")).toEqual({
      head: "Kelompok 1",
      tail: "pa ha ya",
    });
  });

  test("a name without a colon-space is all tail", () => {
    expect(splitUnitName("Wulu dan suku")).toEqual({
      head: null,
      tail: "Wulu dan suku",
    });
  });

  test("every shipped unit name splits into a non-empty tail", async () => {
    const { loaded } = await content(kajRulesetId);
    const names = loaded.units.map((u) => u.name);
    expect(names.some((n) => n.includes(": "))).toBe(true);
    expect(names.some((n) => !n.includes(": "))).toBe(true);
    for (const name of names) {
      const { head, tail } = splitUnitName(name);
      expect(tail.trim()).not.toBe("");
      expect(head === null ? tail : `${head}: ${tail}`).toBe(name);
    }
  });
});

describe("unitWatermark", () => {
  test("is the first glyph's char", async () => {
    const { loaded, table } = await content(kajRulesetId);
    for (const unit of loaded.units) {
      expect(unitWatermark(unit, table)).toBe(
        table.byId.get(unit.glyphs[0]!)!.char,
      );
    }
  });

  test("skips a glyph with no char and is empty when none has one", async () => {
    const { table } = await content(kajRulesetId);
    const skipping = new Unit({
      id: "x",
      name: "x",
      glyphs: ["nope", "ha"],
      unlock: "previous",
    });
    expect(unitWatermark(skipping, table)).toBe(table.byId.get("ha")!.char);
    const empty = new Unit({
      id: "y",
      name: "y",
      glyphs: ["nope"],
      unlock: "previous",
    });
    expect(unitWatermark(empty, table)).toBe("");
  });

  test("[P-B02] never starts with a bare combining mark (dotted circle)", async () => {
    for (const ruleset of [kajRulesetId, pedomanRulesetId]) {
      const { loaded, table } = await content(ruleset);
      for (const unit of loaded.units) {
        const mark = unitWatermark(unit, table);
        expect(mark).not.toBe("");
        expect(
          isCombiningMark(mark.codePointAt(0)!),
          `unit ${unit.id} starts with a bare mark`,
        ).toBe(false);
      }
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
    }
  });
});
