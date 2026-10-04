import { describe, expect, test } from "vitest";
import { aksaraToLatin } from "../../src/engine/aksara-to-latin.ts";
import { goldenPairs } from "./golden-pairs.ts";

describe("[P-D01] golden aksara-to-latin", () => {
  test("every golden pair converts aksara -> PUJL", () => {
    for (const p of goldenPairs) {
      const r = aksaraToLatin(p.aksara, "pujl");
      expect(r.kind, `${p.latinPujl} (${p.source})`).toBe("success");
      expect(
        r.kind === "success" ? r.output : undefined,
        `${p.source}: ${p.aksara}`,
      ).toBe(p.latinPujl);
    }
  });

  test("every golden pair converts aksara -> JGST (canonical)", () => {
    for (const p of goldenPairs) {
      const r = aksaraToLatin(p.aksara, "jgst");
      expect(r.kind, `${p.latinJgst} (${p.source})`).toBe("success");
      expect(
        r.kind === "success" ? r.output : undefined,
        `${p.source}: ${p.aksara}`,
      ).toBe(p.latinJgst);
    }
  });
});
