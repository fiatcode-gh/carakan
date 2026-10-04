import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  murdaLinks,
  nglegena,
  rekan,
  sandhangan,
  swara,
  swaraCatalogue,
} from "../../src/engine/index.ts";
import {
  computeGlyphSet,
  isExcluded,
  renderGlyphSet,
} from "../../tools/fonts/glyphset.ts";

const set = new Set(computeGlyphSet());

type Fixture = { toLatin: [string, string, [string, string?]][] };
const fixture: Fixture = JSON.parse(
  readFileSync("tests/engine/fixtures/dart-ebc7cb5.json", "utf8"),
);

function missing(texts: Iterable<string>): string[] {
  const out: string[] = [];
  for (const text of texts) {
    for (const ch of text) {
      const cp = ch.codePointAt(0)!;
      if (!isExcluded(cp) && !set.has(cp)) out.push(`U+${cp.toString(16)}`);
    }
  }
  return out;
}

describe("[P-D09] UI glyph set", () => {
  test("matches the committed fonts/glyphset.txt (run npm run fonts)", () => {
    const committed = readFileSync("fonts/glyphset.txt", "utf8");
    expect(
      renderGlyphSet([...set]),
      "fonts/glyphset.txt is stale: run npm run fonts",
    ).toBe(committed);
  });

  test("covers every Latin form the engine catalogs carry", () => {
    const entries = [
      ...nglegena,
      ...murdaLinks.map((l) => l.aksara),
      ...swara,
      ...swaraCatalogue,
      ...rekan,
      ...sandhangan,
    ];
    const texts = entries.flatMap((e) => [e.latinPujl, e.latinJgst]);
    expect(missing(texts)).toEqual([]);
  });

  test("covers every toLatin success output in the Dart fixture", () => {
    const texts = fixture.toLatin
      .filter(([, , r]) => r[0] === "s")
      .map(([, , r]) => r[1]!);
    expect(texts.length).toBeGreaterThan(1000);
    expect(missing(texts)).toEqual([]);
  });

  test("includes the JGST dot-below consonants", () => {
    expect(set.has(0x1e0d)).toBe(true); // ḍ
  });

  test("contains no excluded code point", () => {
    const bad = [...set].filter(
      (cp) =>
        cp < 0x20 ||
        (cp >= 0x7f && cp <= 0x9f) ||
        (cp >= 0xa980 && cp <= 0xa9df) ||
        cp === 0x200c ||
        cp === 0x200d ||
        cp === 0x25cc ||
        cp === 0xfe0f ||
        /\p{Extended_Pictographic}/u.test(String.fromCodePoint(cp)),
    );
    expect(bad).toEqual([]);
  });
});
