import { describe, expect, test } from "vitest";
import { containsGlyph } from "../../src/content/glyph-universe.ts";
import { Unit } from "../../src/content/unit.ts";
import { readContentJson } from "../support/content-files.ts";

const units = (
  readContentJson("units.json")["units"] as Record<string, unknown>[]
).map((raw) => Unit.fromJson(raw));

describe("[P-D04] units", () => {
  test("eight units in the spec order (spec 4.1)", () => {
    expect(units.length).toBe(8);
    expect(units[0]!.id).toBe("u1");
    expect(units[0]!.glyphs).toEqual(["ha", "na", "ca", "ra", "ka"]);
    expect(units[1]!.glyphs, "pulled forward (spec 8)").toEqual([
      "wulu",
      "suku",
    ]);
    expect(units[7]!.glyphs).toContain("naMurda");
  });

  test("every glyph id is either a universe id or a pasangan item", () => {
    for (const u of units) {
      for (const g of u.glyphs) {
        expect(
          containsGlyph(g) || g.startsWith("pasangan-"),
          `unit ${u.id}: unknown glyph ${g}`,
        ).toBe(true);
      }
    }
  });

  test("only unit 7 teaches the pasangan capability", () => {
    expect(units[6]!.id).toBe("u7");
    expect(units[6]!.caps).toEqual(["pasangan"]);
    for (const u of units) {
      if (u.id !== "u7") expect(u.caps, u.id).toEqual([]);
    }
  });

  test('unlock rule is "previous" for every unit', () => {
    for (const u of units) expect(u.unlock, u.id).toBe("previous");
  });
});
