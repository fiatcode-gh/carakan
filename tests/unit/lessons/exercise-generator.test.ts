import { expect, test } from "vitest";
import { loadContent } from "../../../src/content/content-repository.ts";
import { GlyphInfoTable } from "../../../src/content/glyph-info-table.ts";
import { bitOf } from "../../../src/content/glyph-universe.ts";
import { Unit } from "../../../src/content/unit.ts";
import { Word } from "../../../src/content/word.ts";
import { javaneseChar, sandhanganById } from "../../../src/engine/index.ts";
import {
  generateExercises,
  type Exercise,
} from "../../../src/features/lessons/exercise-generator.ts";
import { loadFromPublic } from "../../support/content-files.ts";

const u2 = new Unit({
  id: "u2",
  name: "Wulu dan suku",
  glyphs: ["wulu", "suku"],
  unlock: "previous",
});

const word = (
  id: string,
  gloss: string,
  requiredGlyphs: string[],
  displayPujl?: string,
) =>
  new Word({
    id,
    canonical: id,
    gloss,
    requiredGlyphs,
    audioKey: id,
    source: "author",
    displayPujl: displayPujl ?? null,
  });

const corpus = [
  word("kuku", "kuku", ["ka", "suku"]),
  word("suku", "kaki", ["ka", "sa", "suku"]),
  word("wulu", "bulu", ["wa", "la", "suku"]),
  word("kira", "kira", ["ka", "ra", "wulu"]),
  word("niki", "ini", ["na", "ka", "wulu"]),
  word("hiki", "ini", ["ha", "ka", "wulu"], "iki"),
];

const taught = new Set(["ha", "na", "ca", "ra", "ka"]);
const empty = new GlyphInfoTable(new Map());

const plan = (extra: Partial<Parameters<typeof generateExercises>[0]> = {}) =>
  generateExercises({
    unit: u2,
    taughtGlyphs: taught,
    corpus,
    seed: 42,
    glyphInfo: empty,
    ...extra,
  });

const optionsOf = (e: Exercise): readonly string[] =>
  e.kind === "wordReading" ? e.glossOptions : e.options;

test("[P-B10] plan contains one recognition exercise per unit glyph and no word readings (vocabulary quiz stripped from the curriculum)", () => {
  const exercises = plan();
  expect(
    exercises.filter(
      (e) => e.kind === "glyphToSound" || e.kind === "soundToGlyph",
    ),
  ).toHaveLength(2);
  expect(exercises.filter((e) => e.kind === "wordReading")).toHaveLength(0);
});

test("[P-B10] recognition alternates by index: even glyph to sound, odd sound to glyph", () => {
  expect(plan().map((e) => e.kind)).toEqual(["glyphToSound", "soundToGlyph"]);
});

test("[P-B10] options are 4 unique strings with a valid answer index", () => {
  const exercises = plan({ includeWordReadings: true });
  expect(exercises.length).toBeGreaterThan(0);
  for (const e of exercises) {
    const options = optionsOf(e);
    expect(options).toHaveLength(4);
    expect(new Set(options).size).toBe(4);
    expect(e.answerIndex).toBeGreaterThanOrEqual(0);
    expect(e.answerIndex).toBeLessThanOrEqual(3);
  }
});

test("[P-B10] word readings stay available for the drill (includeWordReadings) and are readable with the taught set plus the unit", () => {
  const exercises = plan({ includeWordReadings: true });
  const readings = exercises.filter((e) => e.kind === "wordReading");
  expect(readings).toHaveLength(3);
  const taughtBits = [...taught, "wulu", "suku"].reduce(
    (acc, id) => acc | bitOf(id),
    0n,
  );
  for (const e of readings) {
    expect(e.word.readableBy(taughtBits, 0n), e.word.id).toBe(true);
    expect(e.glyphId).toBe(`word-${e.word.id}`);
    expect(optionsOf(e)[e.answerIndex]).toBe(e.word.gloss);
  }
});

test("[P-B10] word-reading gloss options never repeat a gloss even when the corpus has duplicates", () => {
  for (let seed = 0; seed < 30; seed++) {
    for (const e of plan({ includeWordReadings: true, seed })) {
      if (e.kind !== "wordReading") continue;
      expect(new Set(e.glossOptions).size).toBe(4);
    }
  }
});

