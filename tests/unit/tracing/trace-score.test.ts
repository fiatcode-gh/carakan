import { describe, expect, test } from "vitest";
import {
  COVER_RADIUS,
  MIN_COVERAGE,
  MIN_PRECISION,
  PRECISION_RADIUS,
  TRACE_CELL_PX,
  dilate,
  maskFromAlpha,
  scoreTrace,
  type CellMask,
} from "../../../src/features/tracing/trace-score.ts";

const SIZE = 100;

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** An RGBA buffer with opaque pixels inside every box. */
function rgba(boxes: readonly Box[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4);
  for (const { x, y, w, h } of boxes) {
    for (let py = y; py < y + h; py++) {
      for (let px = x; px < x + w; px++) data[(py * SIZE + px) * 4 + 3] = 255;
    }
  }
  return data;
}

const mask = (boxes: readonly Box[]): CellMask =>
  maskFromAlpha(rgba(boxes), SIZE, SIZE);

/** An L: a vertical bar and a foot, both 12px thick. */
const L: Box[] = [
  { x: 20, y: 10, w: 12, h: 60 },
  { x: 32, y: 58, w: 38, h: 12 },
];

const glyph = mask(L);

describe("[P-B20] maskFromAlpha", () => {
  test("a cell is on when any of its pixels is at least half opaque", () => {
    const data = new Uint8ClampedArray(SIZE * SIZE * 4);
    data[(5 * SIZE + 5) * 4 + 3] = 128;
    data[(5 * SIZE + 9) * 4 + 3] = 127;
    const m = maskFromAlpha(data, SIZE, SIZE);
    expect(m.width).toBe(SIZE / TRACE_CELL_PX);
    expect(m.cells[1 * m.width + 1]).toBe(1);
    expect(m.cells[1 * m.width + 2]).toBe(0);
  });

  test("a buffer that does not match the size is a RangeError", () => {
    expect(() => maskFromAlpha(new Uint8ClampedArray(12), SIZE, SIZE)).toThrow(
      RangeError,
    );
  });
});

describe("[P-B20] dilate", () => {
  test("radius 1 turns one cell into a 3x3 block", () => {
    const cells = new Uint8Array(25);
    cells[2 * 5 + 2] = 1;
    const out = dilate({ width: 5, height: 5, cells }, 1);
    const on = [...out.cells].flatMap((v, i) => (v ? [i] : []));
    expect(on).toEqual([6, 7, 8, 11, 12, 13, 16, 17, 18]);
  });

  test("the block is clipped at the edges", () => {
    const cells = new Uint8Array(25);
    cells[0] = 1;
    const out = dilate({ width: 5, height: 5, cells }, 1);
    expect(out.cells.reduce((a, b) => a + b, 0)).toBe(4);
  });
});

describe("[P-B20] scoreTrace", () => {
  test("the thresholds sit inside the calibrated range", () => {
    expect(MIN_COVERAGE).toBeGreaterThanOrEqual(0.5);
    expect(MIN_COVERAGE).toBeLessThanOrEqual(0.7);
    expect(MIN_PRECISION).toBeGreaterThanOrEqual(0.6);
    expect(MIN_PRECISION).toBeLessThanOrEqual(0.8);
    expect(COVER_RADIUS).toBeLessThan(PRECISION_RADIUS);
  });

  test("ink along the whole glyph band passes", () => {
    const score = scoreTrace(glyph, mask(L));
    expect(score.passed).toBe(true);
    expect(score.coverage).toBe(1);
    expect(score.precision).toBe(1);
  });

  test("ink shifted by 6px still passes", () => {
    const shifted = L.map((b) => ({ ...b, x: b.x + 6, y: b.y - 6 }));
    expect(scoreTrace(glyph, mask(shifted)).passed).toBe(true);
  });

  test("empty ink scores zero and fails", () => {
    expect(scoreTrace(glyph, mask([]))).toEqual({
      coverage: 0,
      precision: 0,
      passed: false,
    });
  });

  test("ink filling the whole area fails on precision", () => {
    const score = scoreTrace(glyph, mask([{ x: 0, y: 0, w: SIZE, h: SIZE }]));
    expect(score.coverage).toBe(1);
    expect(score.precision).toBeLessThan(MIN_PRECISION);
    expect(score.passed).toBe(false);
  });

  test("ink along half the band fails on coverage", () => {
    const score = scoreTrace(glyph, mask([{ x: 20, y: 10, w: 12, h: 25 }]));
    expect(score.precision).toBeGreaterThanOrEqual(MIN_PRECISION);
    expect(score.coverage).toBeLessThan(MIN_COVERAGE);
    expect(score.passed).toBe(false);
  });

  test("ink far from the glyph fails", () => {
    const score = scoreTrace(glyph, mask([{ x: 80, y: 5, w: 12, h: 20 }]));
    expect(score.passed).toBe(false);
    expect(score.precision).toBe(0);
  });

  test("an empty glyph is a RangeError", () => {
    expect(() => scoreTrace(mask([]), mask(L))).toThrow(RangeError);
  });

  test("masks of different sizes are a RangeError", () => {
    const small = maskFromAlpha(new Uint8ClampedArray(40 * 40 * 4), 40, 40);
    expect(() => scoreTrace(glyph, small)).toThrow(RangeError);
  });
});
