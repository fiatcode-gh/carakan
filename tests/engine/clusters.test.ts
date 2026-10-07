import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  javaneseCodepoints,
  toAksara,
  type TextSpan,
  type ToAksaraSuccess,
} from "../../src/engine/index.ts";
import { ak } from "./support/aksara-builder.ts";
import { lcg, randomStrings } from "./support/random-input.ts";

const names = Object.entries(javaneseCodepoints);
const starters = new Set(
  names
    .filter(([n]) => /^JAVANESE (LETTER|DIGIT|PADA) /.test(n))
    .map(([, cp]) => cp),
);
const letters = new Set(
  names.filter(([n]) => n.startsWith("JAVANESE LETTER ")).map(([, cp]) => cp),
);
const pangkon = javaneseCodepoints["JAVANESE PANGKON"]!;
const pangkat = ak("PANGKAT");
const swaraA = ak("A");

const startsCluster = (text: string, i: number): boolean => {
  const cu = text.charCodeAt(i);
  return (
    starters.has(cu) &&
    !(letters.has(cu) && i > 0 && text.charCodeAt(i - 1) === pangkon)
  );
};

/** Structural invariants every success (and ambiguous candidate) must hold. */
function checkInvariants(input: string, s: ToAksaraSuccess): void {
  const { output, clusters } = s;
  let at = 0;
  const covered = new Set<number>();
  const pangkatCovered = new Set<number>();
  for (const [ci, c] of clusters.entries()) {
    expect(c.output.start).toBe(at);
    expect(c.output.end).toBeGreaterThan(c.output.start);
    at = c.output.end;
    expect(startsCluster(output, c.output.start)).toBe(true);
    expect(c.sources.length).toBeGreaterThan(0);
    for (let i = c.output.start + 1; i < c.output.end; i++) {
      expect(startsCluster(output, i)).toBe(false);
    }
    let prevEnd = -1;
    for (const src of c.sources) {
      expect(src.end).toBeGreaterThan(src.start);
      expect(src.start).toBeGreaterThan(prevEnd); // sorted, disjoint, non-adjacent
      expect(src.start).toBeGreaterThanOrEqual(0);
      expect(src.end).toBeLessThanOrEqual(input.length);
      prevEnd = src.end;
      expect(input.slice(src.start, src.end)).not.toContain(" ");
    }
    const isPangkat = output.slice(c.output.start, c.output.end) === pangkat;
    // A lone ā after a synthetic onset (ha carrier or glide) writes that
    // onset (possibly joined to a pasangan) plus a swara A; the swara A
    // cluster overlaps the ā span its predecessor already carries.
    const prev = clusters[ci - 1];
    const sharesLoneA =
      prev !== undefined &&
      output.startsWith(swaraA, c.output.start) &&
      c.sources.some((a) =>
        prev.sources.some((b) => a.start < b.end && b.start < a.end),
      );
    if (!isPangkat) {
      for (const src of c.sources) {
        for (let i = src.start; i < src.end; i++) {
          const inPrev =
            sharesLoneA && prev.sources.some((b) => i >= b.start && i < b.end);
          if (!inPrev) expect(covered.has(i), input).toBe(false);
          covered.add(i);
        }
      }
    } else {
      for (const src of c.sources) {
        for (let i = src.start; i < src.end; i++) pangkatCovered.add(i);
      }
    }
  }
  expect(at).toBe(output.length);
  // Baseline engine behaviour (output frozen by the differential): a sigeg
  // marker (ṙ ŋ ḥ) that does not directly close a vowel (word-initial or
  // after a consonant) silently drops the rest of its word, so those letters
  // have no cluster.
  const droppedByEngine = /(?<![aeiouěéèêāīū])[ṙŋḥ]/iu.test(input);
  for (let i = 0; i < input.length && !droppedByEngine; i++) {
    if (input[i] !== " ") {
      expect(covered.has(i) || pangkatCovered.has(i), `${input}[${i}]`).toBe(
        true,
      );
    }
  }
}

function checkResult(input: string, useMurda: boolean): void {
  const r = toAksara(input, { useMurda });
  if (r.kind === "success") checkInvariants(input, r);
  else if (r.kind === "ambiguous") {
    for (const c of r.candidates) checkInvariants(input, c);
  }
}

type Golden = [spec: string, source: string];

function readable(input: string, s: ToAksaraSuccess): Golden[] {
  return s.clusters.map((c) => [
    c.output.start === c.output.end
      ? ""
      : s.output.slice(c.output.start, c.output.end),
    c.sources.map((x: TextSpan) => input.slice(x.start, x.end)).join("|"),
  ]);
}

