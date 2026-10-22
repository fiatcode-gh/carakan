import { getContext, setContext } from "svelte";
import type { Readable } from "svelte/store";
import type { ContentData } from "../content/content-repository.ts";
import { GlyphInfoTable } from "../content/glyph-info-table.ts";
import type { LearnerProgress } from "../core/db/learner-progress.ts";
import type { MistakeLogRepository } from "../core/db/mistake-log-repository.ts";
import type { UnitCompletionRepository } from "../core/db/unit-completion-repository.ts";
import type { LocaleController } from "../core/locale/locale-controller.ts";
import type { RulesetController } from "../core/ruleset/ruleset-controller.ts";
import type { ReviewQueue } from "../core/srs/review-queue.ts";
import type { RulesetId } from "../engine/index.ts";
import type { createI18n } from "../l10n/i18n.ts";
import type { TabId } from "./router.ts";

export interface Services {
  readonly completions: UnitCompletionRepository;
  readonly mistakes: MistakeLogRepository;
  readonly progress: LearnerProgress;
  readonly reviewQueue: ReviewQueue;
  /** Content of this ruleset scope. */
  readonly content: ContentData;
  /** Glyph lookup of this ruleset scope. */
  readonly glyphInfo: GlyphInfoTable;
  readonly locale: LocaleController;
  /** The writing-ruleset choice; shared by every scope. */
  readonly ruleset: RulesetController;
  /**
   * The scope of ruleset `id`: same storage, locale and tab state; that
   * ruleset's `content`, `glyphInfo` and its own `singleton` registry.
   * Memoized.
   */
  readonly forRuleset: (id: RulesetId) => Services;
  readonly i18n: ReturnType<typeof createI18n>;
  /** The tab whose page is showing; unchanged while a pushed page covers it. */
  readonly activeTab: Readable<TabId>;
  readonly setActiveTab: (tab: TabId) => void;
  /** Epoch milliseconds. */
  readonly now: () => number;
  readonly seedSource: () => number;
  /**
   * Memoizes an object of this ruleset scope by key, so feature sessions live
   * as long as the app (like the keep-alive blocs) without a shared file to
   * edit.
   */
  singleton<T>(key: string, create: () => T): T;
}

const key = Symbol("carakan.services");

export function setServices(services: Services): void {
  setContext(key, services);
}

export function getServices(): Services {
  const services = getContext<Services | undefined>(key);
  if (services === undefined) throw new Error("services are not provided");
  return services;
}

/** Memoizing store behind `Services.singleton`. */
export function createSingletons(): Services["singleton"] {
  const instances = new Map<string, unknown>();
  return <T>(name: string, create: () => T): T => {
    if (!instances.has(name)) instances.set(name, create());
    return instances.get(name) as T;
  };
}

/**
 * Builds the per-ruleset scopes lazily and once each: a scope shares the
 * storage-backed services and owns its content, glyph table and singletons.
 */
export function createRulesetScopes(
  shared: Omit<Services, "content" | "glyphInfo" | "singleton" | "forRuleset">,
  views: ReadonlyMap<RulesetId, ContentData>,
): (id: RulesetId) => Services {
  const scopes = new Map<RulesetId, Services>();
  const forRuleset = (id: RulesetId): Services => {
    let scope = scopes.get(id);
    if (scope === undefined) {
      const view = views.get(id);
      if (view === undefined) throw new Error(`no content for ruleset ${id}`);
      scope = {
        ...shared,
        content: view,
        glyphInfo: GlyphInfoTable.build(view),
        singleton: createSingletons(),
        forRuleset,
      };
      scopes.set(id, scope);
    }
    return scope;
  };
  return forRuleset;
}
