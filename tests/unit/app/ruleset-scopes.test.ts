import { readable } from "svelte/store";
import { describe, expect, test } from "vitest";
import {
  createRulesetScopes,
  type Services,
} from "../../../src/app/services.ts";
import {
  contentFor,
  readContent,
} from "../../../src/content/content-repository.ts";
import { RulesetController } from "../../../src/core/ruleset/ruleset-controller.ts";
import {
  kajRulesetId,
  pedomanRulesetId,
  rulesets,
} from "../../../src/engine/index.ts";
import { loadFromPublic } from "../../support/content-files.ts";

const stub = <T>(): T => ({}) as T;

async function scopes() {
  const source = await readContent(loadFromPublic);
  const views = new Map(rulesets.map((r) => [r.id, contentFor(source, r.id)]));
  const shared: Omit<
    Services,
    "content" | "glyphInfo" | "singleton" | "forRuleset"
  > = {
    clips: stub(),
    completions: stub(),
    mistakes: stub(),
    progress: stub(),
    reviewQueue: stub(),
    locale: stub(),
    ruleset: new RulesetController(null),
    i18n: stub(),
    activeTab: readable("ladder"),
    setActiveTab: () => {},
    now: () => 0,
    seedSource: () => 0,
  };
  return createRulesetScopes(shared, views);
}

describe("createRulesetScopes [P-T08]", () => {
  test("the same id gives the same scope object", async () => {
    const forRuleset = await scopes();
    expect(forRuleset(pedomanRulesetId)).toBe(forRuleset(pedomanRulesetId));
    expect(forRuleset(pedomanRulesetId)).not.toBe(forRuleset(kajRulesetId));
  });

  test("scopes share storage-backed services and the ruleset controller", async () => {
    const forRuleset = await scopes();
    const a = forRuleset(pedomanRulesetId);
    const b = forRuleset(kajRulesetId);
    expect(a.completions).toBe(b.completions);
    expect(a.ruleset).toBe(b.ruleset);
  });

  test("singletons are per scope and memoized within one", async () => {
    const forRuleset = await scopes();
    const a = forRuleset(pedomanRulesetId);
    const b = forRuleset(kajRulesetId);
    const made = a.singleton("k", () => ({}));
    expect(a.singleton("k", () => ({}))).toBe(made);
    expect(b.singleton("k", () => ({}))).not.toBe(made);
  });

  test("each scope carries its ruleset's content and word aksara", async () => {
    const forRuleset = await scopes();
    const pedoman = forRuleset(pedomanRulesetId);
    const kaj = forRuleset(kajRulesetId);
    expect(pedoman.content.ruleset.id).toBe(pedomanRulesetId);
    expect(kaj.content.ruleset.id).toBe(kajRulesetId);
    const vakum = (s: Services) =>
      s.content.words.find((w) => w.id === "vakum")!.aksara;
    expect(vakum(pedoman)).not.toBe(vakum(kaj));
  });

  test("a scope's forRuleset is the same memo", async () => {
    const forRuleset = await scopes();
    expect(forRuleset(pedomanRulesetId).forRuleset(kajRulesetId)).toBe(
      forRuleset(kajRulesetId),
    );
  });
});
