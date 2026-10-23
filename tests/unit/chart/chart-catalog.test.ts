import { describe, expect, test } from "vitest";
import { AksaraItem } from "../../../src/content/aksara-item.ts";
import {
  contentFor,
  readContent,
} from "../../../src/content/content-repository.ts";
import { SandhanganItem } from "../../../src/content/sandhangan-item.ts";
import {
  kajRulesetId,
  murdaLinks,
  nglegena,
  pedomanRulesetId,
  rekan,
  rulesetById,
  swara,
  swaraCatalogue,
  swaraLongForms,
} from "../../../src/engine/index.ts";
import {
  angkaFlanked,
  buildChartTabs,
  findChartEntry,
  murdaVariant,
  pasanganString,
  rekanChar,
  sectionHasSound,
  subjoinedForm,
  type ChartSection,
  type ChartSectionId,
  type ChartStrings,
} from "../../../src/features/chart/chart-catalog.ts";
import { ak } from "../../engine/support/aksara-builder.ts";
import { loadFromPublic, loadView } from "../../support/content-files.ts";

const aksara = [
  new AksaraItem({
    id: "ha",
    name: "ha",
    category: "nglegena",
    unicodeName: "JAVANESE LETTER HA",
    latinPujl: "ha",
    latinJgst: "ha",
    audioKey: "ha",
  }),
  new AksaraItem({
    id: "na",
    name: "na",
    category: "nglegena",
    unicodeName: "JAVANESE LETTER NA",
    latinPujl: "na",
    latinJgst: "na",
    audioKey: "na",
  }),
];
const sandhangan = [
  new SandhanganItem({
    id: "wulu",
    name: "wulu (i)",
    unicodeName: "JAVANESE VOWEL SIGN WULU",
    function: "vowelChanging",
    latinPujl: "i",
    latinJgst: "i",
    audioKey: "wulu",
  }),
];

// Section titles come from the message catalog at runtime; the catalog only
// composes them, so the fixture uses recognisable stand-ins.
const strings: ChartStrings = {
  carakan: "carakan",
  sandhanganVowel: "vowel",
  sandhanganClosing: "closing",
  sandhanganConsonant: "consonant",
  sandhanganKiller: "killer",
  murda: "murda",
  swara: "swara",
  rekan: "rekan",
  angka: "angka",
  pada: "pada",
  pasangan: "pasangan",
  murdaHint: "has murda",
  writtenAs: (form) => `written ${form}`,
  longFormName: (name) => `long ${name}`,
  pasanganName: (name) => `pasangan ${name}`,
};

const kaj = rulesetById(kajRulesetId);
const pedoman = rulesetById(pedomanRulesetId);
const tabs = buildChartTabs({ aksara, sandhangan, strings, ruleset: kaj });
const sections = tabs.flatMap((t) => t.sections);
const section = (id: ChartSectionId) => {
  const found = sections.find((s) => s.id === id);
  if (found === undefined) throw new Error(`no section ${id}`);
  return found;
};

describe("chart helpers", () => {
  test("[P-C01] pasangan string is killed carrier + base (UTN47)", () => {
    expect(pasanganString("ha")).toBe(ak("KA PANGKON HA"));
  });

  test("[P-C01] murda variant comes from the engine link", () => {
    expect(murdaVariant("na", kaj)).toBe(ak("NA_MURDA"));
    expect(murdaVariant("wa", kaj)).toBeNull();
  });

  test("[P-C08] murda variant is limited to the ruleset's murda", () => {
    expect(murdaVariant("na", pedoman)).toBe(ak("NA_MURDA"));
    expect(murdaVariant("ca", pedoman)).toBeNull();
    expect(murdaVariant("ca", kaj)).toBe(ak("CA_MURDA"));
  });

  test("[P-C01] rekan char for fa is pa + cecak telu", () => {
    expect(rekanChar("fa")).toBe(ak("PA CECAK_TELU"));
  });

  test("[P-C01] angka char flanked by pada pangkat", () => {
    expect(angkaFlanked(3)).toBe(ak("PADA_PANGKAT DIGIT_THREE PADA_PANGKAT"));
  });
});

