import { describe, expect, test } from "vitest";
import { deriveGlyphs } from "../../src/content/glyph-derivation.ts";
import { Word } from "../../src/content/word.ts";
import { toAksara, toLatin } from "../../src/engine/index.ts";
import { readContentJson } from "../support/content-files.ts";

const rawWords = readContentJson("words.json")["words"] as Record<
  string,
  unknown
>[];
const words = rawWords.map((raw) => Word.fromJson(raw));

describe("[P-D04] corpus round trip", () => {
  test("every corpus word round-trips and its glyph set matches the engine (spec 7, decision 5)", () => {
    expect(words.length).toBeGreaterThanOrEqual(20);
    for (const w of words) {
      const res = toAksara(w.canonical);
      expect(res.kind, `${w.id}: toAksara(${w.canonical})`).toBe("success");
      if (res.kind !== "success") continue;
      const back = toLatin(res.output, { scheme: "jgst" });
      expect(back.kind, `${w.id}: toLatin`).toBe("success");
      if (back.kind !== "success") continue;
      // v3 D9: a vowel-initial canonical has a silent ha carrier that the
      // JGST back-form spells out (KAJ I p.12 hasěm/ = asem).
      const expectedBack = w.hasSilentHaCarrier
        ? `h${w.canonical}`
        : w.canonical;
      expect(back.output, `${w.id}: canonical round-trip (D9)`).toBe(
        expectedBack,
      );
      const { ids, caps } = deriveGlyphs(res.output);
      expect(ids, `${w.id}: glyphs`).toEqual(w.requiredGlyphs);
      expect(caps, `${w.id}: caps`).toEqual(w.requiredCaps);
    }
  });

  test("every canonical, alone and in a comma sentence, survives a JGST round trip (visible pangkon before a letter, M2)", () => {
    function aksara(latin: string): string {
      const r = toAksara(latin);
      expect(r.kind, latin).toBe("success");
      return r.kind === "success" ? r.output : "";
    }

    function roundTrips(latin: string): void {
      const a = aksara(latin);
      const back = toLatin(a, { scheme: "jgst" });
      expect(back.kind, latin).toBe("success");
      expect(
        aksara(back.kind === "success" ? back.output : ""),
        `toAksara(toLatin(toAksara("${latin}"), jgst))`,
      ).toBe(a);
    }

    for (const w of words) roundTrips(w.canonical);
    for (let i = 0; i + 1 < words.length; i++) {
      roundTrips(`${words[i]!.canonical}, ${words[i + 1]!.canonical}`);
    }
  });

  test("no seed word stores an aksara string (spec 7)", () => {
    for (const map of rawWords) {
      for (const key of ["canonical", "displayPujl", "gloss"]) {
        const value = map[key];
        const stored = typeof value === "string" ? value : "";
        expect(
          /[\uA980-\uA9DF]/.test(stored),
          `${key} of ${String(map["id"])} must not contain aksara`,
        ).toBe(false);
      }
    }
  });
});
