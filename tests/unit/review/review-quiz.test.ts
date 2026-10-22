import { get } from "svelte/store";
import { expect, test, vi } from "vitest";
import { GlyphInfoTable } from "../../../src/content/glyph-info-table.ts";
import { LearnerProgress } from "../../../src/core/db/learner-progress.ts";
import { ReviewQueue } from "../../../src/core/srs/review-queue.ts";
import { DAY, MINUTE } from "../../../src/core/srs/srs-scheduler.ts";
import { kajRulesetId } from "../../../src/engine/index.ts";
import {
  createReviewQuiz,
  type ReviewQuiz,
  type ReviewQuizState,
} from "../../../src/features/review/review-quiz.ts";
import { reviewSession } from "../../../src/features/review/review-session.ts";
import { loadView } from "../../support/content-files.ts";
import { openFreshDb } from "../core/db-helpers.ts";

const T0 = Date.UTC(2026, 7, 12, 9);

async function setup(ids: readonly string[]) {
  const db = await openFreshDb();
  const queue = new ReviewQueue(db);
  const progress = new LearnerProgress(db);
  const content = await loadView(kajRulesetId);
  // Distinct due times fix the due order: the first id is the oldest.
  for (const [i, id] of ids.entries()) {
    await queue.enqueue(id, T0 - (ids.length - i) * 1000);
  }
  // The taught pool is every stored card, so a lone due card needs company
  // for its distractors; these are stored but not due.
  for (const id of ["ta", "wa"]) {
    await queue.enqueue(id, T0);
    await queue.grade(id, "good", T0);
  }
  const singletons = new Map<string, unknown>();
  const services = {
    singleton: <T>(key: string, create: () => T): T => {
      if (!singletons.has(key)) singletons.set(key, create());
      return singletons.get(key) as T;
    },
    reviewQueue: queue,
    progress,
    now: () => T0,
    content,
    glyphInfo: GlyphInfoTable.build(content),
    seedSource: () => 7,
  };
  const quiz = createReviewQuiz(services);
  return { quiz, queue, review: reviewSession(services) };
}

const stateOf = (quiz: ReviewQuiz): ReviewQuizState => get(quiz.state);

function question(quiz: ReviewQuiz) {
  const s = stateOf(quiz);
  if (s.kind !== "question") throw new Error(`expected question: ${s.kind}`);
  return s;
}

async function answer(quiz: ReviewQuiz, right: boolean) {
  const q = question(quiz);
  if (q.exercise.kind !== "glyphToSound") throw new Error("not glyph→sound");
  const index = right
    ? q.exercise.answerIndex
    : (q.exercise.answerIndex + 1) % q.exercise.options.length;
  await quiz.answer(index);
  const s = stateOf(quiz);
  if (s.kind !== "feedback") throw new Error(`expected feedback: ${s.kind}`);
  expect(s.correct).toBe(right);
}

test("[P-R17] nothing due is the empty state", async () => {
  const { quiz } = await setup([]);
  await quiz.start();
  expect(stateOf(quiz)).toEqual({ kind: "empty" });
});

test("[P-R17] due cards come up in due order, always glyph to sound with options", async () => {
  const { quiz } = await setup(["ha", "na", "ca"]);
  await quiz.start();
  const seen: string[] = [];
  for (let i = 0; i < 3; i++) {
    const q = question(quiz);
    if (q.exercise.kind !== "glyphToSound") throw new Error("not glyph→sound");
    expect(q.exercise.options.length).toBeGreaterThanOrEqual(2);
    expect([q.number, q.total]).toEqual([i + 1, 3]);
    seen.push(q.itemId);
    await answer(quiz, true);
    quiz.continue();
  }
  expect(seen).toEqual(["ha", "na", "ca"]);
  expect(stateOf(quiz)).toEqual({ kind: "done", correct: 3, total: 3 });
});

test("[P-R17] a right answer grades good", async () => {
  const { quiz, queue } = await setup(["ha"]);
  await quiz.start();
  await answer(quiz, true);
  const [row] = await queue.allStates();
  expect(row?.repetitions).toBe(1);
  expect(row?.dueAt).toBe(T0 + DAY);
});

