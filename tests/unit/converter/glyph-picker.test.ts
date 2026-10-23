import { describe, expect, test } from "vitest";
import {
  javaneseChar,
  kajRulesetId,
  pedomanRulesetId,
  rulesetById,
  sandhanganById,
  toLatin,
} from "../../../src/engine/index.ts";
import {
  rekanChar,
  sandhanganGroups,
} from "../../../src/features/chart/chart-catalog.ts";
import {
  pickerSections,
  type PickerSection,
} from "../../../src/features/converter/glyph-picker.ts";
import en from "../../../src/l10n/en.json";
import { formatMessage, type MessageKey } from "../../../src/l10n/i18n.ts";
import id from "../../../src/l10n/id.json";
import { ak } from "../../engine/support/aksara-builder.ts";
import { loadView } from "../../support/content-files.ts";

const content = await loadView(kajRulesetId);
const pedoman = await loadView(pedomanRulesetId);
const { aksara } = content;
const translator =
  (catalog: Record<MessageKey, string>) =>
  (key: MessageKey, params?: Record<string, string | number>) =>
    formatMessage(catalog[key], params);

const kaj = rulesetById(kajRulesetId);
const sections = pickerSections(
  aksara,
  content.sandhangan,
  kaj,
  translator(id),
);
const section = (key: MessageKey) => {
  const found = sections.find((s) => s.titleKey === key);
  if (found === undefined) throw new Error(`no section ${key}`);
  return found;
};

describe("pickerSections", () => {
  test("[P-C08] a Pedoman picker has 7 swara (no long forms), 7 murda and 5 rekan", () => {
    const pedomanSections = pickerSections(
      pedoman.aksara,
      pedoman.sandhangan,
      pedoman.ruleset,
      translator(id),
    );
    expect(pedomanSections.map((s) => s.entries.length)).toEqual([
      20, 5, 3, 1, 3, 7, 7, 5, 10, 15,
    ]);
    expect(
      pedomanSections
        .find((s) => s.titleKey === "sectionRekan")!
        .entries.map((e) => e.label),
    ).toEqual(["kha", "dza", "fa", "za", "gha"]);
  });

  test("[P-U08] has the ten sections with the source sizes", () => {
    expect(sections.map((s) => s.entries.length)).toEqual([
      20, 5, 3, 1, 3, 11, 11, 7, 10, 15,
    ]);
  });

  test("[P-U08] [W12] titles come from the section keys, in both locales", () => {
    expect(sections.map((s) => s.titleKey)).toEqual([
      "sectionCarakan",
      "sectionSandhanganVowel",
      "sectionSandhanganClosing",
      "sectionSandhanganKiller",
      "sectionSandhanganConsonant",
      "sectionSwara",
      "sectionMurda",
      "sectionRekan",
      "sectionAngka",
      "sectionPada",
    ]);
    expect(sections.map((s) => s.title)).toEqual(
      sections.map((s) => id[s.titleKey!]),
    );
    const english = pickerSections(
      aksara,
      content.sandhangan,
      kaj,
      translator(en),
    );
    expect(english.map((s) => s.title)).toEqual(
      english.map((s) => en[s.titleKey!]),
    );
  });

  test("[P-U08] carakan starts with ha and every entry carries a char", () => {
    expect(section("sectionCarakan").entries[0]).toEqual({
      label: "ha",
      char: ak("HA"),
      glyph: ak("HA"),
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
      pickerSections(aksara, content.sandhangan, kaj, translator(cat))
        .find((s) => s.titleKey === "sectionSwara")!
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

  test("[P-U08] a sandhangan inserts only its mark and shows it on a ha carrier", () => {
    const marks = sandhanganGroups(content.sandhangan);
    const entries = [...marks.values()].flat();
    expect(entries).toHaveLength(12);
    const picked = sections.flatMap((s) => s.entries);
    for (const item of entries) {
      const found = picked.find((e) => e.label === item.name);
      expect(found, item.id).toBeDefined();
      expect(found!.char, item.id).toBe(sandhanganById(item.id)!.char);
      expect([...found!.char], item.id).toHaveLength(1);
      expect(found!.glyph, item.id).toBe(
        javaneseChar("JAVANESE LETTER HA") + found!.char,
      );
    }
  });

  test("[P-U08] ka + wulu reads ki; ka + pangkon + ra reads as pasangan", () => {
    const char = (name: string) => {
      const found = sections
        .flatMap((s) => s.entries)
        .find((e) => e.label === name);
      if (found === undefined) throw new Error(`no entry ${name}`);
      return found.char;
    };
    const ka = ak("KA");
    expect(toLatin(ka + char("wulu (i)"))).toEqual({
      kind: "success",
      output: "ki",
    });
    expect(toLatin(ka + char("pangkon (pemati)") + ak("RA"))).toEqual({
      kind: "success",
      output: "kra",
    });
  });

  test("[P-C08] rekan follow the active ruleset and read back", async () => {
    const pedomanSections = pickerSections(
      pedoman.aksara,
      pedoman.sandhangan,
      pedoman.ruleset,
      translator(id),
    );
    const rekanOf = (list: PickerSection[]) =>
      list.find((s) => s.titleKey === "sectionRekan")!.entries;
    const kajRekan = rekanOf(sections);
    expect(kajRekan).toHaveLength(7);
    expect(kajRekan.map((e) => e.char)).toEqual(
      kaj.rekan.map((r) => rekanChar(r.id)),
    );
    expect(rekanOf(pedomanSections)).toHaveLength(5);
    for (const list of [kajRekan, rekanOf(pedomanSections)]) {
      const fa = list.find((e) => e.label === "fa")!;
      expect(fa.char).toBe(rekanChar("fa"));
      for (const entry of list) {
        expect(toLatin(entry.char).kind, entry.label).toBe("success");
      }
    }
    expect(rekanOf(pedomanSections).map((e) => e.label)).toEqual([
      "kha",
      "dza",
      "fa",
      "za",
      "gha",
    ]);
    // KAJ au/reu read back as oau/rereu (out of scope), so they are unasserted.
    for (const label of ["fa", "va", "le", "ai", "leu"]) {
      const entry = kajRekan.find((e) => e.label === label)!;
      expect(toLatin(entry.char), label).toEqual({
        kind: "success",
        output: label,
      });
    }
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
