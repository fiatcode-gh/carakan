import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { aksaraEngineRulesetId } from "../../src/engine/index.ts";

let out: string;

beforeAll(() => {
  out = mkdtempSync(join(tmpdir(), "carakan-gen-content-"));
  execFileSync(process.execPath, ["tools/gen-content.ts", "--out", out], {
    stdio: "pipe",
  });
});

afterAll(() => {
  rmSync(out, { recursive: true, force: true });
});

describe("[P-D04] content generator", () => {
  for (const file of ["aksara.json", "sandhangan.json"]) {
    test(`${file} regenerates byte-identically from the TS engine`, () => {
      const generated = readFileSync(join(out, file));
      const shipped = readFileSync(join("public", "content", "v1", file));
      expect(generated.equals(shipped)).toBe(true);
    });
  }

  test("manifest.json pins content version 1 and the engine ruleset", () => {
    const manifest = JSON.parse(
      readFileSync(join(out, "manifest.json"), "utf8"),
    ) as Record<string, unknown>;
    expect(manifest["contentVersion"]).toBe(1);
    expect(manifest["rulesetId"]).toBe(aksaraEngineRulesetId);
    expect(typeof manifest["generatedAt"]).toBe("string");
  });
});
