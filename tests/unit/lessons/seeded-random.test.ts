import { expect, test } from "vitest";
import {
  mulberry32,
  nextInt,
  shuffle,
} from "../../../src/features/lessons/seeded-random.ts";

const draw = (seed: number, n = 8) => {
  const rng = mulberry32(seed);
  return Array.from({ length: n }, () => rng());
};

test("[P-B10] the same seed yields the same sequence", () => {
  expect(draw(42)).toEqual(draw(42));
});

test("[P-B10] different seeds yield different sequences", () => {
  expect(draw(1)).not.toEqual(draw(2));
});

test("[P-B10] the seed is taken as an unsigned 32-bit integer", () => {
  expect(draw(-1)).toEqual(draw(0xffffffff));
  expect(draw(2 ** 32 + 5)).toEqual(draw(5));
});

test("[P-B10] values stay in [0, 1) and nextInt stays in [0, n)", () => {
  const rng = mulberry32(7);
  const seen = new Set<number>();
  for (let i = 0; i < 2000; i++) {
    const v = rng();
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
    const n = nextInt(rng, 5);
    expect(Number.isInteger(n)).toBe(true);
    expect(n).toBeGreaterThanOrEqual(0);
    expect(n).toBeLessThan(5);
    seen.add(n);
  }
  expect([...seen].sort()).toEqual([0, 1, 2, 3, 4]);
});

test("[P-B10] shuffle permutes in place and is deterministic per seed", () => {
  const base = Array.from({ length: 12 }, (_, i) => i);
  const a = [...base];
  const result = shuffle(a, mulberry32(3));
  expect(result).toBe(a);
  expect([...a].sort((x, y) => x - y)).toEqual(base);
  const b = [...base];
  shuffle(b, mulberry32(3));
  expect(b).toEqual(a);
  const c = [...base];
  shuffle(c, mulberry32(4));
  expect(c).not.toEqual(a);
});

test("[P-B10] shuffle of an empty or single list leaves it and consumes nothing", () => {
  const rng = mulberry32(9);
  const expected = mulberry32(9)();
  expect(shuffle<number>([], rng)).toEqual([]);
  expect(shuffle([1], rng)).toEqual([1]);
  expect(rng()).toBe(expected);
});