test("[P-R17] a wrong answer grades again and the card comes back in the same run", async () => {
  const { quiz, queue, review } = await setup(["ha", "na"]);
  await quiz.start();
  expect(question(quiz).itemId).toBe("ha");
  await answer(quiz, false);
  const ha = (await queue.allStates()).find((s) => s.itemId === "ha");
  expect(ha?.dueAt).toBe(T0 + 10 * MINUTE);
  quiz.continue();
  expect(question(quiz).itemId).toBe("na");
  await answer(quiz, true);
  quiz.continue();
  const again = question(quiz);
  expect([again.itemId, again.number, again.total]).toEqual(["ha", 3, 3]);
  await answer(quiz, true);
  quiz.continue();
  expect(stateOf(quiz)).toEqual({ kind: "done", correct: 2, total: 3 });
  // Right in the second pass: the retry set drops it; it is due tomorrow.
  expect(get(review.state)).toEqual({ kind: "empty" });
});

test("[P-R17] a missed card stays in the retry list after the run", async () => {
  const { quiz, review } = await setup(["ha"]);
  await quiz.start();
  await answer(quiz, false);
  quiz.continue();
  await answer(quiz, false);
  const state = get(review.state);
  expect(state.kind).toBe("ready");
  expect(state.kind === "ready" && state.items.map((i) => i.itemId)).toEqual([
    "ha",
  ]);
});

test("[P-R17] an id unknown to the glyph table is skipped, ungraded and still due", async () => {
  const { quiz, queue } = await setup(["no-such-glyph", "ha"]);
  await quiz.start();
  const q = question(quiz);
  expect([q.itemId, q.number, q.total]).toEqual(["ha", 1, 1]);
  await answer(quiz, true);
  quiz.continue();
  expect(stateOf(quiz)).toEqual({ kind: "done", correct: 1, total: 1 });
  expect(await queue.dueItems(T0)).toEqual(["no-such-glyph"]);
});

test("[P-R17] a rejected grade write keeps the question; retry stores it once", async () => {
  const { quiz, queue } = await setup(["ha"]);
  await quiz.start();
  const q = question(quiz);
  const write = vi
    .spyOn(queue, "grade")
    .mockRejectedValueOnce(new Error("idb closed"));
  await quiz.answer(q.exercise.answerIndex);
  expect(get(quiz.failed)).toBe(true);
  expect(stateOf(quiz).kind).toBe("question");
  await quiz.retry();
  expect(get(quiz.failed)).toBe(false);
  expect(stateOf(quiz).kind).toBe("feedback");
  expect(write).toHaveBeenCalledTimes(2);
  const [row] = await queue.allStates();
  expect(row?.repetitions).toBe(1);
  write.mockRestore();
});

test("[P-R17] two concurrent retries grade the failed answer once", async () => {
  const { quiz, queue } = await setup(["ha"]);
  await quiz.start();
  const q = question(quiz);
  const write = vi
    .spyOn(queue, "grade")
    .mockRejectedValueOnce(new Error("idb closed"));
  await quiz.answer(q.exercise.answerIndex === 0 ? 1 : 0);
  expect(get(quiz.failed)).toBe(true);
  await Promise.all([quiz.retry(), quiz.retry()]);
  // One failed write and exactly one stored retry.
  expect(write).toHaveBeenCalledTimes(2);
  const s = stateOf(quiz);
  expect(s.kind === "feedback" && s.total).toBe(2);
  quiz.continue();
  await answer(quiz, true);
  quiz.continue();
  expect(stateOf(quiz)).toEqual({ kind: "done", correct: 1, total: 2 });
  write.mockRestore();
});

test("[P-R17] a retry with nothing pending does nothing", async () => {
  const { quiz, queue } = await setup(["ha"]);
  await quiz.start();
  const write = vi.spyOn(queue, "grade");
  await quiz.retry();
  expect(write).not.toHaveBeenCalled();
  expect(stateOf(quiz).kind).toBe("question");
  write.mockRestore();
});

test("[P-R17] a storage failure on start is the error state, not empty", async () => {
  const { quiz, queue } = await setup(["ha"]);
  const read = vi
    .spyOn(queue, "allStates")
    .mockRejectedValue(new Error("idb closed"));
  await quiz.start();
  expect(stateOf(quiz)).toEqual({ kind: "error" });
  read.mockRestore();
  await quiz.start();
  expect(question(quiz).itemId).toBe("ha");
});

test("[P-R17] a failed due query on start is the error state, not empty", async () => {
  const { quiz, queue } = await setup(["ha"]);
  const read = vi
    .spyOn(queue, "dueStates")
    .mockRejectedValueOnce(new Error("idb closed"));
  await quiz.start();
  expect(stateOf(quiz)).toEqual({ kind: "error" });
  read.mockRestore();
  await quiz.start();
  expect(question(quiz).itemId).toBe("ha");
});
