import { get } from "svelte/store";
import { expect, test } from "vitest";
import {
  RULESET_STORAGE_KEY,
  RulesetController,
} from "../../../src/core/ruleset/ruleset-controller.ts";
import { kajRulesetId, pedomanRulesetId } from "../../../src/engine/index.ts";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const writes: string[] = [];
  return {
    writes,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      writes.push(v);
      data.set(k, v);
    },
  };
}

const failing = {
  getItem: () => {
    throw new Error("no store");
  },
  setItem: () => {
    throw new Error("no store");
  },
};

test("[P-T08] defaults to Pedoman 2002", () => {
  const c = new RulesetController(memoryStorage());
  expect(get(c.setting)).toBe(pedomanRulesetId);
});

test("[P-T08] a persisted choice survives a fresh controller", () => {
  const storage = memoryStorage();
  const first = new RulesetController(storage);
  expect(first.select(kajRulesetId)).toBe(true);
  expect(get(first.setting)).toBe(kajRulesetId);
  expect(storage.getItem(RULESET_STORAGE_KEY)).toBe(kajRulesetId);

  const second = new RulesetController(storage);
  expect(get(second.setting)).toBe(pedomanRulesetId);
  second.load();
  expect(get(second.setting)).toBe(kajRulesetId);
});

test("[P-T08] an unknown stored value keeps the default", () => {
  const c = new RulesetController(
    memoryStorage({ [RULESET_STORAGE_KEY]: "kaj1-2021-simplified-v2" }),
  );
  c.load();
  expect(get(c.setting)).toBe(pedomanRulesetId);
});

test("[P-T08] a null store cannot select and stays unchanged", () => {
  const c = new RulesetController(null);
  c.load();
  expect(c.select(kajRulesetId)).toBe(false);
  expect(get(c.setting)).toBe(pedomanRulesetId);
});

test("[P-T08] a throwing store keeps the default and rejects select", () => {
  const c = new RulesetController(failing);
  c.load();
  expect(get(c.setting)).toBe(pedomanRulesetId);
  expect(c.select(kajRulesetId)).toBe(false);
  expect(get(c.setting)).toBe(pedomanRulesetId);
});

test("[P-T08] selecting the current ruleset succeeds without writing", () => {
  const storage = memoryStorage();
  const c = new RulesetController(storage);
  expect(c.select(pedomanRulesetId)).toBe(true);
  expect(storage.writes).toEqual([]);
});
