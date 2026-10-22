import { describe, expect, test } from "vitest";
import {
  glyphUniverseIds,
  rulesetGlyphIds,
} from "../../src/content/glyph-universe.ts";
import { Word } from "../../src/content/word.ts";
import { kajRulesetId, rulesets } from "../../src/engine/index.ts";
import { readContentJson } from "../support/content-files.ts";
import { hasPasangan, visibleGlyphs } from "../support/visible-glyphs.ts";

const rawById = new Map(
  (readContentJson("words.json")["words"] as Record<string, unknown>[]).map(
    (raw) => [raw["id"] as string, raw] as const,
  ),
);
const wordsById = new Map(
  [...rawById].map(([id, raw]) => [id, Word.fromJson(raw, kajRulesetId)]),
);
const examples = Object.entries(
  readContentJson("chart_examples.json")["examples"] as Record<
    string,
    string[]
  >,
);

describe("[P-D04] chart examples", () => {
  test("nglegena and sandhangan keys have 2-4 examples", () => {
    const byKey = new Map(examples);
    for (const id of glyphUniverseIds.slice(0, 32)) {
      const ids = byKey.get(id);
      expect(ids, `${id}: key missing`).toBeDefined();
      expect(ids!.length, id).toBeGreaterThanOrEqual(2);
      expect(ids!.length, id).toBeLessThanOrEqual(4);
    }
  });

  test("other keys are murda/swara/rekan ids with 1-4 examples", () => {
    const advanced = new Set(glyphUniverseIds.slice(32));
    for (const [key, ids] of examples) {
      if (glyphUniverseIds.indexOf(key) < 32) continue;
      expect(advanced.has(key), key).toBe(true);
      expect(ids.length, key).toBeGreaterThanOrEqual(1);
      expect(ids.length, key).toBeLessThanOrEqual(4);
    }
  });

  test("keys follow GlyphUniverse order", () => {
    const order = examples.map(([key]) => glyphUniverseIds.indexOf(key));
    for (const index of order) expect(index).toBeGreaterThanOrEqual(0);
    expect(order).toEqual([...order].sort((a, b) => a - b));
  });

  test("no duplicate id within a key", () => {
    for (const [key, ids] of examples) {
      expect(new Set(ids).size, key).toBe(ids.length);
    }
  });

  test("every id exists in words.json", () => {
    for (const [key, ids] of examples) {
      for (const id of ids) {
        expect(wordsById.has(id), `${key}: ${id}`).toBe(true);
      }
    }
  });
});

describe.each(rulesets)("[P-D04] [P-D08] chart examples: $id", (ruleset) => {
  const glyphIds = rulesetGlyphIds(ruleset);
  const own = examples.filter(([key]) => glyphIds.has(key));

  test("the glyph is visible in every example (acceptance 3)", () => {
    for (const [key, ids] of own) {
      for (const id of ids) {
        const w = Word.fromJson(rawById.get(id)!, ruleset.id);
        expect(
          visibleGlyphs(w.aksara).has(key),
          `${key}: ${w.id} (${w.display})`,
        ).toBe(true);
      }
    }
  });

  test("no example has a pasangan (acceptance 3)", () => {
    for (const [key, ids] of own) {
      for (const id of ids) {
        const w = Word.fromJson(rawById.get(id)!, ruleset.id);
        expect(hasPasangan(w.aksara), `${key}: ${w.id} (${w.display})`).toBe(
          false,
        );
      }
    }
  });
});
