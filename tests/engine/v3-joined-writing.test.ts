import { describe, expect, test } from "vitest";
import { toAksara, toLatin } from "../../src/engine/index.ts";
import { goldenPairs } from "./golden-pairs.ts";
import { ak } from "./support/aksara-builder.ts";

function out(latin: string, { murda = false }: { murda?: boolean } = {}) {
  const r = toAksara(latin, { useMurda: murda });
  if (r.kind !== "success") {
    throw new Error(
      `expected success for "${latin}", got ${JSON.stringify(r)}`,
    );
  }
  return r.output;
}

function back(aksara: string): string {
  const r = toLatin(aksara, { scheme: "jgst" });
  if (r.kind !== "success")
    throw new Error(`expected ConvertSuccess, got ${r.kind}`);
  return r.output;
}

describe("[P-D01] v3-joined-writing", () => {
  describe("joined writing (KAJ I p.24, p.126)", () => {
    const cases: Record<string, string> = {
      // KAJ I p.24 A.5.d pangkon only word-final; p.126 8.e cross-word stacks.
      "bapak lunga": "BA PA KA PANGKON LA SUKU NGA",
      // KAJ I p.24 pangkon = pada lingsa.
      "bapak, hibu": "BA PA KA PANGKON ZWNJ HA WULU BA SUKU",
      // KAJ I p.24 JGST column `bapak/ hibu`.
      "bapak/ hibu": "BA PA KA PANGKON ZWNJ HA WULU BA SUKU",
      // The same break with the comma spelled as its own word, and with the
      // JGST slash written directly against the next word (no space).
      "bapak, ibu": "BA PA KA PANGKON ZWNJ HA WULU BA SUKU",
      "bapak/hibu": "BA PA KA PANGKON ZWNJ HA WULU BA SUKU",
      // Q5 (was silently truncated to the first segment): a slash between
      // two letters is a visible-pangkon break, not the end of the input.
      "sěk/lěk": "SA PEPET KA PANGKON ZWNJ NGA_LELET KA PANGKON",
      // KAJ I p.24 joined writing: no slash means pasangan ha.
      "bapak hibu": "BA PA KA PANGKON HA WULU BA SUKU",
      // KAJ I p.24 `bapak/.`
      "bapak.": "BA PA KA PANGKON LINGSA",
      // KAJ I p.24 row 1.
      bapak: "BA PA KA PANGKON",
      // KAJ I p.24: trailing break is stripped.
      "bapak,": "BA PA KA PANGKON",
      // Open syllable keeps its pada.
      "lunga, hibu.": "LA SUKU NGA LINGSA HA WULU BA SUKU LUNGSI",
      // Sigeg coda is not a pangkon.
      "layang, hibu": "LA YA CECAK LINGSA HA WULU BA SUKU",
      // Rekan coda is a pangkon.
      "maaf, hibu": "MA A PA CECAK_TELU PANGKON ZWNJ HA WULU BA SUKU",
      // KAJ I p.126 8.e three-stack over a wyanjana.
      "mènèk klapa": "MA TALING NA TALING KA PANGKON KA PANGKON LA PA",
      // KAJ I p.126 8.e.
      "mangan kwèni": "MA NGA NA PANGKON KA PANGKON WA TALING NA WULU",
      // KAJ I p.126 8.e.
      "liwat kṛtěg": "LA WULU WA TA PANGKON KA KERET TA PEPET GA PANGKON",
      // KAJ I p.7 Catatan b: across words la+ě is nga lelet.
      "bapak lěmah": "BA PA KA PANGKON NGA_LELET MA WIGNYAN",
      // KAJ I p.7 Catatan b: same word, la + pepet as pasangan.
      jaklěk: "JA KA PANGKON LA PEPET KA PANGKON",
      // KAJ I p.127 8.h ya/wa take pangkon word-final.
      boy: "BA TALING TARUNG YA PANGKON",
      wow: "WA TALING TARUNG WA PANGKON",
      // KAJ I p.127 8.h ya/wa take pasangan before a consonant.
      joyko: "JA TALING TARUNG YA PANGKON KA TALING TARUNG",
      royko: "RA TALING TARUNG YA PANGKON KA TALING TARUNG",
      // Joined + Unicode order.
      "bapak lombok":
        "BA PA KA PANGKON LA TALING TARUNG MA PANGKON BA TALING TARUNG KA PANGKON",
      // Angka unchanged.
      "bapak 17": "BA PA KA PANGKON PANGKAT DIGIT_ONE DIGIT_SEVEN PANGKAT",
    };
    for (const [input, spec] of Object.entries(cases)) {
      test(input, () => expect(out(input)).toBe(ak(spec)));
    }
  });

  test("ambiguity path uses the same renderer", () => {
    const r = toAksara("bapak, ené");
    expect(r.kind).toBe("ambiguous");
    if (r.kind !== "ambiguous") return;
    for (const c of r.candidates) {
      expect(c.output.startsWith(ak("BA PA KA PANGKON ZWNJ"))).toBe(true);
    }
  });

  describe("read-back", () => {
    test("JGST reads a comma pangkon as visible slash, no space", () => {
      expect(back(out("bapak, hibu"))).toBe("bapak/hibu");
    });
    test("joined words read back without spaces", () => {
      expect(back(out("bapak lunga"))).toBe(
        back(ak("BA PA KA PANGKON")).replace("/", "") + back(ak("LA SUKU NGA")),
      );
    });
  });

  describe("JGST slash before a letter (M2)", () => {
    // toLatin(jgst) writes a visible pangkon as '/', so the read-back has to
    // survive being typed back into the converter without losing input.
    const inputs = [
      "bapak, ibu",
      "bapak, hibu",
      "bapak/ hibu",
      "bapak hibu",
      "bapak lunga",
      "jaklěk",
      "mènèk klapa",
      "mangan kwèni",
      "liwat kṛtěg",
      "bapak lombok",
      "lunga, hibu.",
      "maaf, hibu",
      "layang, hibu",
      "bapak,",
    ];
    for (const x of inputs) {
      test(`JGST round trip of "${x}" is identity`, () => {
        const a = out(x);
        expect(out(back(a))).toBe(a);
      });
    }

    test("every golden pair JGST round trips through toAksara", () => {
      for (const p of goldenPairs) {
        expect(out(p.latinJgst), p.source).toBe(p.aksara);
        expect(out(back(p.aksara)), p.source).toBe(p.aksara);
      }
    });

    test("a letter after the slash is never dropped", () => {
      expect(out("ṅajak/abdul/")).toBe(
        ak("NGA JA KA PANGKON ZWNJ HA BA PANGKON DA SUKU LA PANGKON"),
      );
      expect(out("bapak/hibul/lunga")).toBe(out("bapak, hibul, lunga"));
    });

    test("a slash that follows no consonant coda is an error, not a drop", () => {
      for (const x of ["/ba", "ba/pak", "bapak//hibu"]) {
        expect(toAksara(x).kind, x).toBe("error");
      }
    });
  });
});