describe("chart lookups for the converter", () => {
  test("[P-U10] subjoinedForm is the UTN47 carrier + pangkon + letter", () => {
    expect(subjoinedForm(ak("LA"))).toBe(ak("KA PANGKON LA"));
  });

  test("[P-U10] findChartEntry resolves real content ids in tab order", async () => {
    const content = await loadView(kajRulesetId);
    const real = buildChartTabs({
      aksara: content.aksara,
      sandhangan: content.sandhangan,
      strings,
      ruleset: kaj,
    });
    expect(findChartEntry(real, "wulu")?.entry.id).toBe("wulu");
    expect(findChartEntry(real, "angka-1")?.entry.id).toBe("angka-1");
    expect(findChartEntry(real, "paCerek")?.entry.id).toBe("paCerek");
    const firstAi = real
      .flatMap((t) => t.sections)
      .flatMap((s) => s.entries)
      .find((entry) => entry.id === "ai");
    expect(findChartEntry(real, "ai")?.entry).toBe(firstAi);
    expect(findChartEntry(real, "nope")).toBeNull();
  });

  test("[P-C03] findChartEntry locates the tab, section and 1-based position", () => {
    const at = (id: string) => {
      const found = findChartEntry(tabs, id);
      if (found === null) throw new Error(`no location for ${id}`);
      return [found.tab.id, found.section.id, found.position];
    };
    expect(at("ha")).toEqual(["carakan", "carakan", 1]);
    expect(at("wulu")).toEqual(["sandhangan", "vowelChanging", 1]);
    expect(at("pasangan-ha")).toEqual(["pasangan", "pasangan", 1]);
    expect(at("angka-3")).toEqual(["carakan", "angka", 4]);
    expect(findChartEntry(tabs, "ha")?.entry).toBe(
      section("carakan").entries[0],
    );
    expect(findChartEntry(tabs, "nope")).toBeNull();
  });
});

describe("buildChartTabs", () => {
  test("[P-C01] three tabs: Carakan, Sandhangan, Pasangan", () => {
    expect(tabs.map((t) => t.id)).toEqual([
      "carakan",
      "sandhangan",
      "pasangan",
    ]);
    expect(tabs.map((t) => t.sections.map((s) => s.id))).toEqual([
      ["carakan", "murda", "swara", "rekan", "angka", "pada"],
      ["vowelChanging"],
      ["pasangan"],
    ]);
  });

  test("[P-C09] the Pasangan tab has one entry per nglegena letter, in order", () => {
    const entries = section("pasangan").entries;
    expect(entries).toHaveLength(20);
    expect(entries.map((e) => e.id)).toEqual(
      nglegena.map((a) => `pasangan-${a.id}`),
    );
    expect(entries[0]).toEqual({
      id: "pasangan-ha",
      name: "pasangan ha",
      tileLabel: "ha",
      char: pasanganString("ha"),
      subtitle: "ha / ha",
      reading: "ha",
    });
    for (const e of entries)
      expect(e.name, e.id).toBe(`pasangan ${e.tileLabel}`);
    // Only the Pasangan tab shortens its label; every other entry keeps its name.
    expect(
      sections
        .filter((s) => s.id !== "pasangan")
        .flatMap((s) => s.entries)
        .filter((e) => e.tileLabel !== undefined),
    ).toEqual([]);
    for (const [i, a] of nglegena.entries()) {
      expect(entries[i]?.char).toBe(pasanganString(a.id));
      expect(entries[i]?.reading).toBe(a.latinPujl);
      expect(entries[i]?.subtitle).toBe(`${a.latinPujl} / ${a.latinJgst}`);
    }
  });

  test("[P-C01] reading is the PUJL reading, null for angka and pada", () => {
    expect(section("carakan").entries[0]?.reading).toBe("ha");
    expect(section("angka").entries.every((e) => e.reading === null)).toBe(
      true,
    );
    expect(section("pada").entries.every((e) => e.reading === null)).toBe(true);
    expect(section("vowelChanging").entries[0]?.reading).toBe("i");
    expect(
      section("swara").entries.find((e) => e.id === "long-a")?.reading,
    ).toBe("aa");
    for (const id of ["murda", "swara", "rekan", "vowelChanging"] as const) {
      for (const e of section(id).entries)
        expect(e.reading, e.id).not.toBeNull();
    }
  });
});

