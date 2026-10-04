import { describe, expect, test } from "vitest";
import { loadContent } from "../../../src/content/content-repository.ts";
import { javaneseChar } from "../../../src/engine/index.ts";
import { pickerSections } from "../../../src/features/converter/glyph-picker.ts";
import en from "../../../src/l10n/en.json";
import { formatMessage, type MessageKey } from "../../../src/l10n/i18n.ts";
import id from "../../../src/l10n/id.json";
import { ak } from "../../engine/support/aksara-builder.ts";
import { loadFromPublic } from "../../support/content-files.ts";

const { aksara } = await loadContent(loadFromPublic);
const translator =
  (catalog: Record<MessageKey, string>) =>
  (key: MessageKey, params?: Record<string, string | number>) =>
    formatMessage(catalog[key], params);

const sections = pickerSections(aksara, translator(id));
const section = (key: MessageKey) => {
  const found = sections.find((s) => s.titleKey === key);
  if (found === undefined) throw new Error(`no section ${key}`);
  return found;
};

describe("pickerSections", () => {
  test("[P-U08] has the five sections with the source sizes", () => {
    expect(sections.map((s) => s.entries.length)).toEqual([20, 11, 11, 10, 15]);
  });

  test("[P-U08] [W12] titles come from the section keys, in both locales", () => {
    expect(sections.map((s) => s.titleKey)).toEqual([
      "sectionCarakan",
      "sectionSwara",
      "sectionMurda",
      "sectionAngka",
      "sectionPada",
    ]);
    expect(sections.map((s) => s.title)).toEqual(
      sections.map((s) => id[s.titleKey!]),
    );
    const english = pickerSections(aksara, translator(en));
    expect(english.map((s) => s.title)).toEqual(
      english.map((s) => en[s.titleKey!]),
    );
  });

  test("[P-U08] carakan starts with ha and every entry carries a char", () => {
    expect(section("sectionCarakan").entries[0]).toEqual({
      label: "ha",
      char: ak("HA"),
    });
    for (const s of sections) {
      for (const e of s.entries) expect(e.char).not.toBe("");
    }
  });

  test("[P-U08] swara long forms are the swara letter plus tarung", () => {
    const long = section("sectionSwara").entries.slice(7);
    expect(long.map((e) => e.char)).toEqual([
      ak("A TARUNG"),
      ak("U TARUNG"),
      ak("O TARUNG"),
      ak("PA_CEREK TARUNG"),
    ]);
  });

  test("[P-U08] angka entries are the digits 0..9", () => {
    expect(section("sectionAngka").entries.map((e) => e.char)).toEqual(
      Array.from({ length: 10 }, (_, d) =>
        javaneseChar(`JAVANESE DIGIT ${DIGITS[d]}`),
      ),
    );
  });

  test("[P-U08] pada: the two active ones come first", () => {
    const chars = section("sectionPada").entries.map((e) => e.char);
    expect(chars.slice(0, 2)).toEqual([ak("PADA_LINGSA"), ak("PADA_LUNGSI")]);
  });

  test("[P-U08] [W13] labels are the content display names", () => {
    const label = (key: MessageKey, i: number) =>
      section(key).entries[i]!.label;
    expect(label("sectionMurda", 0)).toBe("na murda");
    expect(label("sectionPada", 3)).toBe("pada adeg-adeg");
    expect(label("sectionAngka", 3)).toBe("angka 3");
    expect(label("sectionSwara", 3)).toBe("é");
    expect(label("sectionSwara", 4)).toBe("o");
  });

  test("[P-U08] [W13] long forms use longFormName on the base name, per locale", () => {
    const labels = (cat: Record<MessageKey, string>) =>
      pickerSections(aksara, translator(cat))[1]!
        .entries.slice(7)
        .map((e) => e.label);
    expect(labels(id)).toEqual([
      "a panjang",
      "u panjang",
      "o panjang",
      "pa cerek (rě) panjang",
    ]);
    expect(labels(en)).toEqual([
      "long a",
      "long u",
      "long o",
      "long pa cerek (rě)",
    ]);
  });
});

const DIGITS = [
  "ZERO",
  "ONE",
  "TWO",
  "THREE",
  "FOUR",
  "FIVE",
  "SIX",
  "SEVEN",
  "EIGHT",
  "NINE",
];
