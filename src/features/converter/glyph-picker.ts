import type { AksaraItem } from "../../content/aksara-item.ts";
import type { SandhanganItem } from "../../content/sandhangan-item.ts";
import {
  angkaDigitToChar,
  javaneseChar,
  nglegena,
  padaActive,
  padaCatalogue,
  type Ruleset,
  swara,
} from "../../engine/index.ts";
import type { MessageKey, MessageParams } from "../../l10n/i18n.ts";
import { rekanChar, sandhanganGroups } from "../chart/chart-catalog.ts";

/** Section title per sandhangan function, as in the chart. */
const sandhanganTitleKeys: Record<string, MessageKey> = {
  vowelChanging: "sectionSandhanganVowel",
  syllableClosing: "sectionSandhanganClosing",
  vowelKiller: "sectionSandhanganKiller",
  consonantModifying: "sectionSandhanganConsonant",
};

export interface GlyphPickerEntry {
  /** Content display name, e.g. `na murda` (W13). */
  readonly label: string;
  /** The aksara string to insert. */
  readonly char: string;
  /** What the entry shows: `char`, except a sandhangan, which is shown on a ha carrier. */
  readonly glyph: string;
}

export interface PickerSection {
  /** Always set: titles come from the `section*` keys (W12). */
  readonly titleKey: MessageKey;
  readonly title: string;
  readonly entries: GlyphPickerEntry[];
}

/** The Unicode letter a long swara is written on (source `_letterFor`). */
function letterFor(baseId: string): string {
  switch (baseId) {
    case "u":
      return "U";
    case "o":
      return "O";
    case "paCerek":
      return "PA CEREK";
    default:
      return "A";
  }
}

/**
 * Sections of the in-app glyph picker: nobody has a Javanese keyboard, and the
 * aksara to Latin direction needs one. Order: carakan, sandhangan by function
 * (as in the chart), swara, murda, rekan, angka, pada. Labels are the content
 * display names.
 */
export function pickerSections(
  aksara: readonly AksaraItem[],
  sandhangan: readonly SandhanganItem[],
  ruleset: Ruleset,
  t: (key: MessageKey, params?: MessageParams) => string,
): PickerSection[] {
  const names = new Map(aksara.map((item) => [item.id, item.name] as const));
  const nameOf = (id: string) => names.get(id) ?? id;
  const entry = (id: string, char: string): GlyphPickerEntry => ({
    label: nameOf(id),
    char,
    glyph: char,
  });
  const section = (
    titleKey: MessageKey,
    entries: GlyphPickerEntry[],
  ): PickerSection => ({ titleKey, title: t(titleKey), entries });
  const sandhanganSections = [...sandhanganGroups(sandhangan)].map(
    ([fn, group]) => {
      const titleKey = sandhanganTitleKeys[fn];
      if (titleKey === undefined) {
        throw new RangeError(`unknown function: ${fn}`);
      }
      return section(
        titleKey,
        group.map((item) => ({
          label: item.name,
          char: javaneseChar(item.unicodeName),
          glyph: item.carrierChar,
        })),
      );
    },
  );

  return [
    section(
      "sectionCarakan",
      nglegena.map((a) => entry(a.id, a.char)),
    ),
    ...sandhanganSections,
    section("sectionSwara", [
      ...swara.map((s) => entry(s.id, s.char)),
      ...ruleset.swaraLongForms.map((f) => {
        const char =
          javaneseChar(`JAVANESE LETTER ${letterFor(f.baseId)}`) + f.tarungChar;
        return {
          label: t("longFormName", { name: nameOf(f.baseId) }),
          char,
          glyph: char,
        };
      }),
    ]),
    section(
      "sectionMurda",
      ruleset.murda.map((m) => entry(m.aksara.id, m.aksara.char)),
    ),
    section(
      "sectionRekan",
      ruleset.rekan.map((r) => entry(r.id, rekanChar(r.id))),
    ),
    section(
      "sectionAngka",
      Array.from({ length: 10 }, (_, d) =>
        entry(`angka-${d}`, angkaDigitToChar(d)),
      ),
    ),
    section(
      "sectionPada",
      [...padaActive, ...padaCatalogue].map((p) => entry(p.id, p.char)),
    ),
  ];
}
