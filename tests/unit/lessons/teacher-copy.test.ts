import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { glyphUniverseIds } from "../../../src/content/glyph-universe.ts";
import { Unit } from "../../../src/content/unit.ts";
import { rulesets } from "../../../src/engine/index.ts";
import { readContentJson } from "../../support/content-files.ts";

const allUnits = (
  readContentJson("units.json")["units"] as Record<string, unknown>[]
).map((raw) => Unit.fromJson(raw));

const nglegena = new Set(glyphUniverseIds.slice(0, 20));

describe("[P-B07] teacher page order copy follows units.json", () => {
  for (const locale of ["id", "en"]) {
    const copy = JSON.parse(
      readFileSync(`src/l10n/${locale}.json`, "utf8"),
    ) as Record<string, string>;

    for (const ruleset of rulesets) {
      const units = allUnits.filter((u) => u.appliesTo(ruleset.id));
      test(`${locale}: unitOrderBody lists every unit in order [P-D08] ${ruleset.id}`, () => {
        const lines = copy["unitOrderBody"]!.split("\n");
        expect(lines).toHaveLength(units.length + 1);
        units.forEach((unit, i) => {
          expect(lines[i]!.startsWith(`${i + 1}. `)).toBe(true);
          if (unit.glyphs.every((g) => nglegena.has(g))) {
            expect(lines[i]!.endsWith(` ${unit.glyphs.join(" ")}`)).toBe(true);
          }
        });
      });
    }

    test(`${locale}: deviationBody names the first group`, () => {
      expect(copy["deviationBody"]).toContain(allUnits[0]!.glyphs.join(" "));
    });
  }
});
