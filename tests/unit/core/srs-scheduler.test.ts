import { expect, test } from "vitest";
import {
  DAY,
  grade,
  MINUTE,
  newItem,
  type SrsState,
} from "../../../src/core/srs/srs-scheduler.ts";

const now = Date.UTC(2026, 7, 12, 9);

test("[P-R08] a new item is due now with initial ease", () => {
  expect(newItem("ha", now)).toEqual({
    itemId: "ha",
    intervalDays: 0,
    ease: 2.5,
    repetitions: 0,
    dueAt: now,
    lastReviewedAt: null,
  });
});

test("[P-R08] again: 10 minutes, repetitions reset, ease -0.2", () => {
  const next = grade(newItem("ha", now), "again", now);
  expect(next.dueAt).toBe(now + 10 * MINUTE);
  expect(next.repetitions).toBe(0);
  expect(next.intervalDays).toBe(0);
  expect(next.ease).toBeCloseTo(2.3, 9);
  expect(next.lastReviewedAt).toBe(now);
});

test("[P-R08] hard: one day, ease -0.15", () => {
  const next = grade(newItem("ha", now), "hard", now);
  expect(next.dueAt).toBe(now + DAY);
  expect(next.ease).toBeCloseTo(2.35, 9);
});

test("[P-R08] good on a new item: one day, repetitions 1", () => {
  const next = grade(newItem("ha", now), "good", now);
  expect(next.dueAt).toBe(now + DAY);
  expect(next.repetitions).toBe(1);
  expect(next.intervalDays).toBe(1);
});

test("[P-R08] easy on a new item: six days, ease +0.15", () => {
  const next = grade(newItem("ha", now), "easy", now);
  expect(next.dueAt).toBe(now + 6 * DAY);
  expect(next.repetitions).toBe(1);
  expect(next.ease).toBeCloseTo(2.65, 9);
});

test("[P-R08] pinned interval ladder: 1d good -> 3d -> 8d -> 20d", () => {
  let item: SrsState = newItem("ha", now);
  item = grade(item, "good", now);
  expect(item.intervalDays).toBe(1);
  item = grade(item, "good", now + DAY);
  expect(item.intervalDays).toBe(3);
  item = grade(item, "good", now + 4 * DAY);
  expect(item.intervalDays).toBe(8);
  item = grade(item, "good", now + 12 * DAY);
  expect(item.intervalDays).toBe(20);
});

test("[P-R08] hard keeps the interval", () => {
  const good = grade(newItem("ha", now), "good", now);
  const next = grade(good, "hard", now);
  expect(next.intervalDays).toBe(1);
  expect(next.ease).toBeCloseTo(2.35, 9);
});

test("[P-R08] easy multiplies by 1.3", () => {
  const good = grade(newItem("ha", now), "good", now);
  expect(grade(good, "easy", now).intervalDays).toBe(3);
});

test("[P-R08] ease clamps to [1.3, 3.0]", () => {
  let item = newItem("ha", now);
  for (let i = 0; i < 10; i++) item = grade(item, "again", now);
  expect(item.ease).toBe(1.3);
  item = newItem("ha", now);
  for (let i = 0; i < 10; i++) item = grade(item, "easy", now);
  expect(item.ease).toBe(3.0);
});

test("[P-R08] hard on a graded item schedules its current interval in days", () => {
  const second = grade(grade(newItem("ha", now), "good", now), "good", now);
  expect(second.intervalDays).toBe(3);
  expect(grade(second, "hard", now).dueAt).toBe(now + 3 * DAY);
});
