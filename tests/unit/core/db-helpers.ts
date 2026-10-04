import "fake-indexeddb/auto";
import { openCarakanDb } from "../../../src/core/db/database.ts";

let counter = 0;

/** A fresh, isolated database per call. */
export function openFreshDb() {
  counter += 1;
  return openCarakanDb(`carakan-test-${counter}-${Math.random()}`);
}
