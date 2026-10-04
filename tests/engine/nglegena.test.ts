import { describe, expect, test } from "vitest";
import {
  nglegena,
  nglegenaById,
  nglegenaByPujl,
  noSigegNglegena,
  rightSidePasangan,
} from "../../src/engine/nglegena.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] nglegena", () => {
  test("there are exactly 20 nglegena in carakan teaching order", () => {
    // KAJ I Yogyakarta 2021, Tata Tulis Simplified, Bab I A.1.
    expect(nglegena.map((a) => a.id)).toEqual([
      "ha",
      "na",
      "ca",
      "ra",
      "ka", // row 1
      "da",
      "ta",
      "sa",
      "wa",
      "la", // row 2
      "pa",
      "dha",
      "ja",
      "ya",
      "nya", // row 3
      "ma",
      "ga",
      "ba",
      "tha",
      "nga", // row 4
    ]);
  });

  test("every nglegena latin form ends in the inherent vowel a", () => {
    // The converter derives onsets by dropping this final "a".
    for (const a of nglegena) {
      expect(a.latinPujl.endsWith("a"), a.id).toBe(true);
      expect(a.latinJgst.endsWith("a"), a.id).toBe(true);
    }
  });

  test("PUJL school spellings match the KAJ carakan table", () => {
    // KAJ I, Tata Tulis Simplified, Bab I A.1 (carakan list).
    expect(nglegenaByPujl.get("dha")?.id).toBe("dha");
    expect(nglegenaByPujl.get("dha")?.unicodeName).toBe(
      "JAVANESE LETTER DA MAHAPRANA",
    );
    expect(nglegenaByPujl.get("th") === undefined).toBe(true); // onset only, not an aksara
    expect(nglegenaByPujl.get("tha")?.unicodeName).toBe("JAVANESE LETTER TTA");
    expect(nglegenaByPujl.get("nya")?.unicodeName).toBe("JAVANESE LETTER NYA");
    expect(nglegenaByPujl.get("nga")?.unicodeName).toBe("JAVANESE LETTER NGA");
  });

  test("JGST uses IAST-style onsets for retroflex/nasal/aspirate aksara", () => {
    // KAJ I, Daftar Transliterasi (JGST column).
    expect(nglegenaById("tha")?.latinJgst).toBe("ṭa");
    expect(nglegenaById("dha")?.latinJgst).toBe("ḍa");
    expect(nglegenaById("nya")?.latinJgst).toBe("ña");
    expect(nglegenaById("nga")?.latinJgst).toBe("ṅa");
  });

  test("ha, ra, nga cannot close a syllable (KAJ Bab I A.1.b)", () => {
    expect(noSigegNglegena).toEqual(new Set(["ha", "ra", "nga"]));
  });

  test("pasangan of ha, sa, pa are right-side (KAJ Bab I A.1.a note)", () => {
    expect(rightSidePasangan).toEqual(new Set(["ha", "sa", "pa"]));
  });

  test("codepoints resolve to real characters", () => {
    expect(nglegenaById("ka")?.char).toBe(ak("KA"));
    expect(nglegenaById("ha")?.char).toBe(ak("HA"));
    expect(nglegenaById("nga")?.char).toBe(ak("NGA"));
  });
});
