import { expect, test } from "vitest";
import { MistakeLogRepository } from "../../../src/core/db/mistake-log-repository.ts";
import { openFreshDb } from "./db-helpers.ts";

async function setup() {
  return new MistakeLogRepository(await openFreshDb());
}

test("[P-R09] record emits changes", async () => {
  const repo = await setup();
  let emitted = 0;
  repo.changes.subscribe(() => emitted++);
  await repo.record("da-dha", 1);
  expect(emitted).toBe(1);
});

test("[P-R09] recover does not emit changes", async () => {
  const repo = await setup();
  await repo.record("da-dha", 1);
  let emitted = 0;
  repo.changes.subscribe(() => emitted++);
  await repo.recover("da-dha", 2);
  expect(emitted).toBe(0);
});

test("[P-R09] recover of an unknown pair is a no-op", async () => {
  const repo = await setup();
  await repo.recover("ta-tha", 2);
  expect(await repo.topPairs()).toEqual([]);
});

test("[P-R09] topPairs sorts by count desc, ties by pair key asc", async () => {
  const repo = await setup();
  await repo.record("ta-tha", 1);
  await repo.record("da-dha", 1);
  await repo.record("la-ra", 1);
  await repo.record("la-ra", 2);
  const pairs = (await repo.topPairs()).map((r) => r.confusionPair);
  expect(pairs).toEqual(["la-ra", "da-dha", "ta-tha"]);
});

test("[P-R09] topPairs honours the limit (default 3)", async () => {
  const repo = await setup();
  for (const p of ["a", "b", "c", "d"]) await repo.record(p, 1);
  expect(await repo.topPairs()).toHaveLength(3);
  expect(await repo.topPairs(1)).toHaveLength(1);
});
