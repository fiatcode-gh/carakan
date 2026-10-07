import { describe, expect, test } from "vitest";
import { chartStrings } from "../../../src/features/chart/chart-strings.ts";

const t = (key: string, params?: Record<string, string | number>) =>
  params === undefined ? key : `${key}:${JSON.stringify(params)}`;

describe("chartStrings", () => {
  test("[P-U10] maps every ChartStrings field to its message key", () => {
    const strings = chartStrings(t as Parameters<typeof chartStrings>[0]);
    expect({
      carakan: strings.carakan,
      sandhanganVowel: strings.sandhanganVowel,
      sandhanganClosing: strings.sandhanganClosing,
      sandhanganConsonant: strings.sandhanganConsonant,
      sandhanganKiller: strings.sandhanganKiller,
      murda: strings.murda,
      swara: strings.swara,
      rekan: strings.rekan,
      angka: strings.angka,
      pada: strings.pada,
      murdaHint: strings.murdaHint,
      writtenAs: strings.writtenAs("F"),
      longFormName: strings.longFormName("N"),
    }).toEqual({
      carakan: "sectionCarakan",
      sandhanganVowel: "sectionSandhanganVowel",
      sandhanganClosing: "sectionSandhanganClosing",
      sandhanganConsonant: "sectionSandhanganConsonant",
      sandhanganKiller: "sectionSandhanganKiller",
      murda: "sectionMurda",
      swara: "sectionSwara",
      rekan: "sectionRekan",
      angka: "sectionAngka",
      pada: "sectionPada",
      murdaHint: "murdaHint",
      writtenAs: 'writtenAs:{"form":"F"}',
      longFormName: 'longFormName:{"name":"N"}',
    });
  });
});
