import { get } from "svelte/store";
import { expect, test, vi } from "vitest";
import { ConfusionPair } from "../../../src/content/confusion-pair.ts";
import { GlyphInfoTable } from "../../../src/content/glyph-info-table.ts";
import { Unit } from "../../../src/content/unit.ts";
import { Word } from "../../../src/content/word.ts";
import { MistakeLogRepository } from "../../../src/core/db/mistake-log-repository.ts";
import { UnitCompletionRepository } from "../../../src/core/db/unit-completion-repository.ts";
import { ReviewQueue } from "../../../src/core/srs/review-queue.ts";
import { javaneseChar, kajRulesetId } from "../../../src/engine/index.ts";
import {
  generateExercises,
  type Exercise,
} from "../../../src/features/lessons/exercise-generator.ts";
import {
  groupByGlyph,
  LessonSession,
  type LessonState,
} from "../../../src/features/lessons/lesson-session.ts";
import { openFreshDb } from "../core/db-helpers.ts";

const u1 = new Unit({
  id: "u1",
  name: "Baris pertama: ha na ca ra ka",
  glyphs: ["ha", "na", "ca", "ra", "ka"],
  unlock: "previous",
});

const word = (id: string, gloss: string, requiredGlyphs: string[]) =>
  new Word({
    id,
    canonical: id,
    gloss,
    requiredGlyphs,
    audioKey: id,
    source: "author",
    rulesetId: kajRulesetId,
  });

const corpus = [
  word("kaca", "kaca", ["ca", "ka"]),
  word("cara", "cara", ["ca", "ra"]),
  word("nara", "orang", ["na", "ra"]),
  word("raka", "kakak", ["ra", "ka"]),
  word("kana", "sana", ["na", "ka"]),
  word("kara", "kara", ["ra", "ka"]),
];

const NOW = 1_800_000_000_000;

async function setup(
  options: {
    glyphInfo?: GlyphInfoTable;
    confusionPairs?: ConfusionPair[];
    corpus?: Word[];
    seed?: number;
  } = {},
) {
  const db = await openFreshDb();
  const completions = new UnitCompletionRepository(db);
  const mistakes = new MistakeLogRepository(db);
  const reviewQueue = new ReviewQueue(db);
  const session = new LessonSession({
    corpus: options.corpus ?? corpus,
    glyphInfo: options.glyphInfo ?? new GlyphInfoTable(new Map()),
    completions,
    reviewQueue,
    mistakes,
    confusionPairs: options.confusionPairs ?? [],
    now: () => NOW,
    seedSource: () => options.seed ?? 42,
  });
  const states: LessonState[] = [];
  session.state.subscribe((s) => states.push(s));
  return { session, completions, mistakes, reviewQueue, states };
}

const answerOf = (e: Exercise) => e.answerIndex;
const byGlyph = (a: Exercise, b: Exercise) =>
  a.glyphId.localeCompare(b.glyphId);

const planFor = (unit: Unit, taught: ReadonlySet<string>, seed = 42) =>
  groupByGlyph(
    generateExercises({
      unit,
      taughtGlyphs: taught,
      corpus,
      seed,
      glyphInfo: new GlyphInfoTable(new Map()),
    }),
    unit.glyphs,
  );

/** One legal step of a lesson, answering questions right. */
async function step(session: LessonSession): Promise<void> {
  const s = get(session.state);
  if (s.kind === "meet") await session.meetNext();
  else if (s.kind === "trace") await session.finishTrace();
  else if (s.kind === "question") await session.answer(s.exercise.answerIndex);
  else if (s.kind === "feedback") await session.continueAfterFeedback();
}

/** Plays right answers to the end, or stops on the last question's feedback. */
async function playAll(
  session: LessonSession,
  stopOnLastFeedback = false,
): Promise<void> {
  for (let guard = 0; guard < 500; guard++) {
    const s = get(session.state);
    if (s.kind === "done") return;
    if (stopOnLastFeedback && s.kind === "feedback" && s.number === s.total) {
      return;
    }
    await step(session);
  }
  throw new Error("lesson did not finish");
}

test("[P-B08] a new session is initial until started", async () => {
  const { session } = await setup();
  expect(get(session.state)).toEqual({ kind: "initial" });
});

