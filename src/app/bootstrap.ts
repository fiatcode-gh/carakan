import { derived, get, readable, writable } from "svelte/store";
import { contentFor, readContent } from "../content/content-repository.ts";
import { ClipPlayer } from "../core/audio/clip-player.ts";
import { openCarakanDb, type CarakanDb } from "../core/db/database.ts";
import { LearnerProgress } from "../core/db/learner-progress.ts";
import { MistakeLogRepository } from "../core/db/mistake-log-repository.ts";
import { UnitCompletionRepository } from "../core/db/unit-completion-repository.ts";
import { LocaleController } from "../core/locale/locale-controller.ts";
import { RulesetController } from "../core/ruleset/ruleset-controller.ts";
import { ReviewQueue } from "../core/srs/review-queue.ts";
import { rulesets } from "../engine/index.ts";
import { createI18n } from "../l10n/i18n.ts";
import type { TabId } from "./router.ts";
import { createRulesetScopes, type Services } from "./services.ts";

export type BootResult =
  | {
      readonly kind: "ready";
      readonly services: Services;
      /** Settles when the browser closes the database under the app. */
      readonly storageLost: Promise<void>;
    }
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
 * Asks the browser to keep this origin's storage through eviction. The answer
 * is not surfaced: no UI, no telemetry.
 */
async function requestPersistentStorage(): Promise<void> {
  try {
    if (
      navigator.storage?.persisted &&
      !(await navigator.storage.persisted())
    ) {
      await navigator.storage.persist?.();
    }
  } catch {
    // best effort only
  }
}

/**
 * The returned function opens storage and loads content. The database stays
 * open across calls, so a retry after `content-error` re-runs content loading
 * only; a retry after `storage-error` tries to open storage again. A database
 * the browser closed is opened again by the next call.
 */
export function createBootstrap(
  runtime: LocaleRuntime,
): () => Promise<BootResult> {
  let db: CarakanDb | null = null;
  let storageLost = Promise.resolve();
  // Read once, kept across retries.
  const ruleset = new RulesetController(storage());
  ruleset.load();
  return async () => {
    if (db === null) {
      let lose = () => {};
      storageLost = new Promise<void>((resolve) => (lose = resolve));
      try {
        db = await openCarakanDb(undefined, () => {
          db = null;
          lose();
        });
      } catch {
        return { kind: "storage-error" };
      }
    }
    let views;
    try {
      const source = await readContent(fetchText);
      views = new Map(rulesets.map((r) => [r.id, contentFor(source, r.id)]));
    } catch {
      return { kind: "content-error" };
    }
    const clips = new ClipPlayer({
      loadManifest: () => fetchText("audio/clips.json"),
      createAudio: (path) => new Audio(new URL(path, document.baseURI).href),
    });
    const activeTab = writable<TabId>("ladder");
    const forRuleset = createRulesetScopes(
      {
        clips,
        completions: new UnitCompletionRepository(db),
        mistakes: new MistakeLogRepository(db),
        progress: new LearnerProgress(db),
        reviewQueue: new ReviewQueue(db),
        locale: runtime.locale,
        ruleset,
        i18n: runtime.i18n,
        activeTab: derived(activeTab, (tab) => tab),
        setActiveTab: (tab) => activeTab.set(tab),
        now: () => Date.now(),
        seedSource: () => Math.floor(Math.random() * 0x7fffffff),
      },
      views,
    );
    const services = forRuleset(get(ruleset.setting));
    void requestPersistentStorage();
    return { kind: "ready", services, storageLost };
  };
}
