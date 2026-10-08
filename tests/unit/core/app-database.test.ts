import { expect, test, vi } from "vitest";
import { MistakeLogRepository } from "../../../src/core/db/mistake-log-repository.ts";
import { UnitCompletionRepository } from "../../../src/core/db/unit-completion-repository.ts";
import { openFreshDb } from "./db-helpers.ts";

test("[P-S09] SRS row round-trips", async () => {
  const db = await openFreshDb();
  await db.put("srsItems", {
    itemId: "ha",
    intervalDays: 1,
    ease: 2.5,
    repetitions: 1,
    dueAt: 1000,
    lastReviewedAt: null,
  });
  const rows = await db.getAll("srsItems");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    itemId: "ha",
    intervalDays: 1,
    ease: 2.5,
    dueAt: 1000,
    lastReviewedAt: null,
  });
});

test("[P-S09] upsert by primary key replaces the row", async () => {
  const db = await openFreshDb();
  const base = { itemId: "ha", ease: 2.5, lastReviewedAt: null };
  await db.put("srsItems", {
    ...base,
    intervalDays: 1,
    repetitions: 1,
    dueAt: 1,
  });
  await db.put("srsItems", {
    ...base,
    intervalDays: 6,
    repetitions: 2,
    dueAt: 2,
  });
  const rows = await db.getAll("srsItems");
  expect(rows).toHaveLength(1);
  expect(rows[0]?.intervalDays).toBe(6);
});

test("[P-S09] unit completion insert and read", async () => {
  const db = await openFreshDb();
  const repo = new UnitCompletionRepository(db);
  await repo.complete("u1", 123);
  expect(await repo.completedUnitIds()).toEqual(new Set(["u1"]));
});

test("[P-S09] completing a unit twice upserts and emits after each write", async () => {
  const db = await openFreshDb();
  const repo = new UnitCompletionRepository(db);
  let emitted = 0;
  repo.changes.subscribe(() => emitted++);
  await repo.complete("u1", 1);
  await repo.complete("u1", 2);
  expect(emitted).toBe(2);
  const rows = await db.getAll("unitCompletions");
  expect(rows).toEqual([{ unitId: "u1", completedAt: 2 }]);
});

test("[P-S09] completeAll upserts every id in one write and emits once", async () => {
  const db = await openFreshDb();
  const repo = new UnitCompletionRepository(db);
  let emitted = 0;
  repo.changes.subscribe(() => emitted++);
  await repo.completeAll(["a", "b"], 7);
  expect(await db.getAll("unitCompletions")).toEqual([
    { unitId: "a", completedAt: 7 },
    { unitId: "b", completedAt: 7 },
  ]);
  expect(emitted).toBe(1);
  await repo.completeAll([], 9);
  expect(await db.getAll("unitCompletions")).toHaveLength(2);
  expect(emitted).toBe(1);
});

test("[P-S09] mistake log upsert accumulates", async () => {
  const db = await openFreshDb();
  const repo = new MistakeLogRepository(db);
  await repo.record("da-dha", 1);
  await repo.record("da-dha", 2);
  const rows = await db.getAll("mistakeLogs");
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ count: 2, lastAt: 2 });
});

test("[P-S09] mistake log recover decrements, floor 0", async () => {
  const db = await openFreshDb();
  const repo = new MistakeLogRepository(db);
  await repo.record("da-dha", 1);
  await repo.record("da-dha", 2);
  await repo.recover("da-dha", 3);
  expect((await db.getAll("mistakeLogs"))[0]?.count).toBe(1);
  await repo.recover("da-dha", 4);
  await repo.recover("da-dha", 5);
  const rows = await db.getAll("mistakeLogs");
  expect(rows[0]).toMatchObject({ count: 0, lastAt: 5 });
});

test("[P-S09] state survives closing and reopening the database", async () => {
  const name = `carakan-reopen-${Math.random()}`;
  const { openCarakanDb } = await import("../../../src/core/db/database.ts");
  const first = await openCarakanDb(name);
  await new UnitCompletionRepository(first).complete("u1", 5);
  first.close();
  const second = await openCarakanDb(name);
  expect(await new UnitCompletionRepository(second).completedUnitIds()).toEqual(
    new Set(["u1"]),
  );
});

test("[P-S10] a connection the browser closes reports it", async () => {
  const { openCarakanDb } = await import("../../../src/core/db/database.ts");
  const { forceCloseDatabase } = await import("fake-indexeddb");
  const { unwrap } = await import("idb");
  const terminated = vi.fn();
  const db = await openCarakanDb(`carakan-lost-${Math.random()}`, terminated);
  expect(terminated).not.toHaveBeenCalled();
  // fake-indexeddb types the parameter as the constructor, not the instance.
  forceCloseDatabase(unwrap(db) as never);
  expect(terminated).toHaveBeenCalledOnce();
});
