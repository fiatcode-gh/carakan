import type { SrsItemRow } from "../../core/db/schema.ts";

export type StrengthLevel = 1 | 2 | 3 | 4;

export interface CardStrength {
  readonly itemId: string;
  readonly level: StrengthLevel;
}

/**
 * Memory strength read from the stored schedule alone: no repetitions is new
 * (an `again` resets them), then the interval picks the level.
 */
export function strengthLevel(
  s: Pick<SrsItemRow, "repetitions" | "intervalDays">,
): StrengthLevel {
  if (s.repetitions === 0) return 1;
  if (s.intervalDays < 3) return 2;
  if (s.intervalDays < 21) return 3;
  return 4;
}

/** Message key of the label shown beside the bar (baru, lumayan, kuat). */
export function strengthLabelKey(
  level: StrengthLevel,
): "strengthNew" | "strengthFair" | "strengthStrong" {
  if (level === 1) return "strengthNew";
  return level === 2 ? "strengthFair" : "strengthStrong";
}
