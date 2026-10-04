import { describe, expect, test } from "vitest";
import { toAksara, toLatin } from "../../src/engine/index.ts";
import { goldenPairs } from "./golden-pairs.ts";
import { ak } from "./support/aksara-builder.ts";

function aksara(latin: string): string {
  const r = toAksara(latin);
  if (r.kind !== "success")
    throw new Error(`expected ConvertSuccess, got ${r.kind}`);
  return r.output;
}

function latin(text: string): string {
  const r = toLatin(text, { scheme: "jgst" });
  if (r.kind !== "success")
    throw new Error(`expected ConvertSuccess, got ${r.kind}`);
  return r.output;
}

describe("[P-D01] v3-storage-order", () => {
  // KAJ I p.12 (sandhangan swara table); Unicode ch.17: vowel signs follow
  // the base, the shaper draws taling before it.
  describe("toAksara stores taling after its base", () => {
    const cases: Record<string, string> = {
      saté: "SA TA TALING",
      toko: "TA TALING TARUNG KA TALING TARUNG",
      rawon: "RA WA TALING TARUNG NA PANGKON",
      "lombok/": "LA TALING TARUNG MA PANGKON BA TALING TARUNG KA PANGKON",
      // The taling belongs to ta, drawn before it: "kraton".
      "kŕaton/": "KA CAKRA TA TALING TARUNG NA PANGKON",
      mènèk: "MA TALING NA TALING KA PANGKON",
    };
    for (const [input, spec] of Object.entries(cases)) {
      test(input, () => expect(aksara(input)).toBe(ak(spec)));
    }
  });

  describe("toLatin reads Unicode order only", () => {
    test("SA TALING TA is séta, SA TA TALING is saté", () => {
      expect(latin(ak("SA TALING TA"))).toBe("séta");
      expect(latin(ak("SA TA TALING"))).toBe("saté");
    });

    test("taling with no base is an error", () => {
      expect(toLatin(ak("TALING TA TARUNG")).kind).toBe("error");
    });
  });

  test("no taling is stored first, after pangkon/ZWNJ or after a vowel sign", () => {
    const isVowelSign = (r: number) => r >= 0xa9b4 && r <= 0xa9bc;
    const check = (text: string, why: string) => {
      const runes = Array.from(text, (c) => c.codePointAt(0)!);
      for (let i = 0; i < runes.length; i++) {
        if (runes[i] !== 0xa9ba) continue;
        expect(i, `${why}: taling first`).toBeGreaterThan(0);
        const prev = runes[i - 1]!;
        expect(prev, `${why}: taling after pangkon`).not.toBe(0xa9c0);
        expect(prev, `${why}: taling after ZWNJ`).not.toBe(0x200c);
        expect(isVowelSign(prev), `${why}: after vowel sign`).toBe(false);
      }
    };

    for (const p of goldenPairs) {
      check(p.aksara, `golden ${p.latinJgst}`);
      const r = toAksara(p.latinJgst);
      if (r.kind === "success") check(r.output, `toAksara ${p.latinJgst}`);
    }
  });
});
