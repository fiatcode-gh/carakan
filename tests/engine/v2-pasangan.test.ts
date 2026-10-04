import { describe, expect, test } from "vitest";
import {
  toAksara,
  toLatin,
  type ConvertResult,
} from "../../src/engine/index.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] v2-pasangan", () => {
  function ok(r: ConvertResult, why: string): string {
    expect(r.kind, why).toBe("success");
    if (r.kind !== "success") throw new Error(why);
    return r.output;
  }

  test("a pasangan link followed by a post-onset taling reads back (lombok)", () => {
    // The pangkon before the linked consonant is a link, not a word-final
    // vowel killer; the taling follows the linked consonant.
    const lombok = ak(
      "LA TALING TARUNG MA PANGKON BA TALING TARUNG KA PANGKON",
    ); // v3: Unicode order (taling after base)
    expect(ok(toLatin(lombok, { scheme: "jgst" }), "lombok")).toBe("lombok/");
    expect(ok(toLatin(lombok, { scheme: "pujl" }), "lombok pujl")).toBe(
      "lombok",
    );
  });

  test("taling-tarung belongs to the consonant it follows (rawon)", () => {
    // RA WA + taling + tarung: the o is WA's, never RA's.
    expect(
      ok(
        toLatin(ak("RA WA TALING TARUNG NA PANGKON"), { scheme: "jgst" }), // v3: Unicode order (taling after base)
        "rawon",
      ),
    ).toBe("rawon/");
    expect(
      ok(
        toLatin(ak("KA CAKRA TA TALING TARUNG NA PANGKON"), { scheme: "jgst" }), // v3: Unicode order (taling after base)
        "kraton",
      ),
    ).toBe("kŕaton/");
  });

  test("the class of excluded words now round-trips", () => {
    for (const w of [
      "lombok/",
      "rawon/",
      "kŕaton/",
      "ṅombé",
      "gěndoŋ",
      "hěnḍog/", // v3: ha carrier (KAJ I p.124 8.b); ěnḍog/ reads back with h
    ]) {
      const aksara = ok(toAksara(w), w);
      expect(ok(toLatin(aksara, { scheme: "jgst" }), w)).toBe(w);
    }
  });

  test("direct pasangan chains are untouched (kanca, janji)", () => {
    for (const w of ["kanca", "janji", "numpak/", "klambi"]) {
      const aksara = ok(toAksara(w), w);
      expect(ok(toLatin(aksara, { scheme: "jgst" }), w)).toBe(w);
    }
  });
});
