import { get } from "svelte/store";
import { expect, test, vi } from "vitest";
import { rulesetGlyphIds } from "../../../src/content/glyph-universe.ts";
import { LearnerProgress } from "../../../src/core/db/learner-progress.ts";
import { ReviewQueue } from "../../../src/core/srs/review-queue.ts";
import {
  kajRulesetId,
  pedomanRulesetId,
  rulesetById,
} from "../../../src/engine/index.ts";
import {
  ReviewSession,
  reviewSession,
} from "../../../src/features/review/review-session.ts";
import { loadView } from "../../support/content-files.ts";
import { openFreshDb } from "../core/db-helpers.ts";

const T0 = Date.UTC(2026, 7, 12, 9);
const DAY = 86_400_000;
const MINUTE = 60_000;

async function setup(
  now: () => number = () => T0,
  shows: (itemId: string) => boolean = () => true,
  rank: (itemId: string) => number = () => 0,
) {
  const db = await openFreshDb();
  const queue = new ReviewQueue(db);
  const progress = new LearnerProgress(db);
  const session = new ReviewSession({
    queue,
    erased: progress.erased,
    now,
    shows,
    rank,
  });
  return { queue, session, progress };
}

const ids = (session: ReviewSession) => {
  const state = get(session.state);
  return state.kind === "ready" ? state.items.map((i) => i.itemId) : [];
};

test("[P-R02] an empty queue reports the empty state", async () => {
  const { session } = await setup();
  await session.refresh();
  expect(get(session.state)).toEqual({ kind: "empty" });
});

test("[P-R02] due items appear in due order", async () => {
  const { queue, session } = await setup();
  await queue.enqueue("ha", T0);
  await queue.enqueue("na", T0);
  await session.refresh();
  expect(ids(session)).toEqual(["ha", "na"]);
});

test("[P-R05] grading advances the queue", async () => {
  const { queue, session } = await setup();
  await queue.enqueue("ha", T0);
  await queue.enqueue("na", T0);
  await session.refresh();
  await session.grade("ha", "good");
  expect(ids(session)).toEqual(["na"]);
});

test("[P-R10] an enqueue after the session exists refreshes the list", async () => {
  const { queue, session } = await setup();
  await queue.enqueue("ha", T0);
  // The queue's change listener queued a refresh; this one runs after it.
  await session.refresh();
  expect(ids(session)).toEqual(["ha"]);
});

test("[P-R05] grading again keeps the card for an immediate retest", async () => {
  const { queue, session } = await setup();
  await queue.enqueue("ha", T0);
  await queue.enqueue("na", T0);
  await session.refresh();
  await session.grade("ha", "again");
  expect(ids(session)).toEqual(["na", "ha"]);
});

test("[P-R02] a ready list carries the item ids only", async () => {
  const { queue, session } = await setup();
  await queue.enqueue("ha", T0);
  await session.refresh();
  expect(get(session.state)).toEqual({
    kind: "ready",
    items: [{ itemId: "ha" }],
  });
});

test("[P-R05] a missed card stays listed across a restart", async () => {
  const { queue, session } = await setup(() => T0 + 15 * MINUTE);
  await queue.enqueue("ha", T0);
  await queue.grade("ha", "again", T0);
  await session.refresh();
  expect(ids(session)).toEqual(["ha"]);
});

test("operations run in call order", async () => {
  const { queue, session } = await setup();
  await queue.enqueue("ha", T0);
  await queue.enqueue("na", T0);
  void session.refresh();
  const done = session.grade("ha", "again");
  void session.refresh();
  await done;
  await session.refresh();
  expect(ids(session)).toEqual(["na", "ha"]);
});

test("[P-S10] a rejected read or grade leaves an error state that a refresh clears", async () => {
  const { queue, session } = await setup();
  await queue.enqueue("ha", T0);
  await session.refresh();
  const read = vi
    .spyOn(queue, "dueStates")
    .mockRejectedValueOnce(new Error("idb closed"));
  await session.refresh();
  expect(get(session.state)).toEqual({ kind: "error" });
  read.mockRestore();
  await session.refresh();
  expect(ids(session)).toEqual(["ha"]);

  const write = vi
    .spyOn(queue, "grade")
    .mockRejectedValueOnce(new Error("idb closed"));
  await session.grade("ha", "good");
  expect(get(session.state)).toEqual({ kind: "error" });
  write.mockRestore();
  await session.refresh();
  expect(ids(session)).toEqual(["ha"]);
});

