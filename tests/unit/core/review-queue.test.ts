import { expect, test } from "vitest";
import { ReviewQueue } from "../../../src/core/srs/review-queue.ts";
import { DAY } from "../../../src/core/srs/srs-scheduler.ts";
import { openFreshDb } from "./db-helpers.ts";

const now = Date.UTC(2026, 7, 12, 9);

async function setup() {
  const db = await openFreshDb();
  return { db, queue: new ReviewQueue(db) };
}

test("[P-R08] enqueue creates a due-now item; duplicate enqueue keeps one row", async () => {
  const { queue } = await setup();
  await queue.enqueue("ha", now);
  await queue.enqueue("ha", now);
  expect(await queue.dueItems(now)).toEqual(["ha"]);
});

test("[P-R08] dueItems returns only items at or before now", async () => {
  const { queue } = await setup();
  await queue.enqueue("ha", now);
  await queue.enqueue("na", now);
  await queue.grade("na", "good", now);
  expect(await queue.dueItems(now)).toEqual(["ha"]);
});

test("[P-R08] grade moves the due date forward", async () => {
  const { queue } = await setup();
  await queue.enqueue("ha", now);
  await queue.grade("ha", "good", now);
  expect(await queue.dueItems(now)).toEqual([]);
  expect(await queue.dueItems(now + DAY)).toEqual(["ha"]);
});

test("[P-R08] dueItems is oldest first", async () => {
  const { queue } = await setup();
  await queue.enqueue("b", now);
  await queue.enqueue("a", now - 5000);
  expect(await queue.dueItems(now)).toEqual(["a", "b"]);
});

test("[P-R08] due ties come back in itemId order", async () => {
  const { queue } = await setup();
  for (const id of ["c", "a", "b"]) await queue.enqueue(id, now);
  expect(await queue.dueItems(now)).toEqual(["a", "b", "c"]);
});

test("[P-R08] dueStates returns full states", async () => {
  const { queue } = await setup();
  await queue.enqueue("ha", now);
  expect(await queue.dueStates(now)).toEqual([
    {
      itemId: "ha",
      intervalDays: 0,
      ease: 2.5,
      repetitions: 0,
      dueAt: now,
      lastReviewedAt: null,
    },
  ]);
});

test("[P-R08] enqueue emits changes", async () => {
  const { queue } = await setup();
  let emitted = 0;
  queue.changes.subscribe(() => emitted++);
  await queue.enqueue("ha", now);
  expect(emitted).toBe(1);
});

test("[P-R08] enqueue of an existing item leaves it untouched", async () => {
  const { queue } = await setup();
  await queue.enqueue("ha", now);
  await queue.grade("ha", "good", now);
  const before = await queue.dueStates(now + DAY);
  await queue.enqueue("ha", now + 5 * DAY);
  expect(await queue.dueStates(now + DAY)).toEqual(before);
});

test("[P-R08] grade of a missing item throws", async () => {
  const { queue } = await setup();
  await expect(queue.grade("zz", "good", now)).rejects.toThrow(
    "srs item not found: zz",
  );
});

test("[P-R08] grade emits changes", async () => {
  const { queue } = await setup();
  await queue.enqueue("ha", now);
  let emitted = 0;
  queue.changes.subscribe(() => emitted++);
  await queue.grade("ha", "good", now);
  expect(emitted).toBe(1);
});
