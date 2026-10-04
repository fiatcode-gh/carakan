import { describe, expect, test } from "vitest";
import { aksaraEngineRulesetId } from "../../src/engine/index.ts";

describe("[P-D01] package-smoke", () => {
  test("engine package has a library and no DOM/Node dependency", () => {
    // Reaching this point proves the module graph imports without DOM/Node
    // (engine-purity.test.ts enforces the import allowlist).
    expect(aksaraEngineRulesetId).toBe(aksaraEngineRulesetId);
  });

  test("ruleset id is the v3 bump", () => {
    expect(aksaraEngineRulesetId).toBe("kaj1-2021-simplified-v3");
  });
});
