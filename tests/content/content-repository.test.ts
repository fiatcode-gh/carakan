import { describe, expect, test } from "vitest";
import { AksaraItem } from "../../src/content/aksara-item.ts";
import { ContentFormatError } from "../../src/content/content-format-error.ts";
import {
  contentFor,
  loadContent,
  readContent,
} from "../../src/content/content-repository.ts";
import { kajRulesetId, pedomanRulesetId } from "../../src/engine/index.ts";
import { ak } from "../engine/support/aksara-builder.ts";
import { loadFromPublic } from "../support/content-files.ts";

describe("[P-D04] content repository", () => {
  test("parses a minimal aksara item", () => {
    const item = AksaraItem.fromJson({
      id: "ha",
      unicodeName: "JAVANESE LETTER HA",
      name: "ha",
      category: "nglegena",
      latinPujl: "ha",
      latinJgst: "ha",
      audioKey: "ha",
    });
    expect(item.id).toBe("ha");
    expect(item.category).toBe("nglegena");
  });

  test("rejects an item without a unicode name", () => {
    expect(() => AksaraItem.fromJson({ id: "x", name: "x" })).toThrow(
      ContentFormatError,
    );
  });

  describe("chart examples", () => {
    function patched(patch: (examples: Record<string, unknown>) => void) {
      return async (path: string): Promise<string> => {
        const raw = await loadFromPublic(path);
        if (!path.endsWith("chart_examples.json")) return raw;
        const data = JSON.parse(raw) as { examples: Record<string, unknown> };
        patch(data.examples);
        return JSON.stringify(data);
      };
    }

    test("resolve to words in file order", async () => {
      const content = await loadContent(loadFromPublic, kajRulesetId);
      const file = JSON.parse(
        await loadFromPublic("content/v1/chart_examples.json"),
      ) as { examples: Record<string, string[]> };
      const ids = file.examples["ka"];
      expect(content.chartExamples.get("ka")!.map((w) => w.id)).toEqual(ids);
    });

    test("an unknown word id is a ContentFormatError", async () => {
      const load = patched((ex) => (ex["ka"] = ["no-such-word"]));
      await expect(loadContent(load, kajRulesetId)).rejects.toThrow(
        ContentFormatError,
      );
    });

    test("an unknown glyph key is a ContentFormatError", async () => {
      const load = patched((ex) => (ex["not-a-glyph"] = ["kebo"]));
      await expect(loadContent(load, kajRulesetId)).rejects.toThrow(
        ContentFormatError,
      );
    });
  });

  describe("retired units", () => {
    function patchedUnits(patch: (data: Record<string, unknown>) => void) {
      return async (path: string): Promise<string> => {
        const raw = await loadFromPublic(path);
        if (!path.endsWith("units.json")) return raw;
        const data = JSON.parse(raw) as Record<string, unknown>;
        patch(data);
        return JSON.stringify(data);
      };
    }

    test("the loaded content lists the retired row units", async () => {
      const content = await loadContent(loadFromPublic, kajRulesetId);
      expect(content.retiredUnits.map((r) => r.id)).toEqual([
        "u1",
        "u3",
        "u4",
        "u5",
      ]);
    });

    test("a units.json without retiredUnits is a ContentFormatError", async () => {
      const load = patchedUnits((data) => delete data["retiredUnits"]);
      await expect(loadContent(load, kajRulesetId)).rejects.toThrow(
        ContentFormatError,
      );
    });

    test("a retired entry without id is a ContentFormatError", async () => {
      const load = patchedUnits(
        (data) => (data["retiredUnits"] = [{ glyphs: ["ha"] }]),
      );
      await expect(loadContent(load, kajRulesetId)).rejects.toThrow(
        ContentFormatError,
      );
    });
  });

  describe("[P-D08] per-ruleset views", () => {
    const source = readContent(loadFromPublic);
    const view = async (id: typeof kajRulesetId | typeof pedomanRulesetId) =>
      contentFor(await source, id);
    const word = (data: Awaited<ReturnType<typeof view>>, id: string) =>
      data.words.find((w) => w.id === id)!;

    test("Pedoman resolves words, units and glyph ids", async () => {
      const data = await view(pedomanRulesetId);
      expect(word(data, "nabi").canonical).toBe("ṇabi");
      expect(word(data, "vila").display).toBe("vila");
      expect(word(data, "ramai").aksara).toBe(ak("RA MA HA WULU"));
      expect(data.units.at(-1)!.id).toBe("u8p");
      expect(data.otherRulesetUnits.map((u) => u.id)).toEqual(["u8"]);
      expect(data.chartExamples.has("va")).toBe(false);
      expect(data.glyphIds.size).toBe(47);
    });

    test("KAJ keeps its words and units", async () => {
      const data = await view(kajRulesetId);
      expect(data.otherRulesetUnits.map((u) => u.id)).toEqual(["u8p"]);
      expect(data.glyphIds.size).toBe(57);
      expect(data.chartExamples.has("va")).toBe(true);
      expect(word(data, "nabi").canonical).toBe("ṇaḅi");
      const vakum = [...word(data, "vakum").aksara];
      const pedomanVakum = [
        ...word(await view(pedomanRulesetId), "vakum").aksara,
      ];
      expect(vakum.slice(0, 2).join("")).toBe(ak("WA CECAK_TELU"));
      expect(pedomanVakum.slice(0, 2).join("")).toBe(ak("PA CECAK_TELU"));
    });

    function patched(
      file: string,
      patch: (data: Record<string, unknown>) => void,
    ) {
      return async (path: string): Promise<string> => {
        const raw = await loadFromPublic(path);
        if (!path.endsWith(file)) return raw;
        const data = JSON.parse(raw) as Record<string, unknown>;
        patch(data);
        return JSON.stringify(data);
      };
    }
    const nabiOverride = (override: unknown) =>
      patched("words.json", (data) => {
        const words = data["words"] as Record<string, unknown>[];
        words[0]!["byRuleset"] = override;
      });

    test.each([
      ["an unknown ruleset key", { "no-ruleset": { canonical: "x" } }],
      ["an unknown override field", { [pedomanRulesetId]: { gloss: "x" } }],
      ["a non-string canonical", { [pedomanRulesetId]: { canonical: 1 } }],
    ])("%s in byRuleset is a ContentFormatError", async (_name, override) => {
      await expect(
        loadContent(nabiOverride(override), pedomanRulesetId),
      ).rejects.toThrow(ContentFormatError);
    });

    test.each([[[]], [["x"]]])(
      "unit rulesets %j is a ContentFormatError",
      async (rulesets) => {
        const load = patched("units.json", (data) => {
          (data["units"] as Record<string, unknown>[])[0]!["rulesets"] =
            rulesets;
        });
        await expect(loadContent(load, kajRulesetId)).rejects.toThrow(
          ContentFormatError,
        );
      },
    );
  });
});
