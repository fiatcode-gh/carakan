import { readFileSync } from "node:fs";
import {
  maskFromAlpha,
  scoreTrace,
  type CellMask,
  type TraceScore,
} from "../../../../src/features/tracing/trace-score.ts";

/** The finger line of the pad, in CSS pixels (TracingPad.svelte STROKE_PX). */
export const STROKE_PX = 12;

export type Pt = readonly [x: number, y: number];

interface Fixture {
  readonly cellPx: number;
  readonly padPx: { readonly width: number; readonly height: number };
  readonly glyphs: Record<
    string,
    {
      readonly inkBox: [number, number, number, number];
      readonly rows: string[];
      readonly scans: string[];
    }
  >;
}

/** Written by tools/tracing/dump-glyph-masks.ts from the shipped Jejeg font. */
const fixture = JSON.parse(
  readFileSync(
    new URL("../fixtures/glyph-masks.json", import.meta.url),
    "utf8",
  ),
) as Fixture;

export const PAD = fixture.padPx;
export const LETTER_IDS = Object.keys(fixture.glyphs);

export interface PadGlyph {
  readonly mask: CellMask;
  /** The glyph's ink bounding box in pad pixels. */
  readonly box: { left: number; top: number; right: number; bottom: number };
  /** One straight stroke across every scanned run, trimmed 2px at both ends. */
  readonly genuine: Pt[][];
}

export function padGlyph(id: string): PadGlyph {
  const data = fixture.glyphs[id]!;
  const width = Math.ceil(PAD.width / fixture.cellPx);
  const height = Math.ceil(PAD.height / fixture.cellPx);
  const cells = new Uint8Array(width * height);
  data.rows.forEach((row, y) => {
    for (const run of row === "" ? [] : row.split(",")) {
      const [from, to] = run.split("-").map(Number) as [number, number];
      cells.fill(1, y * width + from, y * width + to + 1);
    }
  });
  const genuine: Pt[][] = [];
  for (const scan of data.scans) {
    const [y, runs] = scan.split(":") as [string, string];
    for (const run of runs.split(",")) {
      const [from, to] = run.split("-").map(Number) as [number, number];
      if (to - 2 >= from + 2)
        genuine.push([
          [from + 2, Number(y)],
          [to - 2, Number(y)],
        ]);
    }
  }
  const [left, top, right, bottom] = data.inkBox;
  return {
    mask: { width, height, cells },
    box: { left, top, right, bottom },
    genuine,
  };
}

/**
 * A blind zigzag over the glyph's ink bounding box: sweeps left and right,
 * `spacing` px apart. `phase` shifts the first row. Joined, it is one stroke
 * that turns at the box edges; otherwise each sweep is its own stroke, as if
 * the pen lifted between rows.
 */
export function zigzag(
  box: PadGlyph["box"],
  spacing: number,
  phase = 0,
  joined = true,
): Pt[][] {
  const sweeps: Pt[][] = [];
  let leftToRight = true;
  let y = box.top + phase;
  for (;;) {
    const row = Math.min(y, box.bottom);
    sweeps.push(
      leftToRight
        ? [
            [box.left, row],
            [box.right, row],
          ]
        : [
            [box.right, row],
            [box.left, row],
          ],
    );
    if (row === box.bottom) break;
    y += spacing;
    leftToRight = !leftToRight;
  }
  return joined ? [sweeps.flat()] : sweeps;
}

export function shifted(
  strokes: readonly (readonly Pt[])[],
  dx: number,
  dy: number,
): Pt[][] {
  return strokes.map((s) => s.map(([x, y]): Pt => [x + dx, y + dy]));
}

function distanceToSegment([px, py]: Pt, [ax, ay]: Pt, [bx, by]: Pt): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  const t =
    len2 === 0
      ? 0
      : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

/**
 * The pad's ink for the strokes: a round brush of STROKE_PX, a pixel on when
 * its centre lies within half the brush of a stroke (the canvas's alpha >= 128).
 */
export function inkMask(strokes: readonly (readonly Pt[])[]): CellMask {
  const { width, height } = PAD;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const r = STROKE_PX / 2;
  for (const stroke of strokes) {
    for (let i = 0; i < Math.max(1, stroke.length - 1); i++) {
      const a = stroke[i]!;
      const b = stroke[i + 1] ?? a;
      const x0 = Math.max(0, Math.floor(Math.min(a[0], b[0]) - r));
      const x1 = Math.min(width - 1, Math.ceil(Math.max(a[0], b[0]) + r));
      const y0 = Math.max(0, Math.floor(Math.min(a[1], b[1]) - r));
      const y1 = Math.min(height - 1, Math.ceil(Math.max(a[1], b[1]) + r));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (distanceToSegment([x + 0.5, y + 0.5], a, b) <= r) {
            rgba[(y * width + x) * 4 + 3] = 255;
          }
        }
      }
    }
  }
  return maskFromAlpha(rgba, width, height);
}

export function judge(
  glyph: PadGlyph,
  strokes: readonly (readonly Pt[])[],
): TraceScore {
  return scoreTrace(glyph.mask, inkMask(strokes));
}
