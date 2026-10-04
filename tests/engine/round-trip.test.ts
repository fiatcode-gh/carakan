import { describe, expect, test } from "vitest";
import { toAksara, toLatin } from "../../src/engine/index.ts";
import { goldenPairs } from "./golden-pairs.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] round-trip", () => {
  test("every golden pair: aksara -> JGST -> aksara is identity", () => {
    // JGST is the canonical corpus scheme (spec 6.2 two-track resolution):
    // it must round-trip without loss for the whole in-scope repertoire.
    for (const p of goldenPairs) {
      const latin = toLatin(p.aksara, { scheme: "jgst" });
      expect(latin.kind, p.source).toBe("success");
      if (latin.kind !== "success") continue;
      const back = toAksara(latin.output);
      expect(back.kind, `${p.source}: ${p.latinJgst}`).toBe("success");
      if (back.kind !== "success") continue;
      expect(back.output, `${p.source}: round-trip via JGST`).toBe(p.aksara);
    }
  });

  test("every golden pair: aksara -> PUJL matches the school spelling", () => {
    for (const p of goldenPairs) {
      const latin = toLatin(p.aksara);
      expect(latin.kind, `${p.source}: ${p.aksara}`).toBe("success");
      if (latin.kind !== "success") continue;
      expect(latin.output, `${p.source}: ${p.aksara}`).toBe(p.latinPujl);
    }
  });

  test("unambiguous PUJL input round-trips", () => {
    for (const p of goldenPairs.filter((p) => p.pujlRoundTrips ?? true)) {
      const aksara = toAksara(p.latinPujl);
      expect(aksara.kind, `${p.source}: ${p.latinPujl}`).toBe("success");
      if (aksara.kind !== "success") continue;
      expect(aksara.output, `${p.source}: ${p.latinPujl}`).toBe(p.aksara);
    }
  });

  test("bare-e input is never a silent success (spec 6.2)", () => {
    for (const word of ["prelu", "setya", "hasem", "lesehan"]) {
      expect(toAksara(word).kind, word).toBe("ambiguous");
    }
  });

  test("aksara errors carry an index and a message", () => {
    const r = toLatin(ak("WULU KA")); // wulu without a base
    expect(r.kind).toBe("error");
    if (r.kind === "error") expect(r.message).not.toBe("");
  });

  test("latin errors: bad cluster, unknown character", () => {
    expect(toAksara("stra").kind).toBe("error");
    const unknown = toAksara("b4x");
    expect(unknown.kind).toBe("error");
    if (unknown.kind === "error") expect(unknown.index).toBe(2);
  });

  test("converter is deterministic: repeated calls give identical results", () => {
    for (const p of goldenPairs) {
      const a = toAksara(p.latinJgst);
      const b = toAksara(p.latinJgst);
      expect(a.kind).toBe("success");
      expect(b.kind).toBe("success");
      if (a.kind === "success" && b.kind === "success") {
        expect(a.output).toBe(b.output);
      }
    }
  });
});