describe("buildChartTabs entries", () => {
  test("[P-C01] every chart item has a display char", () => {
    for (const s of sections) {
      for (const entry of s.entries) expect(entry.char, entry.id).not.toBe("");
    }
  });

  test("[P-C01] sections follow the source order", () => {
    expect(sections.map((s) => s.title)).toEqual([
      "carakan",
      "murda",
      "swara",
      "rekan",
      "angka",
      "pada",
      "vowel",
      "pasangan",
    ]);
  });

  test("[P-C01] carakan lists the 20 letters with both Latin forms", () => {
    const { entries } = section("carakan");
    expect(entries).toHaveLength(20);
    expect(entries[0]).toEqual({
      id: "ha",
      name: "ha",
      char: ak("HA"),
      subtitle: "ha / ha",
      reading: "ha",
    });
  });

  test("[P-C03] a carakan letter with a murda form says so", () => {
    const na = section("carakan").entries.find((e) => e.id === "na");
    expect(na?.subtitle).toBe("na / na — has murda");
    const wa = section("carakan").entries.find((e) => e.id === "wa");
    expect(wa?.subtitle).toBe("wa / wa");
  });

  test("[P-C02] sandhangan sit on a ha carrier, never alone", () => {
    const wulu = section("vowelChanging").entries[0];
    expect(wulu?.char).toBe(ak("HA WULU"));
    expect(wulu?.subtitle).toBe("i / i");
  });

  test("[P-C01] sandhangan group by function in first-appearance order", () => {
    const fixture = [
      ["a", "closing", "syllableClosing"],
      ["b", "vowel", "vowelChanging"],
      ["c", "closing", "syllableClosing"],
      ["d", "killer", "vowelKiller"],
    ] as const;
    const grouped = buildChartTabs({
      aksara,
      strings,
      sandhangan: fixture.map(
        ([id, , fn]) =>
          new SandhanganItem({
            id,
            name: id,
            unicodeName: "JAVANESE VOWEL SIGN WULU",
            function: fn,
            latinPujl: id,
            latinJgst: id,
            audioKey: id,
          }),
      ),
      ruleset: kaj,
    });
    expect(
      grouped[1]!.sections.map((s) => [s.id, s.title, s.entries.length]),
    ).toEqual([
      ["syllableClosing", "closing", 2],
      ["vowelChanging", "vowel", 1],
      ["vowelKiller", "killer", 1],
    ]);
  });

  test("[P-C03] swara long forms are the swara letter plus tarung", () => {
    const entries = section("swara").entries;
    const long = entries.filter((e) => e.id.startsWith("long-"));
    expect(long.map((e) => [e.id, e.char])).toEqual([
      ["long-a", ak("A TARUNG")],
      ["long-u", ak("U TARUNG")],
      ["long-o", ak("O TARUNG")],
      ["long-paCerek", ak("PA_CEREK TARUNG")],
    ]);
    expect(long[0]?.name).toBe("long a");
    expect(long[0]?.subtitle).toBe("aa / ā");
  });

  test("[P-C03] angka subtitle states how the digit is written in text", () => {
    const three = section("angka").entries[3];
    expect(three).toMatchObject({
      id: "angka-3",
      char: ak("DIGIT_THREE"),
      subtitle: `written ${angkaFlanked(3)}`,
    });
    expect(section("angka").entries).toHaveLength(10);
  });

  test("[P-C03] a pada without a Latin mapping shows an em dash", () => {
    const entries = section("pada").entries;
    expect(entries.find((e) => e.id === "lingsa")?.subtitle).toBe(",");
    expect(entries.find((e) => e.id === "adeg")?.subtitle).toBe("—");
  });

  test("[P-C01] the real content yields no empty name, char or subtitle", async () => {
    const content = await loadView(kajRulesetId);
    const real = buildChartTabs({
      aksara: content.aksara,
      sandhangan: content.sandhangan,
      strings,
      ruleset: kaj,
    });
    expect(real[0]?.sections[0]?.entries).toHaveLength(20);
    for (const s of real.flatMap((t) => t.sections)) {
      for (const e of s.entries) {
        expect(e.name, e.id).not.toBe("");
        expect(e.char, e.id).not.toBe("");
        expect(e.subtitle, e.id).not.toBe("");
      }
    }
  });
});