const expected = (rows: [string, string][]): Golden[] =>
  rows.map(([spec, src]) => [ak(spec), src]);

function success(input: string, useMurda = false): ToAksaraSuccess {
  const r = toAksara(input, { useMurda });
  if (r.kind !== "success") throw new Error(`${input}: ${r.kind}`);
  return r;
}

const golden: [string, boolean, [string, string][]][] = [
  [
    "kita",
    false,
    [
      ["KA WULU", "ki"],
      ["TA", "ta"],
    ],
  ],
  [
    "bapak lunga",
    false,
    [
      ["BA", "ba"],
      ["PA", "pa"],
      ["KA PANGKON LA SUKU", "k|lu"],
      ["NGA", "nga"],
    ],
  ],
  [
    "saté",
    false,
    [
      ["SA", "sa"],
      ["TA TALING", "té"],
    ],
  ],
  [
    "toko",
    false,
    [
      ["TA TALING TARUNG", "to"],
      ["KA TALING TARUNG", "ko"],
    ],
  ],
  [
    "bapak lombok",
    false,
    [
      ["BA", "ba"],
      ["PA", "pa"],
      ["KA PANGKON LA TALING TARUNG", "k|lo"],
      ["MA PANGKON BA TALING TARUNG", "mbo"],
      ["KA PANGKON", "k"],
    ],
  ],
  [
    "Paku Alam",
    true,
    [
      ["PA_MURDA", "Pa"],
      ["KA_MURDA SUKU", "ku"],
      ["A", "A"],
      ["LA", "la"],
      ["MA PANGKON", "m"],
    ],
  ],
  [
    "foto",
    false,
    [
      ["PA CECAK_TELU TALING TARUNG", "fo"],
      ["TA TALING TARUNG", "to"],
    ],
  ],
  [
    "vas",
    false,
    [
      ["WA CECAK_TELU", "va"],
      ["SA PANGKON", "s"],
    ],
  ],
  [
    "bapak foto",
    false,
    [
      ["BA", "ba"],
      ["PA", "pa"],
      ["KA PANGKON PA CECAK_TELU TALING TARUNG", "k|fo"],
      ["TA TALING TARUNG", "to"],
    ],
  ],
  [
    "ibu lunga, bapak 1945.",
    false,
    [
      ["HA WULU", "i"],
      ["BA SUKU", "bu"],
      ["LA SUKU", "lu"],
      ["NGA", "nga"],
      ["LINGSA", ","],
      ["BA", "ba"],
      ["PA", "pa"],
      ["KA PANGKON", "k"],
      ["PANGKAT", "1945"],
      ["DIGIT_ONE", "1"],
      ["DIGIT_NINE", "9"],
      ["DIGIT_FOUR", "4"],
      ["DIGIT_FIVE", "5"],
      ["PANGKAT", "1945"],
      ["LUNGSI", "."],
    ],
  ],
  [
    "bapak, ibu.",
    false,
    [
      ["BA", "ba"],
      ["PA", "pa"],
      ["KA PANGKON ZWNJ", "k,"],
      ["HA WULU", "i"],
      ["BA SUKU", "bu"],
      ["LUNGSI", "."],
    ],
  ],
  [
    "bapak,",
    false,
    [
      ["BA", "ba"],
      ["PA", "pa"],
      ["KA PANGKON", "k,"],
    ],
  ],
  [
    "bapak/,",
    false,
    [
      ["BA", "ba"],
      ["PA", "pa"],
      ["KA PANGKON", "k/,"],
    ],
  ],
  [
    "bapak.",
    false,
    [
      ["BA", "ba"],
      ["PA", "pa"],
      ["KA PANGKON", "k"],
      ["LINGSA", "."],
    ],
  ],
  [
    "bapak/hibu",
    false,
    [
      ["BA", "ba"],
      ["PA", "pa"],
      ["KA PANGKON ZWNJ", "k/"],
      ["HA WULU", "hi"],
      ["BA SUKU", "bu"],
    ],
  ],
  [
    "sěk/lěk",
    false,
    [
      ["SA PEPET", "sě"],
      ["KA PANGKON ZWNJ", "k/"],
      ["NGA_LELET", "lě"],
      ["KA PANGKON", "k"],
    ],
  ],
  [
    "pak Airlangga",
    false,
    [
      ["PA", "pa"],
      ["KA PANGKON AI LAYAR", "k|Air"],
      ["LA CECAK", "lang"],
      ["GA", "ga"],
    ],
  ],
  [
    "lunga Ibu",
    false,
    [
      ["LA SUKU", "lu"],
      ["NGA", "nga"],
      ["I", "I"],
      ["BA SUKU", "bu"],
    ],
  ],
  [
    "aku",
    false,
    [
      ["HA", "a"],
      ["KA SUKU", "ku"],
    ],
  ],
  [
    "dian",
    false,
    [
      ["DA WULU", "di"],
      ["YA", "a"],
      ["NA PANGKON", "n"],
    ],
  ],
  [
    "maaf",
    false,
    [
      ["MA", "ma"],
      ["A", "a"],
      ["PA CECAK_TELU PANGKON", "f"],
    ],
  ],
  [
    "mā",
    false,
    [
      ["MA", "m"],
      ["A", "ā"],
    ],
  ],
  [
    "ṛsi",
    false,
    [
      ["PA_CEREK", "ṛ"],
      ["SA WULU", "si"],
    ],
  ],
  [
    "kṛtěg",
    false,
    [
      ["KA KERET", "kṛ"],
      ["TA PEPET", "tě"],
      ["GA PANGKON", "g"],
    ],
  ],
  [
    "kŕaton",
    false,
    [
      ["KA CAKRA", "kŕa"],
      ["TA TALING TARUNG", "to"],
      ["NA PANGKON", "n"],
    ],
  ],
  [
    "klapa",
    false,
    [
      ["KA PANGKON LA", "kla"],
      ["PA", "pa"],
    ],
  ],
  [
    "pantai",
    false,
    [
      ["PA", "pa"],
      ["NA PANGKON TA DIRGA_MURE", "ntai"],
    ],
  ],
  [
    "ā",
    false,
    [
      ["HA", "ā"],
      ["A", "ā"],
    ],
  ],
  [
    "āku",
    false,
    [
      ["HA", "ā"],
      ["A", "ā"],
      ["KA SUKU", "ku"],
    ],
  ],
  [
    "oā",
    false,
    [
      ["HA TALING TARUNG", "o"],
      ["WA", "ā"],
      ["A", "ā"],
    ],
  ],
];

