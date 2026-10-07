import { readFileSync } from "node:fs";
import { beforeAll, describe, expect, test } from "vitest";
import type { ContentData } from "../../../src/content/content-repository.ts";
import { loadContent } from "../../../src/content/content-repository.ts";
import {
  toAksara,
  type AksaraCluster,
  type ToAksaraSuccess,
} from "../../../src/engine/index.ts";
import {
  buildChartSections,
  findChartEntry,
  type ChartStrings,
} from "../../../src/features/chart/chart-catalog.ts";
import {
  ClusterPartTable,
  clusterReading,
} from "../../../src/features/converter/cluster-parts.ts";
import { ak } from "../../engine/support/aksara-builder.ts";
import { loadFromPublic } from "../../support/content-files.ts";

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
  murdaHint: "hint",
  writtenAs: (form) => form,
  longFormName: (name) => name,
};

let content: ContentData;
let table: ClusterPartTable;

beforeAll(async () => {
  content = await loadContent(loadFromPublic);
  table = ClusterPartTable.build(content);
});

function success(input: string, useMurda = false): ToAksaraSuccess {
  const r = toAksara(input, { useMurda });
  if (r.kind !== "success") throw new Error(`not a success: ${input}`);
  return r;
}

function clusterText(r: ToAksaraSuccess, c: AksaraCluster): string {
  return r.output.slice(c.output.start, c.output.end);
}

/** `(name, sound, chartId, subjoined)` of the parts of cluster `index`. */
function parts(input: string, index: number, useMurda = false) {
  const r = success(input, useMurda);
  return table.partsOf(clusterText(r, r.clusters[index]!));
}

function partsOfText(input: string, text: string) {
  const r = success(input);
  const c = r.clusters.find((cl) => clusterText(r, cl) === text);
  if (c === undefined) throw new Error(`no cluster ${text} in ${input}`);
  return table.partsOf(text);
}

const row = (p: {
  name: string;
  sound: string;
  chartId: string | null;
  subjoined: boolean;
}) => [p.name, p.sound, p.chartId, p.subjoined];

const KA = ["ka", "ka", "ka", false] as const;