test("[P-B19] per glyph: meet, trace, that glyph's questions, then the next glyph, then done", async () => {
  const { session, states } = await setup();
  session.start(u1, new Set());
  const plan = planFor(u1, new Set());
  await playAll(session);
  const shape = states
    .filter((s) => s.kind !== "feedback" && s.kind !== "initial")
    .map((s) =>
      s.kind === "question"
        ? `question:${s.exercise.glyphId}`
        : s.kind === "meet" || s.kind === "trace"
          ? `${s.kind}:${s.index}`
          : s.kind,
    );
  expect(shape).toEqual([
    ...u1.glyphs.flatMap((g, i) => [
      `meet:${i}`,
      `trace:${i}`,
      ...plan.filter((e) => e.glyphId === g).map(() => `question:${g}`),
    ]),
    "done",
  ]);
  const meets = states.filter((s) => s.kind === "meet");
  expect(meets.every((s) => s.total === 5 && s.traceable)).toBe(true);
  const questions = states.filter((s) => s.kind === "question");
  expect(questions.map((s) => s.number)).toEqual(plan.map((_, i) => i + 1));
  for (const q of questions) {
    expect(q.exercise.glyphId).toBe(u1.glyphs[q.index]);
  }
});

test("[P-B19] a unit of non-base glyphs never enters the trace state", async () => {
  const { session, states } = await setup();
  const u2 = new Unit({
    id: "u2",
    name: "Wulu dan suku",
    glyphs: ["wulu", "suku"],
    unlock: "previous",
  });
  session.start(u2, new Set());
  await playAll(session);
  const kinds = states.map((s) => s.kind);
  expect(kinds).not.toContain("trace");
  expect(kinds.filter((k) => k === "meet")).toHaveLength(2);
  expect(
    states.filter((s) => s.kind === "meet").every((s) => !s.traceable),
  ).toBe(true);
  expect(kinds.at(-1)).toBe("done");
});

test("[P-B19] finishTrace in meet and meetNext in trace are ignored", async () => {
  const { session } = await setup();
  session.start(u1, new Set());
  await session.finishTrace();
  expect(get(session.state).kind).toBe("meet");
  await session.meetNext();
  await session.meetNext();
  expect(get(session.state).kind).toBe("trace");
});

test("[P-B19] the regrouped plan is a permutation of the generator output", () => {
  const raw = planFor(u1, new Set());
  const grouped = groupByGlyph(raw, u1.glyphs);
  expect([...grouped].sort(byGlyph)).toEqual([...raw].sort(byGlyph));
  expect(grouped.map((e) => u1.glyphs.indexOf(e.glyphId))).toEqual(
    [...grouped.map((e) => u1.glyphs.indexOf(e.glyphId))].sort((a, b) => a - b),
  );
  expect(
    groupByGlyph([raw[1]!, raw[0]!], ["zz"]).map((e) => e.glyphId),
  ).toEqual([raw[1]!.glyphId, raw[0]!.glyphId]);
});

test("[P-B08] a glyph missing from the table meets as an empty GlyphInfo", async () => {
  const { session } = await setup();
  session.start(u1, new Set());
  const state = get(session.state);
  expect(state.kind === "meet" && state.glyph).toEqual({
    id: "",
    name: "",
    char: "",
    pujl: "",
  });
});

test("[P-B09] a unit with no exercises completes right after the last meet", async () => {
  const { session, completions } = await setup();
  const unit = new Unit({
    id: "ux",
    name: "x",
    glyphs: ["noPujlGlyph"],
    unlock: "previous",
  });
  session.start(unit, new Set());
  await session.meetNext();
  expect(get(session.state)).toEqual({ kind: "done", total: 0, correct: 0 });
  expect(await completions.completedUnitIds()).toContain("ux");
});

test("[P-B19] a glyph without an exercise goes meet, trace if base, then the next meet or done", async () => {
  const ids = [
    ...["ha", "na", "ca", "ra", "ka", "da", "ta"],
    ...["sa", "wa", "la", "pa", "dha", "ja"],
  ];
  const unit = new Unit({
    id: "big",
    name: "big",
    glyphs: ids,
    unlock: "previous",
  });
  const { session } = await setup();
  const asked = new Set(planFor(unit, new Set()).map((e) => e.glyphId));
  const skipped = ids.filter((g) => !asked.has(g));
  expect(skipped).toHaveLength(1);
  const at = ids.indexOf(skipped[0]!);
  session.start(unit, new Set());
  for (;;) {
    const s = get(session.state);
    if (s.kind === "meet" && s.index === at) break;
    await step(session);
  }
  await session.meetNext();
  expect(get(session.state)).toMatchObject({ kind: "trace", index: at });
  await session.finishTrace();
  expect(get(session.state)).toMatchObject(
    at + 1 < ids.length ? { kind: "meet", index: at + 1 } : { kind: "done" },
  );
});

