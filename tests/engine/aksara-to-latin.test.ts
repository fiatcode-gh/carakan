import { describe, expect, test } from "vitest";
import { aksaraToLatin } from "../../src/engine/aksara-to-latin.ts";
import type { ConvertResult } from "../../src/engine/convert-result.ts";
import { ak } from "./support/aksara-builder.ts";

/** Dart: `(c.convert(x) as ConvertSuccess).output` — throws unless success. */
function output(r: ConvertResult): string {
  if (r.kind !== "success")
    throw new Error(`expected ConvertSuccess, got ${r.kind}`);
  return r.output;
}

describe("[P-D01] aksara-to-latin", () => {
  test("single nglegena carry the inherent vowel a", () => {
    // KAJ I Bab I A.5.a: aksara legena = consonant + a.
    expect(output(aksaraToLatin(ak("KA")))).toBe("ka");
    expect(output(aksaraToLatin(ak("HA")))).toBe("ha");
    expect(output(aksaraToLatin(ak("TTA")))).toBe("tha");
    expect(output(aksaraToLatin(ak("DA_MAHAPRANA")))).toBe("dha");
  });

  test("carakan rows read in order (KAJ I Bab I A.1)", () => {
    expect(output(aksaraToLatin(ak("HA NA CA RA KA")))).toBe("hanacaraka");
    expect(output(aksaraToLatin(ak("DA TA SA WA LA")))).toBe("datasawala");
    expect(output(aksaraToLatin(ak("PA DA_MAHAPRANA JA YA NYA")))).toBe(
      "padhajayanya",
    );
    expect(output(aksaraToLatin(ak("MA GA BA TTA NGA")))).toBe("magabathanga");
  });

  test("vowel sandhangan replace the inherent vowel", () => {
    // KAJ I Bab I A.5.b examples.
    expect(output(aksaraToLatin(ak("PA WULU PA WULU")))).toBe("pipi"); // wulu
    expect(output(aksaraToLatin(ak("SA WULU JA WULU")))).toBe("siji"); // wulu
    expect(output(aksaraToLatin(ak("MA TA WULU")))).toBe("mati"); // wulu
    expect(output(aksaraToLatin(ak("TA SUKU KA SUKU")))).toBe("tuku"); // suku
    expect(output(aksaraToLatin(ak("SA SUKU KA SUKU")))).toBe("suku"); // suku
    expect(output(aksaraToLatin(ak("SA TA TALING")))).toBe("saté"); // taling after base
    expect(output(aksaraToLatin(ak("GA SUKU LA TALING")))).toBe("gulé"); // taling after base
    expect(output(aksaraToLatin(ak("SA PEPET TA PENGKAL")))).toBe("setya"); // pepet + pengkal
  });

  test("taling tarung yields o, stored after its base", () => {
    // KAJ I Bab I A.5.b.1.e; Unicode ch.17: vowel signs follow the base.
    expect(output(aksaraToLatin(ak("TA TALING TARUNG KA TALING TARUNG")))).toBe(
      "toko",
    ); // v3: Unicode order (taling after base)
    expect(output(aksaraToLatin(ak("BA TALING TARUNG CA WIGNYAN")))).toBe(
      "bocah",
    ); // v3: Unicode order (taling after base)
  });

  test("syllable-closing sandhangan: layar, cecak, wignyan", () => {
    // KAJ I Bab I A.5.c/d examples.
    expect(output(aksaraToLatin(ak("KA CA CECAK")))).toBe("kacang");
    expect(output(aksaraToLatin(ak("LA YA CECAK")))).toBe("layang");
    expect(output(aksaraToLatin(ak("CA CA WIGNYAN")))).toBe("cacah");
    expect(output(aksaraToLatin(ak("MA NGA NA PANGKON")))).toBe("mangan");
  });

  test("word-final pangkon kills the vowel in PUJL", () => {
    expect(output(aksaraToLatin(ak("BA PA KA PANGKON")))).toBe("bapak");
    expect(output(aksaraToLatin(ak("DA LA PANGKON")))).toBe("dal");
  });

  test("pasangan chains render as consonant clusters", () => {
    // UTN47 section 4: pasangan = base + pangkon + consonant.
    expect(output(aksaraToLatin(ak("A KA PANGKON SA RA")))).toBe("aksara");
    expect(output(aksaraToLatin(ak("KA PANGKON LA PA")))).toBe("klapa"); // panjing la
  });

  test("consonant medials: cakra, keret, pengkal", () => {
    // KAJ I Bab I A.5.e examples.
    expect(output(aksaraToLatin(ak("KA CAKRA SA")))).toBe("krasa");
    expect(output(aksaraToLatin(ak("PA KERET LA SUKU")))).toBe("prelu");
    expect(output(aksaraToLatin(ak("SA PEPET TA PENGKAL")))).toBe("setya");
  });

  test("swara letters and pa cerek / nga lelet", () => {
    expect(output(aksaraToLatin(ak("A KA PANGKON SA RA")))).toBe("aksara");
    expect(output(aksaraToLatin(ak("PA_CEREK")))).toBe("re");
    expect(output(aksaraToLatin(ak("NGA_LELET")))).toBe("le");
  });

  test("spaces and pada pass through as word separators", () => {
    expect(
      output(aksaraToLatin(ak("BA PA KA PANGKON") + " " + ak("I BA SUKU"))),
    ).toBe("bapak ibu");
    expect(output(aksaraToLatin(ak("HA NA CA RA KA LINGSA")))).toBe(
      "hanacaraka,",
    );
    expect(output(aksaraToLatin(ak("DA TA SA WA LA LUNGSI")))).toBe(
      "datasawala.",
    );
  });

  test("angka render as digits, pada pangkat is consumed", () => {
    expect(
      output(aksaraToLatin(ak("PANGKAT DIGIT_ONE DIGIT_SEVEN PANGKAT"))),
    ).toBe("17");
  });

  test("JGST scheme is lossless and distinct from PUJL", () => {
    // KAJ I Daftar Transliterasi: JGST marks sigeg (ṙ ŋ ḥ /) and uses IAST.
    expect(output(aksaraToLatin(ak("BA PA KA PANGKON"), "jgst"))).toBe(
      "bapak/",
    );
    expect(output(aksaraToLatin(ak("KA CA CECAK"), "jgst"))).toBe("kacaŋ");
    expect(output(aksaraToLatin(ak("CA CA WIGNYAN"), "jgst"))).toBe("cacaḥ");
    expect(output(aksaraToLatin(ak("MA NGA NA PANGKON"), "jgst"))).toBe(
      "maṅan/",
    );
    expect(output(aksaraToLatin(ak("TTA"), "jgst"))).toBe("ṭa");
    expect(output(aksaraToLatin(ak("PA KERET LA SUKU"), "jgst"))).toBe("pṛlu");
    expect(output(aksaraToLatin(ak("SA PEPET TA PENGKAL"), "jgst"))).toBe(
      "sětỿa",
    );
    expect(output(aksaraToLatin(ak("KA CAKRA SA"), "jgst"))).toBe("kŕasa");
    expect(output(aksaraToLatin(ak("PA_CEREK"), "jgst"))).toBe("ṛ");
  });

  test("unknown and malformed input produce ConvertError, never guesses", () => {
    // Spec 6.2: explicit unresolvable instead of silent guessing.
    const unknown = aksaraToLatin(ak("KA") + "X");
    expect(unknown.kind).toBe("error");
    expect(unknown.kind === "error" ? unknown.message : "").toContain(
      "Unrecognized",
    );

    const dangling = aksaraToLatin(ak("TALING")); // v3: Unicode order (taling after base)
    expect(dangling.kind).toBe("error");

    const wuluFirst = aksaraToLatin(ak("WULU KA"));
    expect(wuluFirst.kind).toBe("error");
  });
});
