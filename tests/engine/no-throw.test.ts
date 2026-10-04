import { describe, expect, test } from "vitest";
import {
  javaneseCodepoints,
  toAksara,
  toLatin,
} from "../../src/engine/index.ts";

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

function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

function randomStrings(
  rand: () => number,
  alphabet: readonly string[],
  count: number,
): string[] {
  const out: string[] = [];
  for (let n = 0; n < count; n++) {
    const len = 1 + Math.floor(rand() * 8);
    let s = "";
    for (let k = 0; k < len; k++) {
      s += alphabet[Math.floor(rand() * alphabet.length)]!;
    }
    out.push(s);
  }
  return out;
}

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
