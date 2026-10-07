import { describe, expect, test } from "vitest";
import { AksaraItem } from "../../src/content/aksara-item.ts";
import { ContentFormatError } from "../../src/content/content-format-error.ts";
import { loadContent } from "../../src/content/content-repository.ts";
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
      const content = await loadContent(loadFromPublic);
      const file = JSON.parse(
        await loadFromPublic("content/v1/chart_examples.json"),
      ) as { examples: Record<string, string[]> };
      const ids = file.examples["ka"];
      expect(content.chartExamples.get("ka")!.map((w) => w.id)).toEqual(ids);
    });

    test("an unknown word id is a ContentFormatError", async () => {
      const load = patched((ex) => (ex["ka"] = ["no-such-word"]));
      await expect(loadContent(load)).rejects.toThrow(ContentFormatError);
    });

    test("an unknown glyph key is a ContentFormatError", async () => {
      const load = patched((ex) => (ex["not-a-glyph"] = ["kebo"]));
      await expect(loadContent(load)).rejects.toThrow(ContentFormatError);
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
      const content = await loadContent(loadFromPublic);
      expect(content.retiredUnits.map((r) => r.id)).toEqual([
        "u1",
        "u3",
        "u4",
        "u5",
      ]);
    });

    test("a units.json without retiredUnits is a ContentFormatError", async () => {
      const load = patchedUnits((data) => delete data["retiredUnits"]);
      await expect(loadContent(load)).rejects.toThrow(ContentFormatError);
    });

    test("a retired entry without id is a ContentFormatError", async () => {
      const load = patchedUnits(
        (data) => (data["retiredUnits"] = [{ glyphs: ["ha"] }]),
      );
      await expect(loadContent(load)).rejects.toThrow(ContentFormatError);
    });
  });
});
