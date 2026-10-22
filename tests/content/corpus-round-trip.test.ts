import { describe, expect, test } from "vitest";
import { deriveGlyphs } from "../../src/content/glyph-derivation.ts";
import { rulesetGlyphIds } from "../../src/content/glyph-universe.ts";
import { Word } from "../../src/content/word.ts";
import {
  pedomanRulesetId,
  rulesets,
  toAksara,
  toLatin,
} from "../../src/engine/index.ts";
import { readContentJson } from "../support/content-files.ts";

const rawWords = readContentJson("words.json")["words"] as Record<
  string,
  unknown
>[];

// fa/va is one letter in Pedoman 2002 (Ped p.16): `v` writes PA + cecak telu,
// which reads back as `f` (contract 2.2.8). Every other mismatch fails.
const pedomanReadBack = new Map([
  ["vila", "fila"],
  ["vakum", "fakum/"],
]);

describe.each(rulesets)("[P-D04] [P-D08] corpus round trip: $id", (ruleset) => {
  const words = rawWords.map((raw) => Word.fromJson(raw, ruleset.id));
  const glyphIds = rulesetGlyphIds(ruleset);

  test("every corpus word round-trips and its glyph set matches the engine (spec 7, decision 5)", () => {
    expect(words.length).toBeGreaterThanOrEqual(20);
    for (const w of words) {
      const res = toAksara(w.canonical, { ruleset: ruleset.id });
      expect(res.kind, `${w.id}: toAksara(${w.canonical})`).toBe("success");
      if (res.kind !== "success") continue;
      const back = toLatin(res.output, { scheme: "jgst" });
      expect(back.kind, `${w.id}: toLatin`).toBe("success");
      if (back.kind !== "success") continue;
      // v3 D9: a vowel-initial canonical has a silent ha carrier that the
      // JGST back-form spells out (KAJ I p.12 hasěm/ = asem).
      const expectedBack =
        (ruleset.id === pedomanRulesetId
          ? pedomanReadBack.get(w.id)
          : undefined) ??
        (w.hasSilentHaCarrier ? `h${w.canonical}` : w.canonical);
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
      const r = toAksara(latin, { ruleset: ruleset.id });
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

  test("every word's required glyphs exist in this ruleset", () => {
    for (const w of words) {
      for (const id of w.requiredGlyphs) {
        expect(glyphIds.has(id), `${w.id}: ${id}`).toBe(true);
      }
    }
  });
});

describe("[P-D04] [P-D08] corpus storage", () => {
  test("no seed word stores an aksara string (spec 7)", () => {
    const aksara = /[\uA980-\uA9DF]/;
    for (const map of rawWords) {
      for (const key of ["canonical", "displayPujl", "gloss"]) {
        const value = map[key];
        const stored = typeof value === "string" ? value : "";
        expect(
          aksara.test(stored),
          `${key} of ${String(map["id"])} must not contain aksara`,
        ).toBe(false);
      }
      const overrides = (map["byRuleset"] ?? {}) as Record<
        string,
        Record<string, unknown>
      >;
      for (const [rulesetId, override] of Object.entries(overrides)) {
        for (const [key, value] of Object.entries(override)) {
          const strings = typeof value === "string" ? [value] : value;
          for (const s of strings as string[]) {
            expect(
              aksara.test(s),
              `${rulesetId}.${key} of ${String(map["id"])} must not contain aksara`,
            ).toBe(false);
          }
        }
      }
    }
  });
});