test("[P-B14] (W05) answering every exercise shows feedback for the last one, then continuing completes the unit and enqueues SRS", async () => {
  const { session, completions, reviewQueue, states } = await setup();
  session.start(u1, new Set());
  const plan = planFor(u1, new Set());
  await playAll(session, true);
  expect(get(session.state).kind).toBe("feedback");
  expect(await completions.completedUnitIds()).not.toContain("u1");
  await session.continueAfterFeedback();
  expect(get(session.state)).toEqual({
    kind: "done",
    total: plan.length,
    correct: plan.length,
  });
  expect(states.at(-1)?.kind).toBe("done");
  expect(await completions.completedUnitIds()).toContain("u1");
  expect(await reviewQueue.dueItems(NOW)).toEqual(
    expect.arrayContaining(["ha", "na", "ca", "ra", "ka"]),
  );
});

test("[P-B14] completion enqueues every unit glyph exactly once", async () => {
  const { session, reviewQueue } = await setup();
  session.start(u1, new Set());
  await playAll(session);
  const due = await reviewQueue.dueItems(NOW);
  expect([...due].sort()).toEqual([...u1.glyphs].sort());
});

test("[P-B12] a wrong answer reports feedback without completing", async () => {
  const { session, completions } = await setup();
  session.start(u1, new Set());
  await session.meetNext();
  await session.finishTrace();
  const [first] = planFor(u1, new Set());
  await session.answer((answerOf(first!) + 1) % 2);
  const state = get(session.state);
  expect(state.kind).toBe("feedback");
  expect(state.kind === "feedback" && state.correct).toBe(false);
  expect(await completions.completedUnitIds()).toEqual(new Set());
});

test("[P-B12] feedback carries the question number, total and chosen index", async () => {
  const { session } = await setup();
  session.start(u1, new Set());
  await session.meetNext();
  await session.finishTrace();
  const plan = planFor(u1, new Set());
  await session.answer(answerOf(plan[0]!));
  const state = get(session.state);
  expect(state).toMatchObject({
    kind: "feedback",
    number: 1,
    total: plan.length,
    selectedIndex: answerOf(plan[0]!),
    correct: true,
  });
});

test("[P-B13] a wrong answer on a confusion-pair option records the mistake", async () => {
  const unit = new Unit({
    id: "uX",
    name: "da/dha",
    glyphs: ["da", "dha"],
    unlock: "previous",
  });
  const table = new GlyphInfoTable(
    new Map([
      [
        "da",
        {
          id: "da",
          name: "da",
          char: javaneseChar("JAVANESE LETTER DA"),
          pujl: "da",
        },
      ],
      [
        "dha",
        {
          id: "dha",
          name: "dha",
          char: javaneseChar("JAVANESE LETTER DA MAHAPRANA"),
          pujl: "dha",
        },
      ],
    ]),
  );
  const { session, mistakes } = await setup({
    glyphInfo: table,
    confusionPairs: [new ConfusionPair({ a: "da", b: "dha", label: "da/dha" })],
  });
  session.start(unit, new Set());
  await session.meetNext();
  await session.finishTrace();
  const question = get(session.state);
  expect(question.kind).toBe("question");
  if (question.kind !== "question") return;
  // Two glyphs, no other taught glyphs: two options, so the wrong one is the pair member.
  expect(
    question.exercise.kind === "wordReading"
      ? 0
      : question.exercise.options.length,
  ).toBe(2);
  await session.answer(1 - answerOf(question.exercise));
  const top = await mistakes.topPairs(1);
  expect(top).toHaveLength(1);
  expect(top[0]).toEqual({ confusionPair: "da-dha", count: 1, lastAt: NOW });
});

test("[P-B13] a wrong answer outside any confusion pair logs nothing", async () => {
  const { session, mistakes } = await setup();
  session.start(u1, new Set());
  await session.meetNext();
  await session.finishTrace();
  const [first] = planFor(u1, new Set());
  await session.answer((answerOf(first!) + 1) % 2);
  expect(await mistakes.topPairs()).toEqual([]);
});

test("[P-B13] a double answer logs the mistake once", async () => {
  const unit = new Unit({
    id: "uX",
    name: "da/dha",
    glyphs: ["da", "dha"],
    unlock: "previous",
  });
  const table = new GlyphInfoTable(
    new Map([
      [
        "da",
        {
          id: "da",
          name: "da",
          char: javaneseChar("JAVANESE LETTER DA"),
          pujl: "da",
        },
      ],
      [
        "dha",
        {
          id: "dha",
          name: "dha",
          char: javaneseChar("JAVANESE LETTER DA MAHAPRANA"),
          pujl: "dha",
        },
      ],
    ]),
  );
  const { session, mistakes } = await setup({
    glyphInfo: table,
    confusionPairs: [new ConfusionPair({ a: "da", b: "dha", label: "da/dha" })],
  });
  session.start(unit, new Set());
  await session.meetNext();
  await session.finishTrace();
  const question = get(session.state);
  if (question.kind !== "question") throw new Error("expected a question");
  const wrong = 1 - answerOf(question.exercise);
  await Promise.all([session.answer(wrong), session.answer(wrong)]);
  expect((await mistakes.topPairs())[0]?.count).toBe(1);
});

