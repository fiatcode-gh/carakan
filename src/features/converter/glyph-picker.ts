import type { AksaraItem } from "../../content/aksara-item.ts";
import type { SandhanganItem } from "../../content/sandhangan-item.ts";
import { searchMatcher } from "../../core/text-search.ts";
import {
  angkaDigitToChar,
  javaneseChar,
  nglegena,
  padaActive,
  padaCatalogue,
  type Ruleset,
  sandhanganPangkon,
  swara,
} from "../../engine/index.ts";
import type { MessageKey, MessageParams } from "../../l10n/i18n.ts";
import {
  pasanganString,
  rekanChar,
  sandhanganGroups,
} from "../chart/chart-catalog.ts";

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
  /**
   * What the entry shows: `char`, except a sandhangan (on a ha carrier) and a
   * pasangan (under a ka carrier), which need a letter to sit on.
   */
  readonly glyph: string;
  /** The PUJL reading the search also matches; null for angka and pada. */
  readonly reading: string | null;
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
 * aksara to Latin direction needs one. Order: carakan, pasangan, sandhangan by
 * function (as in the chart), swara, murda, rekan, angka, pada. Labels are the
 * content display names.
 */
export function pickerSections(
  aksara: readonly AksaraItem[],
  sandhangan: readonly SandhanganItem[],
  ruleset: Ruleset,
  t: (key: MessageKey, params?: MessageParams) => string,
): PickerSection[] {
  const names = new Map(aksara.map((item) => [item.id, item.name] as const));
  const nameOf = (id: string) => names.get(id) ?? id;
  const entry = (
    id: string,
    char: string,
    reading: string | null,
  ): GlyphPickerEntry => ({
    label: nameOf(id),
    char,
    glyph: char,
    reading,
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
          reading: item.latinPujl,
        })),
      );
    },
  );

  return [
    section(
      "sectionCarakan",
      nglegena.map((a) => entry(a.id, a.char, a.latinPujl)),
    ),
    // Inserted as pangkon + letter, so it attaches to the letter before it.
    section(
      "pasanganLabel",
      nglegena.map((a) => ({
        label: t("breakdownPasangan", { name: nameOf(a.id) }),
        char: sandhanganPangkon.char + a.char,
        glyph: pasanganString(a.id),
        reading: a.latinPujl,
      })),
    ),
    ...sandhanganSections,
    section("sectionSwara", [
      ...swara.map((s) => entry(s.id, s.char, s.latinPujl)),
      ...ruleset.swaraLongForms.map((f) => {
        const char =
          javaneseChar(`JAVANESE LETTER ${letterFor(f.baseId)}`) + f.tarungChar;
        return {
          label: t("longFormName", { name: nameOf(f.baseId) }),
          char,
          glyph: char,
          reading: f.latinPujl,
        };
      }),
    ]),
    section(
      "sectionMurda",
      ruleset.murda.map((m) =>
        entry(m.aksara.id, m.aksara.char, m.aksara.latinPujl),
      ),
    ),
    section(
      "sectionRekan",
      ruleset.rekan.map((r) => entry(r.id, rekanChar(r.id), r.latinPujl)),
    ),
    section(
      "sectionAngka",
      Array.from({ length: 10 }, (_, d) =>
        entry(`angka-${d}`, angkaDigitToChar(d), null),
      ),
    ),
    section(
      "sectionPada",
      [...padaActive, ...padaCatalogue].map((p) => entry(p.id, p.char, null)),
    ),
  ];
}

/**
 * The sections with only the entries whose label or reading matches the query;
 * a section without a match is dropped. A blank query returns `sections` itself.
 */
export function filterPickerSections(
  sections: readonly PickerSection[],
  query: string,
): readonly PickerSection[] {
  const matches = searchMatcher(query);
  if (matches === null) return sections;
  return sections
    .map((section) => ({
      ...section,
      entries: section.entries.filter((e) => matches(e.label, e.reading)),
    }))
    .filter((section) => section.entries.length > 0);
}
