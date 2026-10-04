import type { DBSchema } from "idb";

export const DB_NAME = "carakan";
export const DB_VERSION = 1;

export const SRS_ITEMS = "srsItems";
export const UNIT_COMPLETIONS = "unitCompletions";
export const MISTAKE_LOGS = "mistakeLogs";
export const SRS_DUE_AT_INDEX = "dueAt";

/** All times are epoch milliseconds. */
export interface SrsItemRow {
  itemId: string;
  intervalDays: number;
  ease: number;
  repetitions: number;
  dueAt: number;
  lastReviewedAt: number | null;
}

export interface UnitCompletionRow {
  unitId: string;
  completedAt: number;
}

export interface MistakeLogRow {
  confusionPair: string;
  count: number;
  lastAt: number;
}

export interface CarakanDbSchema extends DBSchema {
  srsItems: {
    key: string;
    value: SrsItemRow;
    indexes: { dueAt: number };
  };
  unitCompletions: {
    key: string;
    value: UnitCompletionRow;
  };
  mistakeLogs: {
    key: string;
    value: MistakeLogRow;
  };
}
