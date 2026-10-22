import { describe, expect, test } from "vitest";
import { ConfusionPair } from "../../src/content/confusion-pair.ts";
import {
  containsGlyph,
  rulesetGlyphIds,
} from "../../src/content/glyph-universe.ts";
import { rulesets } from "../../src/engine/index.ts";
import { readContentJson } from "../support/content-files.ts";

const pairs = (
  readContentJson("confusion_pairs.json")["pairs"] as Record<string, unknown>[]
).map((raw) => ConfusionPair.fromJson(raw));

describe("[P-D04] confusion pairs", () => {
  test("every pair member is a universe id, pairs are canonical", () => {
    expect(pairs.length).toBeGreaterThan(0);
    for (const p of pairs) {
      expect(containsGlyph(p.a), p.a).toBe(true);
      expect(containsGlyph(p.b), p.b).toBe(true);
      expect(p.key).toBe(`${p.a}-${p.b}`);
      expect(p.a < p.b, "sorted members").toBe(true);
    }
    expect(new Set(pairs.map((p) => p.key)).size, "no duplicate pairs").toBe(
      pairs.length,
    );
  });

  test("[P-D08] every pair member exists in every ruleset", () => {
    for (const ruleset of rulesets) {
      const ids = rulesetGlyphIds(ruleset);
      for (const p of pairs) {
        expect(ids.has(p.a), `${ruleset.id}: ${p.a}`).toBe(true);
        expect(ids.has(p.b), `${ruleset.id}: ${p.b}`).toBe(true);
      }
    }
  });

  test("starter pairs cover the da/dha and ta/tha confusions", () => {
    const keys = new Set(pairs.map((p) => p.key));
    expect(keys.has("da-dha")).toBe(true);
    expect(keys.has("ta-tha")).toBe(true);
  });
});