describe("buildChartTabs per ruleset", () => {
  const sectionsOf = async (
    rulesetId: typeof kajRulesetId | typeof pedomanRulesetId,
  ) => {
    const content = contentFor(await readContent(loadFromPublic), rulesetId);
    return buildChartTabs({
      aksara: content.aksara,
      sandhangan: content.sandhangan,
      strings,
      ruleset: content.ruleset,
    }).flatMap((t) => t.sections);
  };
  const ids = (list: readonly ChartSection[], id: ChartSectionId) =>
    list.find((s) => s.id === id)?.entries.map((e) => e.id);

  test("[P-S11] only carakan, rekan and pasangan sections have a sound button", async () => {
    const seen = new Set<ChartSectionId>();
    for (const rulesetId of [pedomanRulesetId, kajRulesetId]) {
      for (const s of await sectionsOf(rulesetId)) {
        seen.add(s.id);
        expect(sectionHasSound(s.id), `${rulesetId} ${s.id}`).toBe(
          ["carakan", "rekan", "pasangan"].includes(s.id),
        );
      }
    }
    expect([...seen].sort()).toEqual(
      [
        "carakan",
        "murda",
        "swara",
        "rekan",
        "angka",
        "pada",
        "vowelChanging",
        "syllableClosing",
        "consonantModifying",
        "vowelKiller",
        "pasangan",
      ].sort(),
    );
  });

  test("[P-C08] a Pedoman view lists 7 murda, 7 swara and 5 rekan", async () => {
    const real = await sectionsOf(pedomanRulesetId);
    expect(ids(real, "murda")).toEqual([
      "naMurda",
      "kaMurda",
      "taMurda",
      "saMurda",
      "paMurda",
      "gaMurda",
      "baMurda",
    ]);
    expect(ids(real, "swara")).toEqual([
      "a",
      "i",
      "u",
      "e",
      "o",
      "paCerek",
      "ngaLelet",
    ]);
    const rekanSection = real.find((s) => s.id === "rekan")!;
    expect(rekanSection.entries.map((e) => e.id)).toEqual([
      "kha",
      "dza",
      "fa",
      "za",
      "gha",
    ]);
    expect(rekanSection.entries.map((e) => e.char)).toEqual([
      ak("KA CECAK_TELU"),
      ak("DA CECAK_TELU"),
      ak("PA CECAK_TELU"),
      ak("JA CECAK_TELU"),
      ak("GA CECAK_TELU"),
    ]);
    expect(rekanSection.entries[2]?.subtitle).toBe("fa/va / fa");
  });

  test("[P-C08] the murda hint follows the ruleset's murda", async () => {
    const hint = async (
      rulesetId: typeof kajRulesetId | typeof pedomanRulesetId,
    ) => {
      const carakan = (await sectionsOf(rulesetId))[0]!;
      return Object.fromEntries(
        ["nya", "ca", "ja", "ra", "ka"].map((id) => [
          id,
          carakan.entries
            .find((e) => e.id === id)!
            .subtitle.includes("has murda"),
        ]),
      );
    };
    expect(await hint(pedomanRulesetId)).toEqual({
      nya: false,
      ca: false,
      ja: false,
      ra: false,
      ka: true,
    });
    expect(await hint(kajRulesetId)).toEqual({
      nya: true,
      ca: true,
      ja: true,
      ra: true,
      ka: true,
    });
  });

  test("[P-C08] the KAJ view is today's chart", async () => {
    const real = await sectionsOf(kajRulesetId);
    expect(ids(real, "murda")).toEqual(murdaLinks.map((m) => m.aksara.id));
    expect(ids(real, "swara")).toEqual([
      ...swara.map((s) => s.id),
      ...[...swaraLongForms.values()].map((f) => `long-${f.baseId}`),
      ...swaraCatalogue.map((s) => s.id),
    ]);
    expect(ids(real, "rekan")).toEqual(rekan.map((r) => r.id));
  });
});
