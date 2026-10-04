import { describe, expect, test } from "vitest";
import type { ConvertResult } from "../../src/engine/convert-result.ts";
import { latinToAksara } from "../../src/engine/latin-to-aksara.ts";
import { goldenPairs } from "./golden-pairs.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] latin-to-aksara", () => {
  const c = (input: string) => latinToAksara(input, false);

  function ok(r: ConvertResult, why: string): string {
    expect(r.kind, why).toBe("success");
    if (r.kind !== "success") throw new Error(why);
    return r.output;
  }

  test("open CV syllables (KAJ1-BAB1-A1)", () => {
    expect(ok(c("hanacaraka"), "row 1")).toBe(ak("HA NA CA RA KA"));
    expect(ok(c("datasawala"), "row 2")).toBe(ak("DA TA SA WA LA"));
    expect(ok(c("padhajayanya"), "row 3")).toBe(
      ak("PA DA_MAHAPRANA JA YA NYA"),
    );
    expect(ok(c("magabathanga"), "row 4")).toBe(ak("MA GA BA TTA NGA"));
  });

  test("word-final pangkon and sigeg sandhangan", () => {
    expect(ok(c("bapak"), "")).toBe(ak("BA PA KA PANGKON"));
    expect(ok(c("dal"), "")).toBe(ak("DA LA PANGKON"));
    expect(ok(c("kacang"), "")).toBe(ak("KA CA CECAK"));
    expect(ok(c("layang"), "")).toBe(ak("LA YA CECAK"));
    expect(ok(c("cacah"), "")).toBe(ak("CA CA WIGNYAN"));
    expect(ok(c("mangan"), "")).toBe(ak("MA NGA NA PANGKON"));
  });

  test("vowel sandhangan", () => {
    expect(ok(c("pipi"), "")).toBe(ak("PA WULU PA WULU"));
    expect(ok(c("tuku"), "")).toBe(ak("TA SUKU KA SUKU"));
    expect(ok(c("saté"), "")).toBe(ak("SA TA TALING")); // v3: Unicode order (taling after base)
    expect(ok(c("satè"), "")).toBe(ak("SA TA TALING")); // v3: Unicode order (taling after base)
    expect(ok(c("gulé"), "")).toBe(ak("GA SUKU LA TALING")); // v3: Unicode order (taling after base)
    expect(ok(c("toko"), "")).toBe(ak("TA TALING TARUNG KA TALING TARUNG")); // v3: Unicode order (taling after base)
    expect(ok(c("bocah"), "")).toBe(ak("BA TALING TARUNG CA WIGNYAN")); // v3: Unicode order (taling after base)
  });

  test("pepet substitutes pa cerek / nga lelet on re / le syllables", () => {
    // KAJ I Bab I A.5.b: pepet is not written on re/le.
    expect(ok(c("sětỿa"), "")).toBe(ak("SA PEPET TA PENGKAL"));
  });

  test("clusters: cakra, keret, pengkal, panjing", () => {
    expect(ok(c("krasa"), "")).toBe(ak("KA CAKRA SA"));
    expect(ok(c("pṛlu"), "")).toBe(ak("PA KERET LA SUKU")); // JGST keret input
    expect(ok(c("sětỿa"), "")).toBe(ak("SA PEPET TA PENGKAL")); // JGST pengkal input
    expect(ok(c("klapa"), "")).toBe(ak("KA PANGKON LA PA"));
  });

  // v3: ha carrier (KAJ I p.5 3.b, p.124 8.b)
  test("word-initial vowels take the ha carrier", () => {
    expect(ok(c("aksara"), "")).toBe(ak("HA KA PANGKON SA RA"));
  });

  test("mid-word hiatus inserts the w/y glide (KAJ Kata Asing)", () => {
    expect(ok(c("buaya"), "")).toBe(ak("BA SUKU WA YA"));
    expect(ok(c("tua"), "")).toBe(ak("TA SUKU WA"));
  });

  test("spaces and punctuation", () => {
    // v3: joined writing (KAJ I p.24)
    expect(ok(c("bapak lunga"), "")).toBe(ak("BA PA KA PANGKON LA SUKU NGA"));
    expect(ok(c("hanacaraka,"), "")).toBe(ak("HA NA CA RA KA LINGSA"));
    expect(ok(c("datasawala."), "")).toBe(ak("DA TA SA WA LA LUNGSI"));
  });

  test("angka are flanked by pada pangkat", () => {
    expect(ok(c("17"), "")).toBe(ak("PANGKAT DIGIT_ONE DIGIT_SEVEN PANGKAT"));
  });

  test("JGST canonical input round-trips every golden pair", () => {
    for (const p of goldenPairs) {
      expect(ok(c(p.latinJgst), `${p.source}: ${p.latinJgst}`)).toBe(p.aksara);
    }
  });

  test("PUJL input round-trips every unambiguous golden pair", () => {
    for (const p of goldenPairs.filter((p) => p.pujlRoundTrips ?? true)) {
      expect(ok(c(p.latinPujl), `${p.source}: ${p.latinPujl}`)).toBe(p.aksara);
    }
  });

  test("unknown characters surface ConvertError with an index", () => {
    const r = c("b4x");
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.index).toBe(2);
  });
});
