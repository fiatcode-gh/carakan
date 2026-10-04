import { describe, expect, test } from "vitest";
import {
  toAksara,
  toLatin,
  type ConvertResult,
} from "../../src/engine/index.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] murda-conversion", () => {
  function ok(r: ConvertResult): string {
    if (r.kind !== "success")
      throw new Error(`expected ConvertSuccess, got ${r.kind}`);
    return r.output;
  }

  test("murda is off by default (KAJ I Bab I A.2.f: never mandatory)", () => {
    expect(ok(toAksara("Budi"))).toBe(ak("BA SUKU DA WULU"));
    expect(ok(toAksara("budi"))).toBe(ak("BA SUKU DA WULU"));
  });

  test("useMurda applies the murda of the first aksara", () => {
    // KAJ I Bab I A.2 examples.
    expect(ok(toAksara("Budi", { useMurda: true }))).toBe(
      ak("BA_MURDA SUKU DA WULU"),
    );
    expect(ok(toAksara("Nabi", { useMurda: true }))).toBe(
      ak("NA_MURDA BA_MURDA WULU"),
    );
  });

  test("cascade: first aksara without murda passes to the next", () => {
    // KAJ I Bab I A.2.d: "jika aksara yang terdepan tidak ada maka aksara di
    // belakangnya begitu seterusnya". widura: w, i, d have no murda — ra
    // takes ra agung.
    expect(ok(toAksara("Widura", { useMurda: true }))).toBe(
      ak("WA WULU DA SUKU RA_AGUNG"),
    );
    expect(ok(toAksara("Dalu", { useMurda: true }))).toBe(ak("DA LA SUKU")); // no murda at all
  });

  test("JGST murda onsets convert directly without the option", () => {
    // The tokenizer maps unique JGST diacritics straight to murda aksara;
    // plain onsets stay plain (literal JGST round-trip).
    expect(ok(toAksara("ḅudi"))).toBe(ak("BA_MURDA SUKU DA WULU"));
    expect(ok(toAksara("ṇabi"))).toBe(ak("NA_MURDA BA WULU"));
  });

  test("honorific style applies murda to every aksara that has one", () => {
    // KAJ I Bab I A.2 example Nabi Nuh: both na and ba take murda.
    // v3: joined writing (KAJ I p.24); the KAJ example is written joined.
    expect(ok(toAksara("Nabi Nuh", { useMurda: true }))).toBe(
      ak("NA_MURDA BA_MURDA WULU NA_MURDA SUKU WIGNYAN"),
    );
  });

  test("all 11 murda round-trip via their dotted JGST literals", () => {
    // v2: TA MURDA's canonical literal is ṭha (decision 1). The other ten
    // were already lossless (probe 2026-08-13).
    for (const w of [
      "ṇa",
      "ḳa",
      "ṭha",
      "śa",
      "p̣a",
      "jña",
      "g̣a",
      "ḅa",
      "c̣a",
      "j̣a",
      "ṟa",
    ]) {
      const fwd = toAksara(w);
      expect(fwd.kind, w).toBe("success");
      if (fwd.kind !== "success") continue;
      const back = toLatin(fwd.output, { scheme: "jgst" });
      expect(back.kind, w).toBe("success");
      if (back.kind !== "success") continue;
      expect(back.output, w).toBe(w);
    }
  });

  test("plain tha still resolves to TTA; the murda reading needs ṭha", () => {
    expect(ok(toAksara("tha"))).toBe(ak("TTA")); // PUJL school spelling wins
    expect(ok(toAksara("ṭha"))).toBe(ak("TA_MURDA")); // TA MURDA via its dotted literal
  });
});