test("[P-B10] confusion pair member is forced into the distractors for every seed", () => {
  const wuluSound = sandhanganById("suku")!.latinPujl;
  const wuluChar =
    javaneseChar("JAVANESE LETTER HA") + sandhanganById("wulu")!.char;
  let checked = 0;
  for (let seed = 0; seed < 60; seed++) {
    for (const e of plan({ seed, confusionPairs: [["wulu", "suku"]] })) {
      if (e.kind === "glyphToSound" && e.glyphId === "wulu") {
        expect(e.options).toContain(wuluSound);
        checked++;
      }
      if (e.kind === "soundToGlyph" && e.glyphId === "suku") {
        expect(e.options).toContain(wuluChar);
        checked++;
      }
    }
  }
  expect(checked).toBeGreaterThan(0);
});

test("[P-B10] same seed produces the identical plan (determinism)", () => {
  expect(plan()).toEqual(plan());
});

test("[P-B10] different seeds can order the plan differently", () => {
  const orders = new Set(
    Array.from({ length: 20 }, (_, seed) =>
      plan({ seed })
        .map((e) => e.glyphId)
        .join(","),
    ),
  );
  expect(orders.size).toBeGreaterThan(1);
});

test("[P-B10] at most 12 unit glyphs are exercised", () => {
  const big = new Unit({
    id: "big",
    name: "big",
    glyphs: [
      ...["ha", "na", "ca", "ra", "ka", "da", "ta", "sa", "wa", "la"],
      ...["pa", "dha", "ja", "ya", "nya"],
    ],
    unlock: "previous",
  });
  expect(plan({ unit: big, taughtGlyphs: new Set() })).toHaveLength(12);
});

test("[P-B10] a glyph without a pujl is skipped", () => {
  const unit = new Unit({
    id: "x",
    name: "x",
    glyphs: ["ha", "unknownGlyph"],
    unlock: "previous",
  });
  const exercises = plan({ unit, taughtGlyphs: new Set() });
  expect(exercises.map((e) => e.glyphId)).toEqual(["ha"]);
});

test("[P-B10] a pasangan glyph is asked as its base letter", () => {
  const unit = new Unit({
    id: "x",
    name: "x",
    glyphs: ["pasangan-ka"],
    unlock: "previous",
  });
  const exercises = plan({ unit, taughtGlyphs: new Set(["ka", "na", "ha"]) });
  expect(exercises).toHaveLength(1);
  const [only] = exercises;
  expect(only?.kind).toBe("glyphToSound");
  expect(only && optionsOf(only)[only.answerIndex]).toBe("ka");
});

test("[P-B10] (W06) a larger taught pool gives 4 options where an empty one gives 2", () => {
  expect(
    plan({ taughtGlyphs: new Set() }).map((e) => optionsOf(e).length),
  ).toEqual([2, 2]);
  expect(plan().map((e) => optionsOf(e).length)).toEqual([4, 4]);
});

test("[P-B10] sound options show the distractor's PUJL, never its id", () => {
  const sounds = new Set<string>();
  for (let seed = 0; seed < 40; seed++) {
    for (const e of plan({ seed })) {
      if (e.kind === "glyphToSound") e.options.forEach((o) => sounds.add(o));
    }
  }
  expect(sounds).toContain(sandhanganById("suku")!.latinPujl);
  expect(sounds).not.toContain("suku");
  expect(sounds).not.toContain("wulu");
});

test("[P-B10] a glyph is never offered next to another glyph with the same sound", async () => {
  // taMurda and tha both read "tha": two identical sounds would be two right answers.
  const real = GlyphInfoTable.build(await loadContent(loadFromPublic));
  const unit = new Unit({
    id: "x",
    name: "x",
    glyphs: ["taMurda", "ha"],
    unlock: "previous",
  });
  const thaChar = real.byId.get("tha")!.char;
  const taMurdaChar = real.byId.get("taMurda")!.char;
  let checked = 0;
  for (let seed = 0; seed < 60; seed++) {
    for (const e of plan({
      unit,
      seed,
      glyphInfo: real,
      taughtGlyphs: new Set(["tha", "ka", "ca", "ra"]),
    })) {
      expect(new Set(optionsOf(e)).size).toBe(optionsOf(e).length);
      if (e.kind === "glyphToSound" && e.glyphId === "taMurda") {
        expect(e.options.filter((o) => o === "tha")).toHaveLength(1);
        checked++;
      }
      if (e.kind === "soundToGlyph" && e.glyphId === "taMurda") {
        expect(e.options).toContain(taMurdaChar);
        expect(e.options).not.toContain(thaChar);
        checked++;
      }
    }
  }
  expect(checked).toBeGreaterThan(0);
});
