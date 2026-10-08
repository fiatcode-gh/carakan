import { get } from "svelte/store";
import { expect, test } from "vitest";
import { LearnerProgress } from "../../../src/core/db/learner-progress.ts";
import { ReviewQueue } from "../../../src/core/srs/review-queue.ts";
import { ReviewSession } from "../../../src/features/review/review-session.ts";
import { openFreshDb } from "../core/db-helpers.ts";

const T0 = Date.UTC(2026, 7, 12, 9);

async function setup(items: string[]) {
  const db = await openFreshDb();
  const queue = new ReviewQueue(db);
  const progress = new LearnerProgress(db);
  for (const id of items) await queue.enqueue(id, T0);
  const session = new ReviewSession({
    queue,
    erased: progress.erased,
    now: () => T0,
  });
  await session.refresh();
  return { queue, session, progress };
}

const shown = (session: ReviewSession) => {
  const state = get(session.state);
  return state.kind === "ready"
    ? state.items.map((i) => [i.itemId, i.revealed])
    : [];
};

test("[P-R14] every item starts hidden and reveal flips only that card", async () => {
  const { session } = await setup(["ha", "na", "ca"]);
  expect(shown(session)).toEqual([
    ["ca", false],
    ["ha", false],
    ["na", false],
  ]);
  await session.reveal("ha");
  expect(shown(session)).toEqual([
    ["ca", false],
    ["ha", true],
    ["na", false],
  ]);
});

test("[P-R14] revealing an id that is not listed changes nothing", async () => {
  const { session } = await setup(["ha"]);
  await session.reveal("zz");
  expect(shown(session)).toEqual([["ha", false]]);
  await session.refresh();
  expect(shown(session)).toEqual([["ha", false]]);
});

test("[P-R14] a refresh keeps a revealed card revealed while it is listed", async () => {
  const { queue, session } = await setup(["ha"]);
  await session.reveal("ha");
  await queue.enqueue("na", T0);
  await session.refresh();
  expect(shown(session)).toEqual([
    ["ha", true],
    ["na", false],
  ]);
});

test("[P-R15] a card graded again returns hidden at the end", async () => {
  const { session } = await setup(["ha", "na"]);
  await session.reveal("ha");
  await session.grade("ha", "again");
  expect(shown(session)).toEqual([
    ["na", false],
    ["ha", false],
  ]);
});

test("[P-R15] a card graded good is gone and shows hidden when it is due again", async () => {
  const { queue, session } = await setup(["ha", "na"]);
  await session.reveal("na");
  await session.grade("na", "good");
  expect(shown(session)).toEqual([["ha", false]]);
  // A missed review from 20 minutes ago puts na back in the due window.
  await queue.grade("na", "again", T0 - 20 * 60_000);
  await session.reveal("none");
  expect(shown(session)).toEqual([
    ["na", false],
    ["ha", false],
  ]);
});

test("[P-R15] a reveal queued behind a pending grade applies after it", async () => {
  const { session } = await setup(["ha", "na"]);
  await session.reveal("ha");
  const grading = session.grade("ha", "again");
  const revealing = session.reveal("ha");
  await Promise.all([grading, revealing]);
  expect(shown(session)).toEqual([
    ["na", false],
    ["ha", true],
  ]);
});

test("[P-T07] erased progress forgets revealed cards", async () => {
  const { queue, session, progress } = await setup(["ha"]);
  await session.reveal("ha");
  expect(shown(session)).toEqual([["ha", true]]);
  await progress.erase();
  await queue.enqueue("ha", T0);
  await session.refresh();
  expect(shown(session)).toEqual([["ha", false]]);
});
