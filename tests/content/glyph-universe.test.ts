import { describe, expect, test } from "vitest";
import {
  bitOf,
  containsGlyph,
  glyphUniverseIds,
  pasanganCap,
} from "../../src/content/glyph-universe.ts";

describe("[P-D04] glyph universe", () => {
  test("universe has exactly 57 pinned items in order", () => {
    expect(glyphUniverseIds.length).toBe(57);
    expect(glyphUniverseIds[0]).toBe("ha");
    expect(glyphUniverseIds.at(-1)).toBe("leu");
    expect(new Set(glyphUniverseIds).size, "no duplicates").toBe(57);
  });

  test("bit positions are pinned (index = bit)", () => {
    expect(bitOf("ha")).toBe(1n << 0n);
    expect(bitOf("nga")).toBe(1n << 19n);
    expect(bitOf("pangkon")).toBe(1n << 28n);
    expect(bitOf("raAgung")).toBe(1n << 42n);
    expect(bitOf("a")).toBe(1n << 43n);
    expect(bitOf("leu")).toBe(1n << 56n);
  });

  test("pasangan capability is a separate bit", () => {
    expect(pasanganCap).toBe(1n << 0n);
    expect(containsGlyph("pasangan-ha")).toBe(false);
  });

  test("unknown ids throw", () => {
    expect(() => bitOf("nope")).toThrow(Error);
  });
});
