import { describe, expect, test } from "vitest";
import type { ConvertResult } from "../../src/engine/convert-result.ts";
import { latinToAksara } from "../../src/engine/latin-to-aksara.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] ambiguity", () => {
  const c = (input: string) => latinToAksara(input, false);

  function ambiguous(r: ConvertResult) {
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
    // Documented v1 rule: two candidates, not 2^n. Mixed pepet/taling
    // readings inside one word are rare; the corpus phase can revisit.
    expect(ambiguous(c("lesehan")).candidates.length).toBe(2);
  });
});
