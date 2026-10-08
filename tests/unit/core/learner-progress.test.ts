import { afterEach, describe, expect, test, vi } from "vitest";
import type { CarakanDb } from "../../../src/core/db/database.ts";
import { LearnerProgress } from "../../../src/core/db/learner-progress.ts";
import { openFreshDb } from "./db-helpers.ts";

const STORES = ["srsItems", "unitCompletions", "mistakeLogs"] as const;

async function seed(db: CarakanDb) {
  await db.put("srsItems", {
    itemId: "ha",
    intervalDays: 1,
    ease: 2.5,
    repetitions: 1,
    dueAt: 1,
    lastReviewedAt: null,
  });
  await db.put("unitCompletions", { unitId: "g1", completedAt: 1 });
  await db.put("unitCompletions", { unitId: "u1", completedAt: 1 });
  await db.put("mistakeLogs", { confusionPair: "da-dha", count: 2, lastAt: 1 });
}

async function keys(db: CarakanDb) {
  return Promise.all(STORES.map((name) => db.getAllKeys(name)));
}

function wrap<T extends object>(
  target: T,
  override: (prop: string | symbol, value: unknown) => unknown,
): T {
  return new Proxy(target, {
    get(t, prop) {
      const value = Reflect.get(t, prop, t);
      const replaced = override(prop, value);
      if (replaced !== value) return replaced;
      return typeof value === "function" ? value.bind(t) : value;
    },
  });
}

/** Records transaction() calls; optionally makes mistakeLogs.clear() fail. */
function observed(db: CarakanDb, fail?: "throw" | "reject") {
  const calls: unknown[][] = [];
  const proxy = wrap(db, (prop, value) => {
    if (prop !== "transaction") return value;
    return (names: unknown, mode: unknown) => {
      calls.push([names, mode]);
      const tx = (value as (...a: unknown[]) => IDBTransaction).call(
        db,
        names,
        mode,
      );
      return wrap(tx, (p, v) => {
        if (p !== "objectStore") return v;
        return (name: string) => {
          const store = (v as (n: string) => object).call(tx, name);
          if (name !== "mistakeLogs" || !fail) return store;
          return wrap(store, (sp, sv) => {
            if (sp !== "clear") return sv;
            return () => {
              const error = new DOMException("injected", "UnknownError");
              if (fail === "throw") throw error;
              return Promise.reject(error);
            };
          });
        };
      });
    };
  });
  return { db: proxy as CarakanDb, calls };
}

afterEach(() => vi.unstubAllGlobals());

describe("LearnerProgress.erase", () => {
  test("[P-T07] erase empties srsItems, unitCompletions and mistakeLogs in one readwrite transaction", async () => {
    const db = await openFreshDb();
    await seed(db);
    const { db: spy, calls } = observed(db);
    await new LearnerProgress(spy).erase();
    expect(await keys(db)).toEqual([[], [], []]);
    expect(calls).toEqual([[[...STORES], "readwrite"]]);
  });

  test("[P-T07] erase emits once, after the stores are empty", async () => {
    const db = await openFreshDb();
    await seed(db);
    const progress = new LearnerProgress(db);
    const seen: number[][] = [];
    progress.erased.subscribe(() => {
      void Promise.all(STORES.map((name) => db.count(name))).then((c) =>
        seen.push(c),
      );
    });
    await progress.erase();
    await vi.waitFor(() => expect(seen).toEqual([[0, 0, 0]]));
  });

  test("[P-T07] erase keeps the language choice", async () => {
    const store = new Map([["carakan.uiLocale", "en"]]);
    const fake = {
      getItem: vi.fn((k: string) => store.get(k) ?? null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clear: vi.fn(),
    };
    vi.stubGlobal("localStorage", fake);
    const db = await openFreshDb();
    await seed(db);
    await new LearnerProgress(db).erase();
    expect(localStorage.getItem("carakan.uiLocale")).toBe("en");
    expect(fake.setItem).not.toHaveBeenCalled();
    expect(fake.removeItem).not.toHaveBeenCalled();
    expect(fake.clear).not.toHaveBeenCalled();
  });

  test.each(["throw", "reject"] as const)(
    "[P-T07] a failing clear leaves every store unchanged and emits nothing (%s)",
    async (mode) => {
      const db = await openFreshDb();
      await seed(db);
      const { db: spy } = observed(db, mode);
      const progress = new LearnerProgress(spy);
      const listener = vi.fn();
      progress.erased.subscribe(listener);
      await expect(progress.erase()).rejects.toMatchObject({
        message: "injected",
      });
      expect(await keys(db)).toEqual([["ha"], ["g1", "u1"], ["da-dha"]]);
      expect(listener).not.toHaveBeenCalled();
    },
  );

  test("[P-T07] erasing empty stores succeeds and emits once", async () => {
    const db = await openFreshDb();
    const progress = new LearnerProgress(db);
    const listener = vi.fn();
    progress.erased.subscribe(listener);
    await progress.erase();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
