import { describe, expect, test } from "vitest";
import { AksaraItem } from "../../src/content/aksara-item.ts";
import { SandhanganItem } from "../../src/content/sandhangan-item.ts";
import {
  aksaraEngineRulesetId,
  angkaDigitToChar,
  javaneseChar,
  murdaLinks,
  nglegenaById,
  padaById,
  rekanById,
  sandhanganById,
  swaraById,
  swaraCatalogue,
} from "../../src/engine/index.ts";
import { readContentJson } from "../support/content-files.ts";

function items(file: string): Record<string, unknown>[] {
  return readContentJson(file)["items"] as Record<string, unknown>[];
}

describe("[P-C07] [P-D04] content no-drift", () => {
  test("aksara.json matches the engine catalog exactly", () => {
    const list = items("aksara.json").map((raw) => AksaraItem.fromJson(raw));
    for (const item of list) {
      switch (item.category) {
        case "nglegena": {
          const a = nglegenaById(item.id);
          expect(a, item.id).not.toBeNull();
          expect(a!.unicodeName).toBe(item.unicodeName);
          expect(a!.latinPujl).toBe(item.latinPujl);
          expect(a!.latinJgst).toBe(item.latinJgst);
          expect(javaneseChar(item.unicodeName!)).toBe(a!.char);
          break;
        }
        case "murda": {
          const m = murdaLinks.find((m) => m.aksara.id === item.id);
          expect(m, item.id).toBeDefined();
          expect(m!.aksara.unicodeName).toBe(item.unicodeName);
          expect(m!.aksara.latinPujl).toBe(item.latinPujl);
          expect(m!.aksara.latinJgst).toBe(item.latinJgst);
          break;
        }
        case "swara": {
          const s =
            swaraById(item.id) ?? swaraCatalogue.find((s) => s.id === item.id);
          expect(s, item.id).toBeDefined();
          expect(s!.unicodeName).toBe(item.unicodeName);
          break;
        }
        case "pada":
          expect(padaById(item.id), item.id).not.toBeNull();
          expect(padaById(item.id)!.unicodeName).toBe(item.unicodeName);
          break;
        case "angka":
          expect(item.digit, item.id).not.toBeNull();
          expect(angkaDigitToChar(item.digit!), item.id).toBe(item.char);
          break;
        case "rekan":
          expect(rekanById(item.id), item.id).not.toBeNull();
          break;
        default:
          expect.fail(`unknown category ${item.category} for ${item.id}`);
      }
      expect(item.audioKey, item.id).not.toBe("");
      expect(item.name, item.id).not.toBe("");
    }
    const count = (category: string) =>
      list.filter((i) => i.category === category).length;
    expect(count("nglegena")).toBe(20);
    expect(count("murda")).toBe(11);
    expect(count("swara")).toBe(11); // 7 + 4 catalogue
    expect(count("rekan")).toBe(7);
    expect(count("angka")).toBe(10);
    expect(count("pada")).toBe(15);
  });

  test("manifest.json pins the current engine ruleset id", () => {
    expect(readContentJson("manifest.json")["rulesetId"]).toBe(
      aksaraEngineRulesetId,
    );
  });

  test("sandhangan.json matches the engine catalog exactly", () => {
    const list = items("sandhangan.json").map((raw) =>
      SandhanganItem.fromJson(raw),
    );
    expect(list.length).toBe(12);
    for (const item of list) {
      const s = sandhanganById(item.id);
      expect(s, item.id).not.toBeNull();
      expect(s!.unicodeName).toBe(item.unicodeName);
      expect(s!.latinPujl).toBe(item.latinPujl);
      expect(s!.latinJgst).toBe(item.latinJgst);
      expect(s!.function).toBe(item.function);
      expect(javaneseChar(item.unicodeName)).toBe(s!.char);
    }
  });
});
