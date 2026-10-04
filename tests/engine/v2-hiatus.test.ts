import { describe, expect, test } from "vitest";
import {
  toAksara,
  toLatin,
  type ConvertResult,
} from "../../src/engine/index.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] v2-hiatus", () => {
  function ok(r: ConvertResult, why: string): string {
    expect(r.kind, why).toBe("success");
    if (r.kind !== "success") throw new Error(why);
    return r.output;
  }

  test("u/o + vowel insert the w glide (KAJ Kata Asing)", () => {
    expect(ok(toAksara("buaya"), "buaya")).toBe(ak("BA SUKU WA YA"));
    expect(ok(toAksara("tua"), "tua")).toBe(ak("TA SUKU WA"));
    expect(ok(toAksara("kualitas"), "kualitas")).toBe(
      ak("KA SUKU WA LA WULU TA SA PANGKON"),
    );
    expect(ok(toAksara("kuitansi"), "kuitansi")).toBe(
      ak("KA SUKU WA WULU TA NA PANGKON SA WULU"),
    );
  });

  test("i/é + vowel insert the y glide (KAJ pelancar " + ak("YA") + ")", () => {
    // KAJ examples: pasièn, sosial. The taling follows its base in Unicode
    // order: the y-glide syllable renders YA + taling.
    expect(ok(toAksara("pasièn"), "pasièn")).toBe(
      ak("PA SA WULU YA TALING NA PANGKON"), // v3: Unicode order (taling after base)
    );
    expect(ok(toAksara("sosial"), "sosial")).toBe(
      ak("SA TALING TARUNG SA WULU YA LA PANGKON"), // v3: Unicode order (taling after base)
    );
  });

  test("double a is the swara A, mid-word (KAJ a-ganda: maaf, taat)", () => {
    expect(ok(toAksara("maaf/"), "maaf")).toBe(
      ak("MA A PA CECAK_TELU PANGKON"),
    );
    expect(ok(toAksara("taat/"), "taat")).toBe(ak("TA A TA PANGKON"));
  });

  test("a + é uses the swara E (KAJ maéstro " + ak("MA E") + "…)", () => {
    expect(ok(toAksara("saé"), "saé")).toBe(ak("SA E"));
  });

  test("the glide is lossy: canonicals keep the explicit glide", () => {
    // Round-trip contract: toLatin(buwaya) = buwaya, never buaya.
    for (const w of ["buwaya", "tuwa", "maaf/", "saé", "taat/"]) {
      const aksara = ok(toAksara(w), w);
      expect(ok(toLatin(aksara, { scheme: "jgst" }), w)).toBe(w);
    }
    expect(toAksara("buaya").kind).not.toBe("error");
  });

  test("pepet-initial hiatus stays an explicit error (eu class)", () => {
    // KAJ "eu" is written per the Latin; the engine does not synthesize
    // the glide after a pepet — documented, corpus-excluded.
    expect(toAksara("sěa").kind).toBe("error");
  });
});
