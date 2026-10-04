import { readFileSync } from "node:fs";
import { join } from "node:path";
import { get } from "svelte/store";
import { expect, test, vi } from "vitest";
import { ConfusionPair } from "../../../src/content/confusion-pair.ts";
import { loadContent } from "../../../src/content/content-repository.ts";
import { GlyphInfoTable } from "../../../src/content/glyph-info-table.ts";
import { Word } from "../../../src/content/word.ts";
import { MistakeLogRepository } from "../../../src/core/db/mistake-log-repository.ts";
import { javaneseChar } from "../../../src/engine/index.ts";
import {
  DrillSession,
  type DrillState,
} from "../../../src/features/review/drill-session.ts";
import { openFreshDb } from "../core/db-helpers.ts";

const NOW = Date.UTC(2026, 7, 12);

const pairs = [
  new ConfusionPair({ a: "da", b: "dha", label: "da – dha" }),
  new ConfusionPair({ a: "ta", b: "tha", label: "ta – tha" }),
];

const word = (id: string, gloss: string, requiredGlyphs: string[]) =>
  new Word({
    id,
    canonical: id,
    gloss,
    requiredGlyphs,
    audioKey: id,
    source: "author",
  });

const corpus = [
  word("padha", "sama", ["pa", "dha"]),
  word("dhadha", "dada", ["dha"]),
  word("dada", "dada", ["da"]),
  word("dadi", "menjadi", ["da", "wulu"]),
  word("tata", "tata", ["ta"]),
  word("bathi", "untung", ["ba", "tha", "wulu"]),
];

async function setup(
  options: {
    pairs?: readonly ConfusionPair[];
    corpus?: readonly Word[];
    glyphInfo?: GlyphInfoTable;
  } = {},
) {
  const mistakes = new MistakeLogRepository(await openFreshDb());
  const session = new DrillSession({
    pairs: options.pairs ?? pairs,
    corpus: options.corpus ?? corpus,
    glyphInfo: options.glyphInfo ?? new GlyphInfoTable(new Map()),
    mistakes,
    seedSource: () => 42,
    now: () => NOW,
  });
  return { mistakes, session };
}

const ready = (session: DrillSession) => {
  const state = get(session.state);
  if (state.kind !== "ready") throw new Error("drill is not ready");
  return state;
};

test("[P-R09] no mistakes: no drill plan", async () => {
  const { session } = await setup();
  await session.refresh();
  expect(get(session.state)).toEqual<DrillState>({ kind: "empty" });
});

test("[P-R09] a recorded da/dha mistake targets the da-dha pair", async () => {
  const { mistakes, session } = await setup();
  await mistakes.record("da-dha", NOW);
  await session.refresh();
  expect(ready(session).pairKey).toBe("da-dha");
});

test("[P-R09] an unknown pair key gives no drill", async () => {
  const { mistakes, session } = await setup();
  await mistakes.record("zz-yy", NOW);
  await session.refresh();
  expect(get(session.state).kind).toBe("empty");
});

test("[P-R09] exercises force discrimination between pair members", async () => {
  const { mistakes, session } = await setup();
  await mistakes.record("da-dha", NOW);
  await session.refresh();
  const { exercises } = ready(session);
  expect(exercises.length).toBeGreaterThan(0);
  const daChar = javaneseChar("JAVANESE LETTER DA");
  const dhaChar = javaneseChar("JAVANESE LETTER DA MAHAPRANA");
  for (const e of exercises) {
    if (e.kind === "glyphToSound") {
      if (e.glyphId === "da") expect(e.options).toContain("dha");
      if (e.glyphId === "dha") expect(e.options).toContain("da");
    } else if (e.kind === "soundToGlyph") {
      if (e.glyphId === "da") expect(e.options).toContain(dhaChar);
      if (e.glyphId === "dha") expect(e.options).toContain(daChar);
    }
  }
});

test("[P-R10] a mistake recorded after the session exists fills an empty drill", async () => {
  const { mistakes, session } = await setup();
  await session.refresh();
  expect(get(session.state).kind).toBe("empty");
  await mistakes.record("da-dha", NOW);
  await expect.poll(() => get(session.state).kind).toBe("ready");
});

