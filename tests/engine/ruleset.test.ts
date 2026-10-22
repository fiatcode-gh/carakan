import { describe, expect, test } from "vitest";
import {
  cecakTelu,
  defaultRulesetId,
  isRulesetId,
  javaneseChar,
  kajRulesetId,
  murdaLinks,
  pedomanRulesetId,
  rekan,
  rekanById,
  rulesetById,
  rulesets,
  swaraCatalogue,
  swaraLongForms,
} from "../../src/engine/index.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D07] ruleset inventories", () => {
  test("ids, order and default", () => {
    expect(kajRulesetId).toBe("kaj1-2021-simplified-v3");
    expect(pedomanRulesetId).toBe("pedoman-2002-v1");
    expect(defaultRulesetId).toBe(pedomanRulesetId);
    expect(rulesets.map((r) => r.id)).toEqual([pedomanRulesetId, kajRulesetId]);
  });

  test("isRulesetId accepts both ids and nothing else", () => {
    expect(isRulesetId(kajRulesetId)).toBe(true);
    expect(isRulesetId(pedomanRulesetId)).toBe(true);
    expect(isRulesetId("kaj1-2021-simplified-v2")).toBe(false);
    expect(isRulesetId("")).toBe(false);
    expect(isRulesetId(null)).toBe(false);
  });

  test("KAJ inventories are the existing lists in the same order", () => {
    const kaj = rulesetById(kajRulesetId);
    expect(kaj.murda).toEqual(murdaLinks);
    expect(kaj.swaraLongForms).toEqual([...swaraLongForms.values()]);
    expect(kaj.swaraCatalogue).toEqual(swaraCatalogue);
    expect(kaj.rekan).toEqual(rekan);
  });

  test("Pedoman writes seven murda and no long swara", () => {
    const ped = rulesetById(pedomanRulesetId);
    expect(ped.murda.map((m) => m.aksara.id)).toEqual([
      "naMurda",
      "kaMurda",
      "taMurda",
      "saMurda",
      "paMurda",
      "gaMurda",
      "baMurda",
    ]);
    expect(ped.swaraLongForms).toEqual([]);
    expect(ped.swaraCatalogue).toEqual([]);
  });

  test("Pedoman rekan are kha dza fa/va za gha", () => {
    const ped = rulesetById(pedomanRulesetId);
    expect(ped.rekan.map((r) => r.id)).toEqual([
      "kha",
      "dza",
      "fa",
      "za",
      "gha",
    ]);
    expect(ped.rekan.find((r) => r.id === "fa")?.latinPujl).toBe("fa/va");
  });

  test("chart-only rekan are cecak telu on KA DA JA GA", () => {
    const expected = {
      kha: "KA CECAK_TELU",
      dza: "DA CECAK_TELU",
      za: "JA CECAK_TELU",
      gha: "GA CECAK_TELU",
    };
    for (const [id, spec] of Object.entries(expected)) {
      const r = rekanById(id);
      expect(r, id).not.toBeNull();
      expect(javaneseChar(r!.baseUnicodeName!) + cecakTelu.char).toBe(ak(spec));
    }
  });

  test("the converter rekan list is unchanged", () => {
    expect(rekan.map((r) => r.id)).toEqual([
      "fa",
      "va",
      "le",
      "ai",
      "au",
      "reu",
      "leu",
    ]);
  });
});