test("[P-B12] calls that do not match the current state are ignored", async () => {
  const { session, states } = await setup();
  await session.answer(0);
  await session.continueAfterFeedback();
  await session.meetNext();
  await session.finishTrace();
  expect(states).toEqual([{ kind: "initial" }]);

  session.start(u1, new Set());
  await session.answer(0);
  await session.continueAfterFeedback();
  await session.finishTrace();
  expect(get(session.state).kind).toBe("meet");

  await session.meetNext();
  expect(get(session.state).kind).toBe("trace");
  await session.meetNext();
  await session.answer(0);
  await session.continueAfterFeedback();
  expect(get(session.state).kind).toBe("trace");

  await session.finishTrace();
  await session.finishTrace();
  await session.meetNext();
  await session.continueAfterFeedback();
  expect(get(session.state)).toMatchObject({ kind: "question", number: 1 });
});

test("[P-B10] (W06) the taught glyphs reach the generator: unit 2 questions get 4 options, not 2", async () => {
  const u2 = new Unit({
    id: "u2",
    name: "Wulu dan suku",
    glyphs: ["wulu", "suku"],
    unlock: "previous",
  });
  const optionCount = async (taught: Set<string>) => {
    const { session } = await setup();
    session.start(u2, taught);
    await session.meetNext();
    const s = get(session.state);
    if (s.kind !== "question" || s.exercise.kind === "wordReading") {
      throw new Error("expected a recognition question");
    }
    return s.exercise.options.length;
  };
  expect(await optionCount(new Set())).toBe(2);
  expect(await optionCount(new Set(u1.glyphs))).toBe(4);
});

test("[P-B08] starting again resets the session", async () => {
  const { session } = await setup();
  session.start(u1, new Set());
  await session.meetNext();
  session.start(u1, new Set());
  expect(get(session.state)).toMatchObject({ kind: "meet", index: 0 });
  await session.meetNext();
  expect(get(session.state).kind).toBe("trace");
});

test("[P-S10] a rejected completion write keeps the feedback and retry completes the unit", async () => {
  const { session, completions } = await setup();
  session.start(u1, new Set());
  await playAll(session, true);
  const failing = vi
    .spyOn(completions, "complete")
    .mockRejectedValueOnce(new Error("idb closed"));
  await session.continueAfterFeedback();
  expect(get(session.state).kind).toBe("feedback");
  expect(get(session.failed)).toBe(true);
  failing.mockRestore();
  await session.retry();
  expect(get(session.state).kind).toBe("done");
  expect(get(session.failed)).toBe(false);
  expect(await completions.completedUnitIds()).toContain("u1");
});

test("[P-S10] a rejected mistake write keeps the question and a later answer clears the failure", async () => {
  const unit = new Unit({
    id: "uX",
    name: "da/dha",
    glyphs: ["da", "dha"],
    unlock: "previous",
  });
  const chars = new GlyphInfoTable(
    new Map([
      [
        "da",
        {
          id: "da",
          name: "da",
          char: javaneseChar("JAVANESE LETTER DA"),
          pujl: "da",
        },
      ],
      [
        "dha",
        {
          id: "dha",
          name: "dha",
          char: javaneseChar("JAVANESE LETTER DA MAHAPRANA"),
          pujl: "dha",
        },
      ],
    ]),
  );
  const { session, mistakes } = await setup({
    glyphInfo: chars,
    confusionPairs: [
      new ConfusionPair({ a: "da", b: "dha", label: "da – dha" }),
    ],
  });
  session.start(unit, new Set());
  await session.meetNext();
  await session.finishTrace();
  const question = get(session.state);
  if (question.kind !== "question") throw new Error("no question");
  const failing = vi
    .spyOn(mistakes, "record")
    .mockRejectedValue(new Error("idb closed"));
  await session.answer((question.exercise.answerIndex + 1) % 2);
  expect(get(session.state).kind).toBe("question");
  expect(get(session.failed)).toBe(true);
  failing.mockRestore();
  await session.retry();
  expect(get(session.state).kind).toBe("feedback");
  expect(get(session.failed)).toBe(false);
});
