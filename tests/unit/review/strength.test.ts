import { expect, test } from "vitest";
import {
  grade,
  newItem,
  type SrsState,
} from "../../../src/core/srs/srs-scheduler.ts";
import {
  strengthLabelKey,
  strengthLevel,
} from "../../../src/features/review/strength.ts";

const T0 = Date.UTC(2026, 7, 12, 9);

test("[P-R18] a new card has level 1", () => {
  expect(strengthLevel(newItem("ha", T0))).toBe(1);
});

test("[P-R18] one good grade (interval 1 day) is level 2", () => {
  expect(strengthLevel(grade(newItem("ha", T0), "good", T0))).toBe(2);
});

test("[P-R18] the interval picks the level: 2 → 2, 3 → 3, 20 → 3, 21 → 4", () => {
  const at = (intervalDays: number): SrsState => ({
    ...newItem("ha", T0),
    repetitions: 3,
    intervalDays,
  });
  expect([2, 3, 20, 21].map((d) => strengthLevel(at(d)))).toEqual([2, 3, 3, 4]);
});

test("[P-R18] an again after successes drops back to level 1", () => {
  let s = newItem("ha", T0);
  for (let i = 0; i < 4; i++) s = grade(s, "good", T0);
  expect(strengthLevel(s)).toBeGreaterThan(2);
  expect(strengthLevel(grade(s, "again", T0))).toBe(1);
});

test("[P-R18] a stored legacy hard row with no repetitions is level 1", () => {
  expect(strengthLevel(grade(newItem("ha", T0), "hard", T0))).toBe(1);
});

test("[P-R18] label keys: 1 new, 2 fair, 3 and 4 strong", () => {
  expect(([1, 2, 3, 4] as const).map(strengthLabelKey)).toEqual([
    "strengthNew",
    "strengthFair",
    "strengthStrong",
    "strengthStrong",
  ]);
});
