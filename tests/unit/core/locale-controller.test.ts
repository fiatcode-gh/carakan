import { get } from "svelte/store";
import { expect, test } from "vitest";
import {
  LOCALE_STORAGE_KEY,
  LocaleController,
} from "../../../src/core/locale/locale-controller.ts";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
  };
}

const failing = {
  getItem: () => {
    throw new Error("no store");
  },
  setItem: () => {
    throw new Error("no store");
  },
};

test("[P-T02] defaults to system — the browser decides", () => {
  const c = new LocaleController(memoryStorage());
  expect(get(c.setting)).toBe("system");
});

test("[P-T03] a persisted choice survives a fresh controller (restart)", () => {
  const storage = memoryStorage();
  const first = new LocaleController(storage);
  expect(first.select("en")).toBe(true);
  expect(get(first.setting)).toBe("en");
  expect(storage.getItem(LOCALE_STORAGE_KEY)).toBe("en");

  const second = new LocaleController(storage);
  expect(get(second.setting)).toBe("system");
  second.load();
  expect(get(second.setting)).toBe("en");
});

test("[P-T03] an unknown stored value falls back to system", () => {
  const c = new LocaleController(
    memoryStorage({ [LOCALE_STORAGE_KEY]: "gibberish" }),
  );
  c.load();
  expect(get(c.setting)).toBe("system");
});

test("[P-T02] select() notifies subscribers", () => {
  const c = new LocaleController(memoryStorage());
  const seen: string[] = [];
  c.setting.subscribe((s) => seen.push(s));
  c.select("id");
  expect(seen).toEqual(["system", "id"]);
});

test("[P-T02] selecting the current value is a no-op that reports success", () => {
  const c = new LocaleController(memoryStorage());
  const seen: string[] = [];
  c.setting.subscribe((s) => seen.push(s));
  expect(c.select("system")).toBe(true);
  expect(seen).toEqual(["system"]);
});

test("[P-T03] a failing store leaves load() on system (no crash)", () => {
  const c = new LocaleController(failing);
  c.load();
  expect(get(c.setting)).toBe("system");
});

test("[P-T03] a null store (storage blocked) leaves load() on system", () => {
  const c = new LocaleController(null);
  c.load();
  expect(get(c.setting)).toBe("system");
});

test("[P-T02] select() with a failing persist is not applied", () => {
  const c = new LocaleController(failing);
  expect(c.select("en")).toBe(false);
  expect(get(c.setting)).toBe("system");
});

test("[P-T02] select() with a null store is not applied", () => {
  const c = new LocaleController(null);
  expect(c.select("en")).toBe(false);
  expect(get(c.setting)).toBe("system");
});
