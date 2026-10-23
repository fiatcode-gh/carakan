import { describe, expect, test } from "vitest";
import {
  toAksara,
  toLatin,
  type ConvertResult,
} from "../../src/engine/index.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] v2-pepet", () => {
  function ok(r: ConvertResult, why: string): string {
    expect(r.kind, why).toBe("success");
    if (r.kind !== "success") throw new Error(why);
    return r.output;
  }

  test("independent pepet reads back as ě (JGST) / e (PUJL)", () => {
    // KAJ I Swara Mandiri: A PEPET = ě (JGST) / e (PUJL); example
    // A PEPET MA SA PANGKON = emas.
    expect(
      ok(toLatin(ak("A PEPET MA SA PANGKON"), { scheme: "jgst" }), "jgst emas"),
    ).toBe("ěmas/");
    expect(
      ok(toLatin(ak("A PEPET MA SA PANGKON"), { scheme: "pujl" }), "pujl emas"),
    ).toBe("emas");
    expect(ok(toLatin(ak("A PEPET"), { scheme: "jgst" }), "ě")).toBe("ě");
  });

  // v3: ha carrier (KAJ I p.5 3.b, p.124 8.b) — the JGST back-form is h-prefixed.
  test("word-initial pepet words round-trip with the h carrier", () => {
    const backForm = { "ěmas/": "hěmas/", ěmběṙ: "hěmběṙ" };
    for (const [w, expected] of Object.entries(backForm)) {
      const aksara = ok(toAksara(w), w);
      expect(ok(toLatin(aksara, { scheme: "jgst" }), w), w).toBe(expected);
    }
  });

  test("bare e stays ambiguous; the mandiri form resolves it", () => {
    expect(toAksara("endhog").kind).toBe("ambiguous");
  });

  test("typed pepet after consonant + r is keret (C1c)", () => {
    expect(ok(toAksara("prêlu"), "prêlu")).toBe(ak("PA KERET LA SUKU"));
    expect(ok(toAksara("prělu"), "prělu")).toBe(ak("PA KERET LA SUKU"));
    expect(ok(toAksara("krêtêg"), "krêtêg")).toBe(
      ak("KA KERET TA PEPET GA PANGKON"),
    );
    expect(ok(toAksara("pŕělu"), "pŕělu")).toBe(ak("PA CAKRA PEPET LA SUKU"));
    expect(ok(toAksara("RlÈjRêL"), "RlÈjRêL")).toBe(
      ak("RA PANGKON LA TALING JA PANGKON PA_CEREK LA PANGKON"),
    );
  });

  test("a typed pepet converts exactly like the bare-e pepet candidate", () => {
    for (const x of [
      "prelu",
      "kreteg",
      "Prelu",
      "seneng",
      "lesehan",
      "RlÈjReL",
      "kre",
      "liwat kreteg",
    ]) {
      const bare = toAksara(x);
      expect(bare.kind, x).toBe("ambiguous");
      const typed = toAksara(x.replace(/e/g, "ê").replace(/E/g, "Ê"));
      expect(typed.kind, x).toBe("success");
      if (bare.kind !== "ambiguous" || typed.kind !== "success") continue;
      expect({ output: typed.output, clusters: typed.clusters }, x).toEqual({
        output: bare.candidates[0]!.output,
        clusters: bare.candidates[0]!.clusters,
      });
    }
  });
});
