import { describe, expect, test } from "vitest";
import {
  containsGlyph,
  glyphUniverseIds,
} from "../../src/content/glyph-universe.ts";
import { RetiredUnit, Unit } from "../../src/content/unit.ts";
import { readContentJson } from "../support/content-files.ts";

const units = (
  readContentJson("units.json")["units"] as Record<string, unknown>[]
).map((raw) => Unit.fromJson(raw));

const retired = (
  readContentJson("units.json")["retiredUnits"] as Record<string, unknown>[]
).map((raw) => RetiredUnit.fromJson(raw));

describe("[P-D04] units", () => {
  test("nine units in the shape-group order (contract A.2)", () => {
    expect(units.map((u) => [u.id, u.glyphs])).toEqual([
      ["g1", ["pa", "ha", "ya"]],
      ["u2", ["wulu", "suku"]],
      ["g2", ["ra", "ga", "la"]],
      ["g3", ["na", "ka", "ca", "sa"]],
      ["g4", ["da", "dha", "ja", "ta", "wa"]],
      ["g5", ["ba", "nga", "tha", "nya", "ma"]],
      [
        "u6",
        [
          "taling",
          "tarung",
          "pepet",
          "layar",
          "cecak",
          "wignyan",
          "pangkon",
          "cakra",
          "keret",
          "pengkal",
        ],
      ],
      [
        "u7",
        [
          "pasangan-ha",
          "pasangan-na",
          "pasangan-ca",
          "pasangan-ra",
          "pasangan-ka",
          "pasangan-da",
          "pasangan-ta",
          "pasangan-sa",
          "pasangan-wa",
          "pasangan-la",
          "pasangan-pa",
          "pasangan-dha",
          "pasangan-ja",
          "pasangan-ya",
          "pasangan-nya",
          "pasangan-ma",
          "pasangan-ga",
          "pasangan-ba",
          "pasangan-tha",
          "pasangan-nga",
        ],
      ],
      [
        "u8",
        [
          "naMurda",
          "kaMurda",
          "taMurda",
          "saMurda",
          "paMurda",
          "nyaMurda",
          "gaMurda",
          "baMurda",
          "caMurda",
          "jaMurda",
          "raAgung",
          "a",
          "i",
          "u",
          "e",
          "o",
          "paCerek",
          "ngaLelet",
        ],
      ],
    ]);
  });

  test("every glyph taught before is taught exactly once", () => {
    const all = units.flatMap((u) => [...u.glyphs]);
    expect(new Set(all).size).toBe(all.length);
    expect(all).toHaveLength(70);
    expect([...all].sort()).toEqual(
      [
        ...glyphUniverseIds.slice(0, 50),
        ...glyphUniverseIds.slice(0, 20).map((g) => "pasangan-" + g),
      ].sort(),
    );
  });

  test("the five shape groups hold exactly the 20 base letters", () => {
    const groups = units.filter((u) => /^g\d$/.test(u.id));
    expect(groups).toHaveLength(5);
    expect(groups.flatMap((u) => [...u.glyphs]).sort()).toEqual(
      [...glyphUniverseIds.slice(0, 20)].sort(),
    );
  });

  test("wulu and suku come straight after the first group", () => {
    expect(units[1]!.id).toBe("u2");
    expect(units[1]!.glyphs).toEqual(["wulu", "suku"]);
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

  test("only u7 (position 8) teaches the pasangan capability", () => {
    expect(units[7]!.id).toBe("u7");
    expect(units[7]!.caps).toEqual(["pasangan"]);
    for (const u of units) {
      if (u.id !== "u7") expect(u.caps, u.id).toEqual([]);
    }
  });

  test('unlock rule is "previous" for every unit', () => {
    for (const u of units) expect(u.unlock, u.id).toBe("previous");
  });

  test("retired units keep the old row letters", () => {
    expect(retired.map((r) => [r.id, r.glyphs])).toEqual([
      ["u1", ["ha", "na", "ca", "ra", "ka"]],
      ["u3", ["da", "ta", "sa", "wa", "la"]],
      ["u4", ["pa", "dha", "ja", "ya", "nya"]],
      ["u5", ["ma", "ga", "ba", "tha", "nga"]],
    ]);
  });

  test("retired ids never return as unit ids", () => {
    const retiredIds = retired.map((r) => r.id);
    expect(new Set(retiredIds).size).toBe(retiredIds.length);
    for (const id of retiredIds) {
      expect(units.map((u) => u.id)).not.toContain(id);
    }
  });

  test("retired units taught exactly the 20 base letters", () => {
    expect(retired.flatMap((r) => [...r.glyphs]).sort()).toEqual(
      [...glyphUniverseIds.slice(0, 20)].sort(),
    );
  });
});
