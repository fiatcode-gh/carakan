import { describe, expect, test } from "vitest";
import { AksaraItem } from "../../../src/content/aksara-item.ts";
import { loadContent } from "../../../src/content/content-repository.ts";
import { SandhanganItem } from "../../../src/content/sandhangan-item.ts";
import {
  angkaFlanked,
  buildChartSections,
  findChartEntry,
  murdaVariant,
  pasanganString,
  rekanChar,
  subjoinedForm,
  type ChartStrings,
} from "../../../src/features/chart/chart-catalog.ts";
import { ak } from "../../engine/support/aksara-builder.ts";
import { loadFromPublic } from "../../support/content-files.ts";

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
  murdaHint: "has murda",
  writtenAs: (form) => `written ${form}`,
  longFormName: (name) => `long ${name}`,
};

const sections = buildChartSections({ aksara, sandhangan, strings });
const section = (title: string) => {
  const found = sections.find((s) => s.title === title);
  if (found === undefined) throw new Error(`no section ${title}`);
  return found;
};

describe("chart helpers", () => {
  test("[P-C01] pasangan string is killed carrier + base (UTN47)", () => {
    expect(pasanganString("ha")).toBe(ak("KA PANGKON HA"));
  });

  test("[P-C01] murda variant comes from the engine link", () => {
    expect(murdaVariant("na")).toBe(ak("NA_MURDA"));
    expect(murdaVariant("wa")).toBeNull();
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

  test("[P-U10] findChartEntry resolves real content ids in section order", async () => {
    const content = await loadContent(loadFromPublic);
    const real = buildChartSections({
      aksara: content.aksara,
      sandhangan: content.sandhangan,
      strings,
    });
    expect(findChartEntry(real, "wulu")?.id).toBe("wulu");
    expect(findChartEntry(real, "angka-1")?.id).toBe("angka-1");
    expect(findChartEntry(real, "paCerek")?.id).toBe("paCerek");
    const firstAi = real
      .flatMap((s) => s.entries)
      .find((entry) => entry.id === "ai");
    expect(findChartEntry(real, "ai")).toBe(firstAi);
    expect(findChartEntry(real, "nope")).toBeNull();
  });
});

describe("buildChartSections", () => {
  test("[P-C01] every chart item has a display char", () => {
    for (const s of sections) {
      for (const entry of s.entries) expect(entry.char, entry.id).not.toBe("");
    }
  });

  test("[P-C01] sections follow the source order", () => {
    expect(sections.map((s) => s.title)).toEqual([
      "carakan",
      "vowel",
      "murda",
      "swara",
      "rekan",
      "angka",
      "pada",
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
    });
  });

  test("[P-C03] a carakan letter with a murda form says so", () => {
    const na = section("carakan").entries.find((e) => e.id === "na");
    expect(na?.subtitle).toBe("na / na — has murda");
    const wa = section("carakan").entries.find((e) => e.id === "wa");
    expect(wa?.subtitle).toBe("wa / wa");
  });

  test("[P-C02] sandhangan sit on a ha carrier, never alone", () => {
    const wulu = section("vowel").entries[0];
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
    const grouped = buildChartSections({
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
    });
    expect(grouped.slice(1, 4).map((s) => [s.title, s.entries.length])).toEqual(
      [
        ["closing", 2],
        ["vowel", 1],
        ["killer", 1],
      ],
    );
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
    const content = await loadContent(loadFromPublic);
    const real = buildChartSections({
      aksara: content.aksara,
      sandhangan: content.sandhangan,
      strings,
    });
    expect(real[0]?.entries).toHaveLength(20);
    for (const s of real) {
      for (const e of s.entries) {
        expect(e.name, e.id).not.toBe("");
        expect(e.char, e.id).not.toBe("");
        expect(e.subtitle, e.id).not.toBe("");
      }
    }
  });
});
