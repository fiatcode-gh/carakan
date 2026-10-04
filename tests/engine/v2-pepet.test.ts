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
});
