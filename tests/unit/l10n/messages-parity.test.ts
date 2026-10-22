import { expect, test } from "vitest";
import en from "../../../src/l10n/en.json";
import id from "../../../src/l10n/id.json";

const placeholders = (s: string) =>
  [...new Set([...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]))].sort();

test("[P-L01] id and en have identical key sets", () => {
  expect(Object.keys(en).sort()).toEqual(Object.keys(id).sort());
});

test("[P-L01] each key carries the same placeholders in both locales", () => {
  const mismatches = Object.keys(id).filter(
    (k) =>
      JSON.stringify(placeholders(id[k as keyof typeof id])) !==
      JSON.stringify(placeholders(en[k as keyof typeof en])),
  );
  expect(mismatches).toEqual([]);
});

test("[P-L01] every value is non-empty", () => {
  for (const [loc, messages] of [
    ["id", id],
    ["en", en],
  ] as const) {
    const empty = Object.entries(messages)
      .filter(([, v]) => v.trim() === "")
      .map(([k]) => `${loc}.${k}`);
    expect(empty).toEqual([]);
  }
});

test("[P-L01] message files hold 181 keys (90 ARB + 15 W10 + 1 W14 + 20 W15 + 1 copy failure + 8 converter breakdown + 8 progress reset + 2 ai/au titles + 5 ruleset choice + 3 Buku Poster shell + 6 Buku Poster learn path + 7 Buku Poster chart + 2 Buku Poster converter + 13 Buku Poster tracing)", () => {
  expect(Object.keys(id)).toHaveLength(181);
  expect(Object.keys(en)).toHaveLength(181);
});

test("[P-L01] no ICU syntax beyond simple {name} placeholders", () => {
  const braces = (s: string) => s.replace(/\{\w+\}/g, "");
  for (const v of [...Object.values(id), ...Object.values(en)]) {
    expect(braces(v)).not.toMatch(/[{}]/);
  }
});
