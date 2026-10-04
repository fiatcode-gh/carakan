import { expect, test } from "vitest";
import { insertAtCursor } from "../../../src/features/converter/insert-at-cursor.ts";
import { ak } from "../../engine/support/aksara-builder.ts";

const ha = ak("HA");

test("[P-U08] inserts at the cursor position", () => {
  expect(insertAtCursor("ka", 1, ha)).toBe(`k${ha}a`);
});

test("[P-U08] inserts at the end when offset equals length", () => {
  expect(insertAtCursor("ka", 2, ha)).toBe(`ka${ha}`);
});

test("[P-U08] clamps a negative offset to zero", () => {
  expect(insertAtCursor("ka", -1, ha)).toBe(`${ha}ka`);
});

test("[P-U08] clamps an offset beyond the end", () => {
  expect(insertAtCursor("ka", 99, ha)).toBe(`ka${ha}`);
});
