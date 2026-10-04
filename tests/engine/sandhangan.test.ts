import { describe, expect, test } from "vitest";
import { sandhangan, sandhanganById } from "../../src/engine/sandhangan.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] sandhangan", () => {
  test("the 12 in-scope sandhangan are modelled with their functions", () => {
    // Spec section 3 (data scope) names exactly these twelve.
    expect(sandhangan.map((s) => s.id)).toEqual([
      "wulu",
      "suku",
      "taling",
      "tarung",
      "pepet", // vowel-changing
      "layar",
      "cecak",
      "wignyan",
      "pangkon", // syllable-closing / vowel killer
      "cakra",
      "keret",
      "pengkal", // consonant-modifying
    ]);
  });

  test("functions are grouped per KAJ I Bab I A.5", () => {
    expect(sandhanganById("wulu")?.function).toBe("vowelChanging");
    expect(sandhanganById("pepet")?.function).toBe("vowelChanging");
    expect(sandhanganById("tarung")?.function).toBe("vowelChanging");
    expect(sandhanganById("layar")?.function).toBe("syllableClosing");
    expect(sandhanganById("cecak")?.function).toBe("syllableClosing");
    expect(sandhanganById("wignyan")?.function).toBe("syllableClosing");
    expect(sandhanganById("pangkon")?.function).toBe("vowelKiller");
    expect(sandhanganById("cakra")?.function).toBe("consonantModifying");
    expect(sandhanganById("keret")?.function).toBe("consonantModifying");
    expect(sandhanganById("pengkal")?.function).toBe("consonantModifying");
  });

  test("Latin values match KAJ Daftar Transliterasi", () => {
    // PUJL: pepet is plain "e", taling is "é" — this collision is the e-ambiguity
    // the converter must surface (spec 6.2). JGST keeps them apart: ě vs é.
    expect(sandhanganById("pepet")?.latinPujl).toBe("e");
    expect(sandhanganById("pepet")?.latinJgst).toBe("ě");
    expect(sandhanganById("taling")?.latinPujl).toBe("é");
    expect(sandhanganById("taling")?.latinJgst).toBe("é");
    expect(sandhanganById("layar")?.latinJgst).toBe("ṙ");
    expect(sandhanganById("cecak")?.latinJgst).toBe("ŋ");
    expect(sandhanganById("cecak")?.latinPujl).toBe("ng");
    expect(sandhanganById("wignyan")?.latinJgst).toBe("ḥ");
    expect(sandhanganById("cakra")?.latinJgst).toBe("ŕ");
    expect(sandhanganById("keret")?.latinJgst).toBe("ṛ");
    expect(sandhanganById("keret")?.latinPujl).toBe("re");
    expect(sandhanganById("pengkal")?.latinJgst).toBe("ỿ");
    expect(sandhanganById("pengkal")?.latinPujl).toBe("y");
  });

  test("codepoints resolve", () => {
    expect(sandhanganById("pangkon")?.char).toBe(ak("PANGKON"));
    expect(sandhanganById("wulu")?.char).toBe(ak("WULU"));
    expect(sandhanganById("taling")?.char).toBe(ak("TALING"));
  });
});
