import { describe, expect, test } from "vitest";
import {
  toAksara,
  toLatin,
  type ConvertResult,
  type LatinScheme,
} from "../../src/engine/index.ts";
import { ak } from "./support/aksara-builder.ts";

function describeResult(r: ConvertResult): string {
  return JSON.stringify(r);
}

function out(latin: string, { murda = false }: { murda?: boolean } = {}) {
  const r = toAksara(latin, { useMurda: murda });
  if (r.kind !== "success") {
    throw new Error(
      `expected success for "${latin}", got ${describeResult(r)}`,
    );
  }
  return r.output;
}

function latin(aksara: string, scheme: LatinScheme): string {
  const r = toLatin(aksara, { scheme });
  if (r.kind !== "success")
    throw new Error(`expected ConvertSuccess, got ${r.kind}`);
  return r.output;
}

describe("[P-D01] v3-ha-carrier", () => {
  describe("ha carrier and swara names (KAJ I p.5 3.b, p.12, p.124)", () => {
    const cases: Record<string, string> = {
      // Contract; p.24 ibu.
      ibu: "HA WULU BA SUKU",
      adhik: "HA DA_MAHAPRANA WULU KA PANGKON",
      // p.12 hasěm/ = PUJL asem.
      asěm: "HA SA PEPET MA PANGKON",
      hasěm: "HA SA PEPET MA PANGKON",
      // p.124 8.b ha samar.
      ěmpu: "HA PEPET MA PANGKON PA SUKU",
      // p.5 3.b swara only for clarity.
      aksara: "HA KA PANGKON SA RA",
      // hiki workaround.
      iki: "HA WULU KA WULU",
      hiki: "HA WULU KA WULU",
      // p.24
      "bapak, ibu": "BA PA KA PANGKON ZWNJ HA WULU BA SUKU",
      "bapak ibu": "BA PA KA PANGKON HA WULU BA SUKU",
      // p.6 swara utama; pasangan swara.
      "ngajak Abdul": "NGA JA KA PANGKON A BA PANGKON DA SUKU LA PANGKON",
      // p.7 swara dirga.
      "pak Airlangga": "PA KA PANGKON AI LAYAR LA CECAK GA",
      // Sentence-initial capital takes the carrier.
      Abdul: "HA BA PANGKON DA SUKU LA PANGKON",
      // After a full stop the next word is sentence-initial.
      "Ibu lunga. Ibu turu.":
        "HA WULU BA SUKU LA SUKU NGA LUNGSI HA WULU BA SUKU TA SUKU RA SUKU LUNGSI",
      // Mid-word swara unchanged (KAJ Kata Asing).
      maaf: "MA A PA CECAK_TELU PANGKON",
    };
    for (const [input, spec] of Object.entries(cases)) {
      test(input, () => expect(out(input)).toBe(ak(spec)));
    }

    test("Paku Alam with murda (p.5 murda table)", () => {
      expect(out("Paku Alam", { murda: true })).toBe(
        ak("PA_MURDA KA_MURDA SUKU A LA MA PANGKON"),
      );
    });

    test("enak stays ambiguous with the carrier (spec 6.2)", () => {
      const r = toAksara("enak");
      expect(r.kind).toBe("ambiguous");
      if (r.kind !== "ambiguous") return;
      const outputs = new Set(r.candidates.map((c) => c.output));
      expect(outputs).toEqual(
        new Set([ak("HA PEPET NA KA PANGKON"), ak("HA TALING NA KA PANGKON")]),
      );
    });
  });

  describe("read-back", () => {
    test(
      "JGST back-form of " + ak("HA PEPET") + "… carries the h (hasěm/ = asem)",
      () => {
        expect(latin(out("asěm/"), "jgst")).toBe("hasěm/");
      },
    );
    test("aksara -> Latin direction is unchanged", () => {
      expect(latin(out("ibu"), "pujl")).toBe("hibu");
    });
    test("swara-initial words still read", () => {
      expect(latin(ak("A BA PANGKON"), "pujl")).toBe("ab");
    });
  });

  describe("explicit JGST forms", () => {
    test("ěmas/ -> HA PEPET MA SA PANGKON", () => {
      expect(out("ěmas/")).toBe(ak("HA PEPET MA SA PANGKON"));
    });
    test("ěnḍog/", () => {
      expect(out("ěnḍog/")).toBe(
        ak("HA PEPET NA PANGKON DA_MAHAPRANA TALING TARUNG GA PANGKON"),
      );
    });
  });
});
