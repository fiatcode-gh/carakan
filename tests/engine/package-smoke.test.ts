import { describe, expect, test } from "vitest";
import {
  defaultRulesetId,
  kajRulesetId,
  pedomanRulesetId,
  rulesets,
} from "../../src/engine/index.ts";

describe("[P-D01] package-smoke", () => {
  test("engine package has a library and no DOM/Node dependency", () => {
    // Reaching this point proves the module graph imports without DOM/Node
    // (engine-purity.test.ts enforces the import allowlist).
    expect(rulesets.length).toBeGreaterThan(0);
  });

  test("ruleset ids, default and Settings order", () => {
    expect(kajRulesetId).toBe("kaj1-2021-simplified-v3");
    expect(pedomanRulesetId).toBe("pedoman-2002-v1");
    expect(defaultRulesetId).toBe(pedomanRulesetId);
    expect(rulesets.map((r) => r.id)).toEqual([pedomanRulesetId, kajRulesetId]);
  });
});