describe("[P-D06] engine reports output clusters", () => {
  test.each(golden)("[P-D06] %s (murda %s)", (input, useMurda, rows) => {
    const s = success(input, useMurda);
    expect(readable(input, s)).toEqual(expected(rows));
  });

  test("[P-D06] sources are numeric input offsets", () => {
    const s = success("bapak lunga");
    expect(s.clusters[2]!.sources).toEqual([
      { start: 4, end: 5 },
      { start: 6, end: 8 },
    ]);
  });

  test("[P-D06] offsets are relative to the exact argument, leading spaces included", () => {
    const s = success("  kita");
    expect(s.clusters.map((c) => c.sources)).toEqual([
      [{ start: 2, end: 4 }],
      [{ start: 4, end: 6 }],
    ]);
  });

  test("[P-D06] empty output has no clusters", () => {
    const s = success(" ");
    expect(s.output).toBe("");
    expect(s.clusters).toEqual([]);
  });

  test("[P-D06] prelu reports clusters for both ambiguous candidates", () => {
    const r = toAksara("prelu");
    if (r.kind !== "ambiguous") throw new Error(r.kind);
    expect(r.candidates.map((c) => readable("prelu", c))).toEqual([
      expected([
        ["PA KERET", "pre"],
        ["LA SUKU", "lu"],
      ]),
      expected([
        ["PA CAKRA TALING", "pre"],
        ["LA SUKU", "lu"],
      ]),
    ]);
  });

  test("[P-D06] invariants hold for every Dart fixture success and candidate", () => {
    interface Fixture {
      toAksara: [string, boolean, [string, ...unknown[]]][];
    }
    const fixture = JSON.parse(
      readFileSync(
        new URL("./fixtures/dart-ebc7cb5.json", import.meta.url).pathname,
        "utf8",
      ),
    ) as Fixture;
    let checked = 0;
    for (const [input, useMurda, rec] of fixture.toAksara) {
      if (rec[0] !== "s" && rec[0] !== "a") continue;
      checkResult(input, useMurda);
      checked++;
    }
    expect(checked).toBeGreaterThan(1000);
  });

  test("[P-D06] invariants hold for 5,000 seeded random inputs", () => {
    const rand = lcg(0xc1057e5);
    const alphabet = [
      ...("abcdeghijklmnoprstuwy" + "ŕỿṛṙŋḥěéèêāīūḍṭñṅ" + " /,.AEŔ0"),
    ];
    let successes = 0;
    for (const input of randomStrings(rand, alphabet, 5_000)) {
      for (const useMurda of [false, true]) {
        checkResult(input, useMurda);
        if (toAksara(input, { useMurda }).kind !== "error") successes++;
      }
    }
    expect(successes).toBeGreaterThan(500);
  });
});
