import { getContext, setContext } from "svelte";
import type { createI18n } from "./i18n.ts";

const key = Symbol("carakan.i18n");

type I18n = ReturnType<typeof createI18n>;

/** Provided at the app root before anything renders, so it never waits for boot. */
export function setI18n(i18n: I18n): void {
  setContext(key, i18n);
}

export function getI18n(): I18n {
  const i18n = getContext<I18n | undefined>(key);
  if (i18n === undefined) throw new Error("i18n is not provided");
  return i18n;
}
