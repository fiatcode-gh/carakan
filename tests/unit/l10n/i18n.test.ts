import { get, writable } from "svelte/store";
import { expect, test } from "vitest";
import type { LocaleSetting } from "../../../src/core/locale/locale-controller.ts";
import en from "../../../src/l10n/en.json";
import {
  createI18n,
  formatMessage,
  resolveLocale,
} from "../../../src/l10n/i18n.ts";

test("[P-T04] system follows the first id/en language by primary subtag", () => {
  expect(resolveLocale("system", ["en-US"])).toBe("en");
  expect(resolveLocale("system", ["id-ID"])).toBe("id");
  expect(resolveLocale("system", ["fr-FR"])).toBe("id");
  expect(resolveLocale("system", ["fr", "en-GB"])).toBe("en");
  expect(resolveLocale("system", [])).toBe("id");
});

test("[P-T04] an explicit setting overrides the browser languages", () => {
  expect(resolveLocale("id", ["en-US"])).toBe("id");
  expect(resolveLocale("en", ["id-ID"])).toBe("en");
});

test("formatMessage substitutes {name} placeholders", () => {
  expect(formatMessage(en.lessonDone, { correct: 3, total: 5 })).toBe(
    "Done! 3 of 5 correct",
  );
  expect(formatMessage("{a}{a}", { a: "x" })).toBe("xx");
});

test("formatMessage without params returns a plain template unchanged", () => {
  expect(formatMessage("Hello")).toBe("Hello");
});

test("formatMessage throws on a placeholder without a param", () => {
  expect(() => formatMessage(en.lessonDone, { correct: 3 })).toThrow(/total/);
  expect(() => formatMessage(en.lessonDone)).toThrow();
});

test("createI18n resolves reactively and t uses the active locale", () => {
  const setting = writable<LocaleSetting>("system");
  const languages = writable<readonly string[]>(["fr-FR"]);
  const { locale, t } = createI18n(setting, languages);
  expect(get(locale)).toBe("id");
  expect(get(t)("retryButton")).toBe("Coba lagi");
  languages.set(["en-US"]);
  expect(get(locale)).toBe("en");
  expect(get(t)("retryButton")).toBe("Try again");
  setting.set("id");
  expect(get(t)("lessonDone", { correct: 1, total: 2 })).toMatch(/1/);
  expect(get(locale)).toBe("id");
});
