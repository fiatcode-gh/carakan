import type { AksaraItem } from "../../content/aksara-item.ts";
import {
  angkaDigitToChar,
  javaneseChar,
  murdaLinks,
  nglegena,
  padaActive,
  padaCatalogue,
  swara,
  swaraLongForms,
} from "../../engine/index.ts";
import type { MessageKey, MessageParams } from "../../l10n/i18n.ts";

export interface GlyphPickerEntry {
  /** Content display name, e.g. `na murda` (W13). */
  readonly label: string;
  /** The aksara string to insert. */
  readonly char: string;
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
 * aksara to Latin direction needs one. Labels are the content display names.
 */
export function pickerSections(
  aksara: readonly AksaraItem[],
  t: (key: MessageKey, params?: MessageParams) => string,
): PickerSection[] {
  const names = new Map(aksara.map((item) => [item.id, item.name] as const));
  const nameOf = (id: string) => names.get(id) ?? id;
  const entry = (id: string, char: string): GlyphPickerEntry => ({
    label: nameOf(id),
    char,
  });
  const section = (
    titleKey: MessageKey,
    entries: GlyphPickerEntry[],
  ): PickerSection => ({ titleKey, title: t(titleKey), entries });

  return [
    section(
      "sectionCarakan",
      nglegena.map((a) => entry(a.id, a.char)),
    ),
    section("sectionSwara", [
      ...swara.map((s) => entry(s.id, s.char)),
      ...[...swaraLongForms.values()].map((f) => ({
        label: t("longFormName", { name: nameOf(f.baseId) }),
        char:
          javaneseChar(`JAVANESE LETTER ${letterFor(f.baseId)}`) + f.tarungChar,
      })),
    ]),
    section(
      "sectionMurda",
      murdaLinks.map((m) => entry(m.aksara.id, m.aksara.char)),
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
