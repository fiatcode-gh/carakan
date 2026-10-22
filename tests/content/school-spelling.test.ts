import { describe, expect, test } from "vitest";
import { Word } from "../../src/content/word.ts";
import { kajRulesetId, rulesets } from "../../src/engine/index.ts";
import { readContentJson } from "../support/content-files.ts";

function word(canonical: string, displayPujl: string | null = null): Word {
  return new Word({
    id: "x",
    canonical,
    displayPujl,
    gloss: "g",
    requiredGlyphs: [],
    audioKey: "x",
    source: "test",
    rulesetId: kajRulesetId,
  });
}

const rawWords = readContentJson("words.json")["words"] as Record<
  string,
  unknown
>[];

// The contract's "JGST-only character" test as a whitelist (D11); it also
// catches combining dots.
const school = /^[A-Za-zéèÉÈ]+([ -][A-Za-zéèÉÈ]+)*$/;

describe.each(rulesets)("[P-D04] [P-D08] school spelling: $id", (ruleset) => {
  const words = rawWords.map((raw) => Word.fromJson(raw, ruleset.id));

  test("every corpus word displays in school spelling, never JGST", () => {
    for (const w of words) {
      expect(
        school.test(w.display) && !w.display.includes("/"),
        `${w.id}: ${w.display}`,
      ).toBe(true);
    }
  });

  test("no override equals the derived form", () => {
    for (const w of words.filter((w) => w.displayPujl !== null)) {
      expect(w.displayPujl, `${w.id}: redundant displayPujl`).not.toBe(
        w.derivedSchoolSpelling,
      );
    }
  });
});

describe("[P-D04] school spelling", () => {
  test("display is derived from the canonical via the engine", () => {
    const cases: ReadonlyArray<readonly [string, string]> = [
      ["kŕasa", "krasa"],
      ["pṛlu", "prelu"],
      ["sětỿa", "setya"],
      ["paḍa", "padha"],
      ["baṭi", "bathi"],
      ["ñata", "nyata"],
      ["kaṙtika", "kartika"],
      ["cacaḥ", "cacah"],
      ["bapak/", "bapak"],
      ["ṅombé", "ngombé"],
      ["saté", "saté"],
      ["iki", "iki"],
      ["ěnḍog/", "endhog"],
      ["haji", "haji"],
    ];
    for (const [canonical, expected] of cases) {
      expect(word(canonical).display, canonical).toBe(expected);
    }
  });

  test("override wins; without it a murda word is not school spelling", () => {
    expect(word("ḅima", "Bima").display).toBe("Bima");
    expect(school.test(word("ḅima").display)).toBe(false);
  });
});
