import { describe, expect, test } from "vitest";
import {
  javaneseCodepoints,
  toAksara,
  toLatin,
} from "../../src/engine/index.ts";
import { lcg, randomStrings } from "./support/random-input.ts";

const MESSAGE = "Cluster marker cannot close a syllable";

// Cluster markers (cakra ŕ, pengkal ỿ, cerek ṛ) carry no aksara of their own,
// so one that would close a syllable is an error, not a crash.
const markerCodas: [input: string, marker: string][] = [
  ["kaŕ", "ŕ"],
  ["raỿ", "ỿ"],
  ["kaṛ", "ṛ"],
  ["kaŕ ba", "ŕ"],
  ["kaŕ, ba", "ŕ"],
  ["kaŕ/", "ŕ"],
  ["kaỿ.", "ỿ"],
  ["kŕaŕ", "ŕ"],
  ["néŕ", "ŕ"],
  ["Eṛ", "ṛ"],
  ["tieỿ", "ỿ"],
];

describe("[P-D02] engine never throws", () => {
  describe.each([false, true])("useMurda %s", (useMurda) => {
    test.each(markerCodas)(
      "%s: a cluster marker coda is an error at the marker",
      (input, marker) => {
        const r = toAksara(input, { useMurda });
        expect(r).toMatchObject({
          kind: "error",
          message: MESSAGE,
          index: input.lastIndexOf(marker),
        });
      },
    );
  });

  // 140,000 conversions take about 2.5 s locally and over 5 s (Vitest's
  // default) on GitHub's runners; the work is fixed, so allow for slow hosts.
  test("toAksara and toLatin never throw on seeded random input", () => {
    const rand = lcg(0x5eed);
    const latin = [
      ...("abcdeghijklmnoprstuwy" + "ŕỿṛṙŋḥěéèêāīūḍṭñṅ" + " /,.AEŔ0"),
    ];
    const latinInputs = randomStrings(rand, latin, 50_000);
    expect(latinInputs).toHaveLength(50_000);
    for (const input of latinInputs) {
      for (const useMurda of [false, true]) {
        expect(() => toAksara(input, { useMurda })).not.toThrow();
      }
    }

    const aksara = [
      ...Object.values(javaneseCodepoints).map((cp) =>
        String.fromCodePoint(cp),
      ),
      "\u200C",
      "a",
      " ",
    ];
    const aksaraInputs = randomStrings(rand, aksara, 20_000);
    expect(aksaraInputs).toHaveLength(20_000);
    for (const input of aksaraInputs) {
      for (const scheme of ["pujl", "jgst"] as const) {
        expect(() => toLatin(input, { scheme })).not.toThrow();
      }
    }
  }, 30_000);
});
