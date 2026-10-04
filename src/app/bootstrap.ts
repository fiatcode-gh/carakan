import { derived, readable, writable } from "svelte/store";
import { loadContent } from "../content/content-repository.ts";
import { GlyphInfoTable } from "../content/glyph-info-table.ts";
import { openCarakanDb, type CarakanDb } from "../core/db/database.ts";
import { MistakeLogRepository } from "../core/db/mistake-log-repository.ts";
import { UnitCompletionRepository } from "../core/db/unit-completion-repository.ts";
import { LocaleController } from "../core/locale/locale-controller.ts";
import { ReviewQueue } from "../core/srs/review-queue.ts";
import { createI18n } from "../l10n/i18n.ts";
import type { TabId } from "./router.ts";
import { createSingletons, type Services } from "./services.ts";

export type BootResult =
  | { readonly kind: "ready"; readonly services: Services }
  | { readonly kind: "storage-error" }
  | { readonly kind: "content-error" };

export interface LocaleRuntime {
  readonly locale: LocaleController;
  readonly i18n: ReturnType<typeof createI18n>;
}

function storage(): Storage | null {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

/**
 * Runs before mount and is synchronous, so the first render is already in the
 * persisted (or browser) language (P-T03). `navigator.languages` keeps feeding
 * the system choice on `languagechange`.
 */
export function createLocaleRuntime(): LocaleRuntime {
  const locale = new LocaleController(storage());
  locale.load();
  const languages = readable<readonly string[]>(navigator.languages, (set) => {
    const update = () => set(navigator.languages);
    addEventListener("languagechange", update);
    update();
    return () => removeEventListener("languagechange", update);
  });
  return { locale, i18n: createI18n(locale.setting, languages) };
}

const fetchText = async (path: string): Promise<string> => {
  const response = await fetch(new URL(path, document.baseURI));
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.text();
};

/**
 * The returned function opens storage and loads content. The database stays
 * open across calls, so a retry after `content-error` re-runs content loading
 * only; a retry after `storage-error` tries to open storage again.
 */
export function createBootstrap(
  runtime: LocaleRuntime,
): () => Promise<BootResult> {
  let db: CarakanDb | null = null;
  return async () => {
    if (db === null) {
      try {
        db = await openCarakanDb();
      } catch {
        return { kind: "storage-error" };
      }
    }
    let content;
    try {
      content = await loadContent(fetchText);
    } catch {
      return { kind: "content-error" };
    }
    const activeTab = writable<TabId>("ladder");
    const services: Services = {
      db,
      completions: new UnitCompletionRepository(db),
      mistakes: new MistakeLogRepository(db),
      reviewQueue: new ReviewQueue(db),
      content,
      glyphInfo: GlyphInfoTable.build(content),
      locale: runtime.locale,
      i18n: runtime.i18n,
      activeTab: derived(activeTab, (tab) => tab),
      setActiveTab: (tab) => activeTab.set(tab),
      now: () => Date.now(),
      seedSource: () => Math.floor(Math.random() * 0x7fffffff),
      singleton: createSingletons(),
    };
    return { kind: "ready", services };
  };
}