test("[P-T07] erased progress empties the list, including the retry set", async () => {
  const { queue, session, progress } = await setup();
  await queue.enqueue("ha", T0);
  await session.refresh();
  await session.grade("ha", "again");
  expect(ids(session)).toEqual(["ha"]);
  await progress.erase();
  await session.refresh();
  expect(get(session.state)).toEqual({ kind: "empty" });
});

test("[P-T07] a grade racing the erase ends in the empty state", async () => {
  const { queue, session, progress } = await setup();
  await queue.enqueue("ha", T0);
  await session.refresh();
  const racing = session.grade("ha", "again");
  await progress.erase();
  await racing;
  await session.refresh();
  expect(get(session.state)).toEqual({ kind: "empty" });
});

test("[P-R16] cards the active ruleset lacks stay queued but are not listed", async () => {
  const pedoman = rulesetGlyphIds(rulesetById(pedomanRulesetId));
  const kaj = rulesetGlyphIds(rulesetById(kajRulesetId));
  const hidden = await setup(undefined, (id) => pedoman.has(id));
  await hidden.queue.enqueue("caMurda", T0);
  await hidden.queue.enqueue("ka", T0);
  await hidden.session.refresh();
  expect(ids(hidden.session)).toEqual(["ka"]);
  expect(
    (await hidden.queue.dueStates(T0)).map((s) => s.itemId).sort(),
  ).toEqual(["caMurda", "ka"]);

  const shown = await setup(undefined, (id) => kaj.has(id));
  await shown.queue.enqueue("caMurda", T0);
  await shown.queue.enqueue("ka", T0);
  await shown.session.refresh();
  expect(ids(shown.session)).toEqual(["caMurda", "ka"]);
});

test("[P-R16] a retry of a hidden card is not listed", async () => {
  const pedoman = rulesetGlyphIds(rulesetById(pedomanRulesetId));
  const { queue, session } = await setup(undefined, (id) => pedoman.has(id));
  await queue.enqueue("caMurda", T0);
  await session.grade("caMurda", "again");
  expect(ids(session)).toEqual([]);
});

test("[P-R16] reviewSession under Pedoman lists a pasangan card and hides a murda card", async () => {
  const db = await openFreshDb();
  const queue = new ReviewQueue(db);
  const progress = new LearnerProgress(db);
  const session = reviewSession({
    singleton: (_key, make) => make(),
    reviewQueue: queue,
    progress,
    now: () => T0,
    content: await loadView(pedomanRulesetId),
  });
  await queue.enqueue("pasangan-ka", T0);
  await queue.enqueue("caMurda", T0);
  await session.refresh();
  expect(ids(session)).toEqual(["pasangan-ka"]);
});

const strengths = (session: ReviewSession) =>
  get(session.strengths).map((s) => [s.itemId, s.level]);

test("[P-R18] strengths lists every shown card in rank order and follows grades, enqueues and erase", async () => {
  const order = ["na", "ha", "ca"];
  const { queue, session, progress } = await setup(
    undefined,
    (id) => id !== "hidden",
    (id) => (order.includes(id) ? order.indexOf(id) : 99),
  );
  await queue.enqueue("ca", T0);
  await queue.enqueue("hidden", T0);
  await queue.enqueue("ha", T0);
  await session.refresh();
  expect(strengths(session)).toEqual([
    ["ha", 1],
    ["ca", 1],
  ]);

  // A card that is not due yet still shows.
  await session.grade("ha", "good");
  expect(strengths(session)).toEqual([
    ["ha", 2],
    ["ca", 1],
  ]);

  // W03: an enqueue refreshes the strengths too.
  await queue.enqueue("na", T0);
  await vi.waitFor(() =>
    expect(strengths(session)).toEqual([
      ["na", 1],
      ["ha", 2],
      ["ca", 1],
    ]),
  );

  await progress.erase();
  await vi.waitFor(() => expect(strengths(session)).toEqual([]));
});

test("[P-R18] cards of equal rank are ordered by item id", async () => {
  const { queue, session } = await setup();
  await queue.enqueue("pa", T0);
  await queue.enqueue("ha", T0);
  await session.refresh();
  expect(strengths(session).map(([id]) => id)).toEqual(["ha", "pa"]);
});

test("[P-R17] grade resolves true when stored and false on a rejected write", async () => {
  const { queue, session } = await setup();
  await queue.enqueue("ha", T0);
  await session.refresh();
  expect(await session.grade("ha", "good")).toBe(true);
  const write = vi
    .spyOn(queue, "grade")
    .mockRejectedValueOnce(new Error("idb closed"));
  expect(await session.grade("ha", "good")).toBe(false);
  expect(get(session.state)).toEqual({ kind: "error" });
  write.mockRestore();
});
