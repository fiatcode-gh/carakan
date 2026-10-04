import { derived, type Readable } from "svelte/store";
import type { LocaleSetting } from "../core/locale/locale-controller.ts";
import en from "./en.json";
import id from "./id.json";

export type MessageKey = keyof typeof id;
export type ResolvedLocale = "id" | "en";
export type MessageParams = Record<string, string | number>;

const catalogs: Record<ResolvedLocale, Record<MessageKey, string>> = { id, en };

export function resolveLocale(
  setting: LocaleSetting,
  languages: readonly string[],
): ResolvedLocale {
  if (setting !== "system") return setting;
  for (const language of languages) {
    const primary = language.split("-")[0]?.toLowerCase();
    if (primary === "id" || primary === "en") return primary;
  }
  return "id";
}

/** A placeholder without a param is a programming error and throws. */
export function formatMessage(
  template: string,
  params?: MessageParams,
): string {
  return template.replace(/\{(\w+)\}/g, (_, name: string) => {
    const value = params?.[name];
    if (value === undefined) {
      throw new Error(`missing message parameter: ${name}`);
    }
    return String(value);
  });
}

export function createI18n(
  setting: Readable<LocaleSetting>,
  languages: Readable<readonly string[]>,
): {
  locale: Readable<ResolvedLocale>;
  t: Readable<(key: MessageKey, params?: MessageParams) => string>;
} {
  const locale = derived([setting, languages], ([s, l]) => resolveLocale(s, l));
  const t = derived(
    locale,
    (current) => (key: MessageKey, params?: MessageParams) =>
      formatMessage(catalogs[current][key], params),
  );
  return { locale, t };
}