test("[P-R10] a right answer recovers and a wrong one records", async () => {
  const { mistakes, session } = await setup();
  await mistakes.record("da-dha", NOW);
  await mistakes.record("da-dha", NOW);
  await session.refresh();
  const { exercises } = ready(session);
  const first = exercises[0]!;
  await session.answer(0, first.answerIndex);
  expect((await mistakes.topPairs(1))[0]?.count).toBe(1);
  await session.answer(0, (first.answerIndex + 1) % 4);
  expect((await mistakes.topPairs(1))[0]?.count).toBe(2);
  expect(ready(session).answered.get(0)).toBe(false);
});

test("[P-R11] the drill ignores its own record while ready", async () => {
  const { mistakes, session } = await setup();
  await mistakes.record("da-dha", NOW);
  await session.refresh();
  const before = ready(session).exercises;
  await session.answer(0, (before[0]!.answerIndex + 1) % 4);
  await mistakes.record("ta-tha", NOW);
  await mistakes.record("ta-tha", NOW);
  await mistakes.record("ta-tha", NOW);
  const after = ready(session);
  expect(after.pairKey).toBe("da-dha");
  expect(after.exercises).toBe(before);
});

test("[P-R13] a pair-readable corpus of 4 or more words yields word readings from the engine aksara", async () => {
  const readable = (canonical: string, glyphs: string[]) =>
    new Word({
      id: canonical,
      canonical,
      gloss: `gloss ${canonical}`,
      requiredGlyphs: glyphs,
      audioKey: canonical,
      source: "author",
    });
  const { mistakes, session } = await setup({
    corpus: [
      readable("dada", ["da"]),
      readable("ḍaḍa", ["dha"]),
      readable("daḍa", ["da", "dha"]),
      readable("ḍada", ["da", "dha"]),
      readable("tata", ["ta"]),
    ],
  });
  await mistakes.record("da-dha", NOW);
  await session.refresh();
  const readings = ready(session).exercises.flatMap((e) =>
    e.kind === "wordReading" ? [e] : [],
  );
  expect(readings.length).toBeGreaterThan(0);
  for (const r of readings) {
    expect(r.word.aksara).toMatch(/^[\ua980-\ua9df]+$/u);
  }
});

test("[P-R09] a suku-wulu drill never shows a bare combining mark", async () => {
  const content = await loadContent(async (path) =>
    readFileSync(join("public", path), "utf8"),
  );
  const { mistakes, session } = await setup({
    pairs: content.confusionPairs,
    corpus: content.words,
    glyphInfo: GlyphInfoTable.build(content),
  });
  await mistakes.record("suku-wulu", NOW);
  await session.refresh();
  const state = ready(session);
  expect(state.pairKey).toBe("suku-wulu");
  const strings = state.exercises.flatMap((e) =>
    e.kind === "wordReading" ? e.glossOptions : e.options,
  );
  expect(strings.length).toBeGreaterThan(0);
  for (const s of strings) {
    const r = s.codePointAt(0) ?? 0;
    expect(
      (r >= 0xa980 && r <= 0xa983) || (r >= 0xa9b3 && r <= 0xa9c0),
      `drill option "${s}" starts with a bare combining mark`,
    ).toBe(false);
  }
});

test("[P-R09] a rejected refresh leaves an error state that a refresh clears", async () => {
  const { mistakes, session } = await setup();
  await mistakes.record("da-dha", NOW);
  const failing = vi
    .spyOn(mistakes, "topPairs")
    .mockRejectedValueOnce(new Error("idb closed"));
  await session.refresh();
  expect(get(session.state)).toEqual<DrillState>({ kind: "error" });
  failing.mockRestore();
  await session.refresh();
  expect(ready(session).pairKey).toBe("da-dha");
});

test("[P-R10] a rejected answer write reports failure and can be answered again", async () => {
  const { mistakes, session } = await setup();
  await mistakes.record("da-dha", NOW);
  await session.refresh();
  const { exercises } = ready(session);
  const right = exercises[0]!.answerIndex;
  const failing = vi
    .spyOn(mistakes, "recover")
    .mockRejectedValueOnce(new Error("idb closed"));
  expect(await session.answer(0, right)).toBe(false);
  expect(ready(session).answered.has(0)).toBe(false);
  failing.mockRestore();
  expect(await session.answer(0, right)).toBe(true);
  expect(ready(session).answered.get(0)).toBe(true);
});
