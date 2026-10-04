import { getContext, setContext } from "svelte";
import type { Readable } from "svelte/store";
import type { ContentData } from "../content/content-repository.ts";
import type { GlyphInfoTable } from "../content/glyph-info-table.ts";
import type { CarakanDb } from "../core/db/database.ts";
import type { MistakeLogRepository } from "../core/db/mistake-log-repository.ts";
import type { UnitCompletionRepository } from "../core/db/unit-completion-repository.ts";
import type { LocaleController } from "../core/locale/locale-controller.ts";
import type { ReviewQueue } from "../core/srs/review-queue.ts";
import type { createI18n } from "../l10n/i18n.ts";
import type { TabId } from "./router.ts";

export interface Services {
  readonly db: CarakanDb;
  readonly completions: UnitCompletionRepository;
  readonly mistakes: MistakeLogRepository;
  readonly reviewQueue: ReviewQueue;
  readonly content: ContentData;
  readonly glyphInfo: GlyphInfoTable;
  readonly locale: LocaleController;
  readonly i18n: ReturnType<typeof createI18n>;
  /** The tab whose page is showing; unchanged while a pushed page covers it. */
  readonly activeTab: Readable<TabId>;
  readonly setActiveTab: (tab: TabId) => void;
  /** Epoch milliseconds. */
  readonly now: () => number;
  readonly seedSource: () => number;
  /**
   * Memoizes an app-lifetime object by key, so feature sessions live as long
   * as the app (like the keep-alive blocs) without a shared file to edit.
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
