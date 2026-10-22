import { test as base, expect, type Page } from "@playwright/test";
import { RULESET_STORAGE_KEY } from "../../../src/core/ruleset/ruleset-controller.ts";
import { kajRulesetId, type RulesetId } from "../../../src/engine/index.ts";

/**
 * Records every request that leaves `origin`. The app makes no request
 * outside its own origin (contract section 4, SEC); the returned list must
 * stay empty.
 */
export function trackForeignRequests(page: Page, origin: string): string[] {
  const foreign: string[] = [];
  page.on("request", (request) => {
    const url = request.url();
    if (/^(data|blob|about):/.test(url)) return;
    if (new URL(url).origin !== origin) foreign.push(url);
  });
  return foreign;
}

/**
 * Every spec imports `test` from here. An auto fixture fails the test when a
 * page leaves the origin of the base URL.
 */
export const test = base.extend<{
  originGuard: void;
  ruleset: RulesetId | null;
  rulesetSeed: void;
}>({
  originGuard: [
    async ({ page, baseURL }, use) => {
      const origin = new URL(baseURL ?? "http://localhost:4173/").origin;
      const foreign = trackForeignRequests(page, origin);
      await use();
      expect(foreign, "requests outside the app origin").toEqual([]);
    },
    { auto: true },
  ],
  /**
   * The ruleset every spec runs under: KAJ I v3, so the existing specs keep
   * proving the frozen ruleset (contract acceptance 1). `test.use({ ruleset:
   * null })` is a fresh install, which opens on the default.
   */
  ruleset: [kajRulesetId as RulesetId | null, { option: true }],
  rulesetSeed: [
    async ({ page, ruleset }, use) => {
      // Only fills an empty key, so a test that switches and reloads keeps
      // its own choice.
      if (ruleset !== null) {
        await page.addInitScript(
          ([key, value]) => {
            try {
              if (localStorage.getItem(key) === null) {
                localStorage.setItem(key, value);
              }
            } catch {
              // storage blocked: the app falls back to its default
            }
          },
          [RULESET_STORAGE_KEY, ruleset] as const,
        );
      }
      await use();
    },
    { auto: true },
  ],
});

export { expect };
