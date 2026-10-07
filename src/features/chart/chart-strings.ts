import type { MessageKey, MessageParams } from "../../l10n/i18n.ts";
import type { ChartStrings } from "./chart-catalog.ts";

/** The chart's display words, from the message catalog. */
export function chartStrings(
  t: (key: MessageKey, params?: MessageParams) => string,
): ChartStrings {
  return {
    carakan: t("sectionCarakan"),
    sandhanganVowel: t("sectionSandhanganVowel"),
    sandhanganClosing: t("sectionSandhanganClosing"),
    sandhanganConsonant: t("sectionSandhanganConsonant"),
    sandhanganKiller: t("sectionSandhanganKiller"),
    murda: t("sectionMurda"),
    swara: t("sectionSwara"),
    rekan: t("sectionRekan"),
    angka: t("sectionAngka"),
    pada: t("sectionPada"),
    murdaHint: t("murdaHint"),
    writtenAs: (form) => t("writtenAs", { form }),
    longFormName: (name) => t("longFormName", { name }),
  };
}
