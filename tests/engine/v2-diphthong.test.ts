import { describe, expect, test } from "vitest";
import {
  toAksara,
  toLatin,
  type ConvertResult,
} from "../../src/engine/index.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] v2-diphthong", () => {
  function ok(r: ConvertResult, why: string): string {
    expect(r.kind, why).toBe("success");
    if (r.kind !== "success") throw new Error(why);
    return r.output;
  }

  test("ai on a consonant uses dirga mure after the base (KAJ santai)", () => {
    // WG2 n3319: "kai is KA + DIRGA MURE"; KAJ example SA NA DIRGA MURE TA.
    expect(ok(toAksara("ramai"), "ramai")).toBe(ak("RA MA DIRGA_MURE"));
    expect(ok(toAksara("pandai"), "pandai")).toBe(
      ak("PA NA PANGKON DA DIRGA_MURE"),
    );
  });

  test("au on a consonant uses dirga mure + tarung (KAJ taulan)", () => {
    // WG2 n3319: "kau is KA + DIRGA MURE + TARUNG".
    expect(ok(toAksara("kacau"), "kacau")).toBe(ak("KA CA DIRGA_MURE TARUNG"));
  });

  test("diphthongs read back and round-trip", () => {
    for (const w of ["ramai", "kacau", "pandai"]) {
      const aksara = ok(toAksara(w), w);
      expect(ok(toLatin(aksara, { scheme: "jgst" }), w)).toBe(w);
    }
    expect(ok(toLatin(ak("PA DIRGA_MURE"), { scheme: "jgst" }), "pai")).toBe(
      "pai",
    );
    expect(
      ok(toLatin(ak("PA DIRGA_MURE TARUNG"), { scheme: "jgst" }), "pau"),
    ).toBe("pau");
  });

  // v3: ha carrier (KAJ I p.5 3.b, p.124 8.b)
  test("word-initial ai/au take the ha carrier; dirga swara stays reachable", () => {
    expect(ok(toAksara("ai"), "ai")).toBe(ak("HA DIRGA_MURE"));
    expect(ok(toAksara("aula"), "aula")).toBe(ak("HA DIRGA_MURE TARUNG LA"));
    expect(ok(toAksara("pak Ai"), "pak Ai")).toBe(ak("PA KA PANGKON AI"));
  });

  test("the separate-syllable ai reading is documented, not guessed", () => {
    // KAJ: bait is BA A TA PANGKON (separate syllables); the engine always
    // takes the diphthong reading — deterministic, documented (decision 5).
    expect(ok(toAksara("bait"), "bait")).toBe(ak("BA DIRGA_MURE TA PANGKON"));
  });
});
