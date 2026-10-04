import { get } from "svelte/store";
import { expect, test, vi } from "vitest";
import { ReviewQueue } from "../../../src/core/srs/review-queue.ts";
import { ReviewSession } from "../../../src/features/review/review-session.ts";
import { openFreshDb } from "../core/db-helpers.ts";

const T0 = Date.UTC(2026, 7, 12, 9);
const DAY = 86_400_000;
const MINUTE = 60_000;

async function setup(now: () => number = () => T0) {
  const queue = new ReviewQueue(await openFreshDb());
  const session = new ReviewSession({ queue, now });
  return { queue, session };
}

const ids = (session: ReviewSession) => {
  const state = get(session.state);
  return state.kind === "ready" ? state.items.map((i) => i.itemId) : [];
};

const kinds = (session: ReviewSession) => {
  const state = get(session.state);
  return state.kind === "ready"
    ? state.items.map((i) => [i.itemId, i.kind, i.revealed])
    : [];
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
  // The queue's change listener queued a refresh; a no-op reveal flushes the chain.
  await session.reveal("none");
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

test("[P-R03] cards are grouped by situation: fresh, due, retry", async () => {
  let clock = T0;
  const { queue, session } = await setup(() => clock);
  await queue.enqueue("ha", T0);
  await queue.enqueue("na", T0);
  await queue.grade("na", "good", T0);
  clock = T0 + 2 * DAY;
  await session.refresh();
  expect(kinds(session)).toEqual([
    ["ha", "fresh", false],
    ["na", "due", false],
  ]);
  await session.grade("ha", "again");
  expect(kinds(session)).toEqual([
    ["na", "due", false],
    ["ha", "retry", false],
  ]);
});

test("[P-R05] a missed card stays grouped as retry across a restart", async () => {
  const { queue, session } = await setup(() => T0 + 15 * MINUTE);
  await queue.enqueue("ha", T0);
  await queue.grade("ha", "again", T0);
  await session.refresh();
  expect(kinds(session)).toEqual([["ha", "retry", false]]);
});

test("operations run in call order", async () => {
  const { queue, session } = await setup();
  await queue.enqueue("ha", T0);
  await queue.enqueue("na", T0);
  void session.refresh();
  void session.reveal("ha");
  const done = session.grade("ha", "again");
  void session.reveal("na");
  await done;
  await session.refresh();
  expect(kinds(session)).toEqual([
    ["na", "fresh", true],
    ["ha", "retry", false],
  ]);
});

test("[P-R05] a rejected read or grade leaves an error state that a refresh clears", async () => {
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