describe("ClusterPartTable.partsOf", () => {
  test("[P-U10] kita: ka + wulu", () => {
    const p = parts("kita", 0);
    expect(p.map(row)).toEqual([KA, ["wulu (i)", "i", "wulu", false]]);
    expect(p.map((x) => x.char)).toEqual([ak("KA"), ak("HA WULU")]);
  });

  test("[P-U10] pasangan: bapak lunga #2 is ka + subjoined la + suku", () => {
    const p = parts("bapak lunga", 2);
    expect(p.map(row)).toEqual([
      KA,
      ["la", "la", "la", true],
      ["suku (u)", "u", "suku", false],
    ]);
    expect(p.map((x) => x.char)).toEqual([
      ak("KA"),
      ak("KA PANGKON LA"),
      ak("HA SUKU"),
    ]);
  });

  test("[P-U10] subjoined rekan and its taling tarung o", () => {
    const p = parts("bapak foto", 2);
    expect(p.map(row)).toEqual([
      KA,
      ["fa", "fa", "fa", true],
      ["taling tarung", "o", null, false],
    ]);
    expect(p[1]!.char).toBe(ak("KA PANGKON PA CECAK_TELU"));
    expect(p[2]!.char).toBe(ak("HA TALING TARUNG"));
  });

  test("[P-U10] foto #0 begins with an unsubjoined rekan", () => {
    const p = parts("foto", 0);
    expect(p.map(row)).toEqual([
      ["fa", "fa", "fa", false],
      ["taling tarung", "o", null, false],
    ]);
    expect(p[0]!.char).toBe(ak("PA CECAK_TELU"));
  });

  test("[P-U10] a lone tarung after a base keeps its long-a reading", () => {
    expect(table.partsOf(ak("KA TARUNG")).map(row)).toEqual([
      KA,
      ["tarung (panjang)", "aa", "tarung", false],
    ]);
  });

  test("[P-U10] a swara au (letter o + tarung) is the au rekan", () => {
    const r = success("ka Aula");
    const c = r.clusters.find((cl) => clusterText(r, cl).startsWith(ak("O")));
    expect(c).toBeDefined();
    const p = table.partsOf(clusterText(r, c!));
    expect(p.map(row)[0]).toEqual(["au", "au", "au", false]);
    expect(p[0]!.char).toBe(ak("O TARUNG"));
  });

  test("[P-U10] a final pangkon is the pangkon sandhangan", () => {
    const p = parts("bapak", 2);
    expect(p.map(row)).toEqual([
      KA,
      ["pangkon (pemati)", "", "pangkon", false],
    ]);
    expect(p[1]!.char).toBe(ak("HA PANGKON"));
  });

  test("[P-U10] the ZWNJ after a comma pangkon is skipped", () => {
    expect(parts("bapak, ibu.", 2).map(row)).toEqual([
      KA,
      ["pangkon (pemati)", "", "pangkon", false],
    ]);
  });

  test("[P-U10] a digit is its angka item", () => {
    const p = partsOfText("bapak 17", ak("DIGIT_ONE"));
    expect(p.map(row)).toEqual([["angka 1", "1", "angka-1", false]]);
    expect(p[0]!.char).toBe(ak("DIGIT_ONE"));
  });

  test("[P-U10] pada pangkat has no content: a fallback part", () => {
    const p = partsOfText("bapak 17", ak("PANGKAT"));
    expect(p.map(row)).toEqual([["pada pangkat", "", null, false]]);
    expect(p[0]!.char).toBe(ak("PANGKAT"));
  });

  test("[P-U10] pada lingsa is a content item", () => {
    const p = partsOfText("lunga, ibu", ak("LINGSA"));
    expect(p.map(row)).toEqual([["pada lingsa (,)", ",", "lingsa", false]]);
    expect(p[0]!.char).toBe(ak("LINGSA"));
  });

  test("[P-U10] dirga mure alone reads ai, on a ha carrier", () => {
    const p = parts("pantai", 1);
    expect(p.map(row)).toEqual([
      ["na", "na", "na", false],
      ["ta", "ta", "ta", true],
      ["dirga mure", "ai", null, false],
    ]);
    expect(p[2]!.char).toBe(ak("HA DIRGA_MURE"));
  });

  test("[P-U10] dirga mure with tarung is one au part, not tarung's aa", () => {
    const p = parts("sinau", 1);
    expect(p.map(row)).toEqual([
      ["na", "na", "na", false],
      ["dirga mure tarung", "au", null, false],
    ]);
    expect(p[1]!.char).toBe(ak("HA DIRGA_MURE TARUNG"));
  });

  test("[P-U10] wulu melik is a fallback on a ha carrier", () => {
    const p = parts("kii", 0);
    expect(p.map(row)).toEqual([KA, ["wulu melik", "", null, false]]);
    expect(p[1]!.char).toBe(ak("HA WULU_MELIK"));
  });

  test("[P-U10] a subjoined swara letter and a layar", () => {
    const p = parts("pak Airlangga", 1);
    expect(p.map(row)).toEqual([
      KA,
      ["ai", "ai", "ai", true],
      ["layar (-r)", expect.any(String), "layar", false],
    ]);
    expect(p[1]!.char).toBe(ak("KA PANGKON AI"));
  });

  test("[P-U10] pa cerek, ha and pa murda use their content items", () => {
    expect(parts("ṛsi", 0).map(row)).toEqual([
      ["pa cerek (rě)", "re", "paCerek", false],
    ]);
    expect(parts("aku", 0).map(row)).toEqual([["ha", "ha", "ha", false]]);
    const murda = content.aksara.find((a) => a.id === "paMurda")!;
    expect(parts("Paku Alam", 0, true).map(row)).toEqual([
      [murda.name, murda.latinPujl ?? "", "paMurda", false],
    ]);
  });
});

describe("clusterReading", () => {
  test("[P-U10] joins the source ranges without separators", () => {
    const r = success("bapak lunga");
    expect(clusterReading("bapak lunga", r.clusters[2]!)).toBe("klu");
  });

  test("[P-U10] a trailing comma reads as k,", () => {
    const r = success("bapak,");
    expect(clusterReading("bapak,", r.clusters.at(-1)!)).toBe("k,");
  });
});

describe("fixture sweep", () => {
  test("[P-U10] every cluster of every Dart fixture result has resolvable parts", () => {
    const sections = buildChartSections({
      aksara: content.aksara,
      sandhangan: content.sandhangan,
      strings,
    });
    const fixture = JSON.parse(
      readFileSync(
        new URL("../../engine/fixtures/dart-ebc7cb5.json", import.meta.url)
          .pathname,
        "utf8",
      ),
    ) as { toAksara: [string, boolean, [string, ...unknown[]]][] };
    let clusters = 0;
    for (const [input, useMurda, rec] of fixture.toAksara) {
      if (rec[0] !== "s" && rec[0] !== "a") continue;
      const r = toAksara(input, { useMurda });
      const results =
        r.kind === "success" ? [r] : r.kind === "ambiguous" ? r.candidates : [];
      for (const result of results) {
        for (const c of result.clusters) {
          const ps = table.partsOf(clusterText(result, c));
          expect(ps.length, input).toBeGreaterThan(0);
          for (const p of ps) {
            expect(p.name, input).not.toBe("");
            expect(p.char, input).not.toBe("");
            if (p.chartId !== null) {
              expect(
                findChartEntry(sections, p.chartId),
                p.chartId,
              ).not.toBeNull();
            }
          }
          clusters++;
        }
      }
    }
    expect(clusters).toBeGreaterThan(1000);
  });
});
