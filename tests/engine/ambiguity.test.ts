import { describe, expect, test } from "vitest";
import type {
  ConvertResult,
  ToAksaraResult,
} from "../../src/engine/convert-result.ts";
import { pedomanRulesetId } from "../../src/engine/index.ts";
import { latinToAksara } from "../../src/engine/latin-to-aksara.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] ambiguity", () => {
  const c = (input: string) => latinToAksara(input, false);

  function ambiguous(r: ToAksaraResult) {
    expect(r.kind).toBe("ambiguous");
    if (r.kind !== "ambiguous") throw new Error("expected ConvertAmbiguous");
    return r;
  }

  function success(r: ConvertResult): string {
    expect(r.kind).toBe("success");
    if (r.kind !== "success") throw new Error("expected ConvertSuccess");
    return r.output;
  }

  test("bare e returns ConvertAmbiguous with pepet and taling candidates", () => {
    // Spec 6.2: never guess silently.
    const amb = ambiguous(c("hasem"));
    expect(amb.candidates.map((x) => x.output)).toEqual([
      ak("HA SA PEPET MA PANGKON"),
      ak("HA SA TALING MA PANGKON"), // v3: Unicode order (taling after base)
    ]);
    expect(amb.reason).toContain("pepet");
  });

  test("bare e in a cluster offers keret vs cakra+taling", () => {
    const amb = ambiguous(c("prelu"));
    expect(amb.candidates.map((x) => x.output)).toEqual([
      ak("PA KERET LA SUKU"),
      ak("PA CAKRA TALING LA SUKU"), // v3: Unicode order (taling after base)
    ]);
  });

  test("diacritics resolve the ambiguity deterministically", () => {
    expect(success(c("hasěm"))).toBe(ak("HA SA PEPET MA PANGKON"));
    expect(success(c("hasêm"))).toBe(ak("HA SA PEPET MA PANGKON"));
    expect(success(c("hasém"))).toBe(
      ak("HA SA TALING MA PANGKON"), // v3: Unicode order (taling after base)
    );
    expect(success(c("hasèm"))).toBe(
      ak("HA SA TALING MA PANGKON"), // v3: Unicode order (taling after base)
    );
  });

  test("ambiguity result carries the full original input", () => {
    expect(ambiguous(c("prelu")).input).toBe("prelu");
  });

  test("all bare-e occurrences in one word substitute uniformly", () => {
    // Engine candidates stay two whole-input readings, not 2^n; the UI
    // resolves each e through `bareE`.
    expect(ambiguous(c("lesehan")).candidates.length).toBe(2);
  });

  test("[P-D01] ambiguity lists every plain e with its word", () => {
    expect(ambiguous(c("seneng kowe")).bareE).toEqual([
      { index: 1, word: { start: 0, end: 6 } },
      { index: 3, word: { start: 0, end: 6 } },
      { index: 10, word: { start: 7, end: 11 } },
    ]);
    expect(ambiguous(c("prelu")).bareE).toEqual([
      { index: 2, word: { start: 0, end: 5 } },
    ]);
  });

  test("[P-D01] ai/au alone leaves bareE empty", () => {
    expect(
      ambiguous(latinToAksara("sinau", false, pedomanRulesetId)).bareE,
    ).toEqual([]);
    expect(
      ambiguous(latinToAksara("rame sinau", false, pedomanRulesetId)).bareE,
    ).toHaveLength(1);
  });
});
