import { describe, expect, test } from "vitest";
import {
  toAksara,
  toLatin,
  type ConvertResult,
} from "../../src/engine/index.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] v2-rekan", () => {
  function ok(r: ConvertResult, why: string): string {
    expect(r.kind, why).toBe("success");
    if (r.kind !== "success") throw new Error(why);
    return r.output;
  }

  test("fa/va words convert (KAJ I Bab I A.4: PA/WA + cecak telu)", () => {
    // PA + cecak telu; WA + cecak telu. Taling follows its base:
    // foto = pa+cecak-telu + taling + tarung + ta + taling + tarung.
    expect(ok(toAksara("foto"), "foto")).toBe(
      ak("PA CECAK_TELU TALING TARUNG TA TALING TARUNG"), // v3: Unicode order (taling after base)
    );
    expect(ok(toAksara("fajar"), "fajar")).toBe(ak("PA CECAK_TELU JA LAYAR"));
    expect(ok(toAksara("vila"), "vila")).toBe(ak("WA CECAK_TELU WULU LA"));
  });

  test("rekan reads back as f/v", () => {
    expect(ok(toLatin(ak("PA CECAK_TELU"), { scheme: "jgst" }), "fa")).toBe(
      "fa",
    );
    expect(ok(toLatin(ak("WA CECAK_TELU"), { scheme: "jgst" }), "va")).toBe(
      "va",
    );
    expect(
      ok(toLatin(ak("PA CECAK_TELU JA LAYAR"), { scheme: "jgst" }), "fajar"),
    ).toBe("fajaṙ");
  });

  test("fa/va words round-trip", () => {
    // JGST is lossless: word-final layar reads back as ṙ, so the loop
    // uses the JGST forms (fajaṙ, like ěmběṙ in v2-pepet.test.ts).
    for (const w of ["foto", "fajaṙ", "vila"]) {
      const aksara = ok(toAksara(w), w);
      expect(ok(toLatin(aksara, { scheme: "jgst" }), w)).toBe(w);
    }
  });

  test("the murda cascade skips rekan tokens; coda ra stays layar", () => {
    // KAJ I Bab I A.2 (honorific cascade): every murda-able aksara takes
    // its murda — but rekan tokens keep their cecak-telu base plain
    // (KAJ safaat). The cascade may map a word-final r to RA
    // AGUNG; the no-sigeg rule (KAJ I Bab I A.1.b) still renders it as
    // layar. Fajar → fa (plain) + ja murda + layar.
    expect(ok(toAksara("Fajar", { useMurda: true }), "Fajar")).toBe(
      ak("PA CECAK_TELU JA_MAHAPRANA LAYAR"),
    );
  });

  test("z/q/x remain explicit errors", () => {
    expect(toAksara("zebra").kind).toBe("error");
    expect(toAksara("quran").kind).toBe("error");
  });

  test("cecak telu on an unsupported base is an explicit error", () => {
    expect(toLatin(ak("KA CECAK_TELU"), { scheme: "jgst" }).kind).toBe("error");
  });
});
