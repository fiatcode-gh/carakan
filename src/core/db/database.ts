import { openDB, type IDBPDatabase } from "idb";
import {
  DB_NAME,
  DB_VERSION,
  MISTAKE_LOGS,
  SRS_DUE_AT_INDEX,
  SRS_ITEMS,
  UNIT_COMPLETIONS,
  type CarakanDbSchema,
} from "./schema.ts";

export type CarakanDb = IDBPDatabase<CarakanDbSchema>;

export function openCarakanDb(name: string = DB_NAME): Promise<CarakanDb> {
  return openDB<CarakanDbSchema>(name, DB_VERSION, {
    upgrade(db) {
      const srs = db.createObjectStore(SRS_ITEMS, { keyPath: "itemId" });
      srs.createIndex(SRS_DUE_AT_INDEX, "dueAt");
      db.createObjectStore(UNIT_COMPLETIONS, { keyPath: "unitId" });
      db.createObjectStore(MISTAKE_LOGS, { keyPath: "confusionPair" });
    },
  });
}
