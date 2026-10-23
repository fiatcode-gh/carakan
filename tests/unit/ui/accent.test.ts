import { expect, test } from "vitest";
import { accentVar } from "../../../src/ui/accent.ts";

test("accentVar names the colour token; null is neutral", () => {
  expect(accentVar("coral")).toBe("var(--color-coral)");
  expect(accentVar("periwinkle")).toBe("var(--color-periwinkle)");
  expect(accentVar("butter")).toBe("var(--color-butter)");
  expect(accentVar(null)).toBe("var(--color-neutral)");
});
