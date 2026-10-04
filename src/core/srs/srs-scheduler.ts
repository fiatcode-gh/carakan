import type { SrsItemRow } from "../db/schema.ts";

/**
 * Pure SRS scheduler: a 4-grade SM-2 variant with pinned intervals.
 * again -> 10 min, reps 0, ease -0.2
 * hard  -> interval unchanged (due in max(interval, 1) days), ease -0.15
 * good  -> reps+1, interval reps==1 ? 1 : round(prev * ease)
 * easy  -> reps+1, interval reps==1 ? 6 : round(prev * ease * 1.3), ease +0.15
 * ease  -> clamp [1.3, 3.0], initial 2.5
 */
export type ReviewGrade = "again" | "hard" | "good" | "easy";

export type SrsState = SrsItemRow;

export const MINUTE = 60_000;
export const DAY = 86_400_000;

export const initialEase = 2.5;
export const minEase = 1.3;
export const maxEase = 3.0;

const clampEase = (ease: number) => Math.min(Math.max(ease, minEase), maxEase);

export function newItem(itemId: string, now: number): SrsState {
  return {
    itemId,
    intervalDays: 0,
    ease: initialEase,
    repetitions: 0,
    dueAt: now,
    lastReviewedAt: null,
  };
}

export function grade(s: SrsState, g: ReviewGrade, now: number): SrsState {
  switch (g) {
    case "again":
      return {
        ...s,
        repetitions: 0,
        intervalDays: 0,
        ease: clampEase(s.ease - 0.2),
        dueAt: now + 10 * MINUTE,
        lastReviewedAt: now,
      };
    case "hard":
      return {
        ...s,
        ease: clampEase(s.ease - 0.15),
        dueAt: now + Math.max(s.intervalDays, 1) * DAY,
        lastReviewedAt: now,
      };
    case "good": {
      const repetitions = s.repetitions + 1;
      const intervalDays =
        repetitions === 1 ? 1 : Math.round(s.intervalDays * s.ease);
      return {
        ...s,
        repetitions,
        intervalDays,
        dueAt: now + intervalDays * DAY,
        lastReviewedAt: now,
      };
    }
    case "easy": {
      const repetitions = s.repetitions + 1;
      const intervalDays =
        repetitions === 1 ? 6 : Math.round(s.intervalDays * s.ease * 1.3);
      return {
        ...s,
        repetitions,
        intervalDays,
        ease: clampEase(s.ease + 0.15),
        dueAt: now + intervalDays * DAY,
        lastReviewedAt: now,
      };
    }
  }
}
