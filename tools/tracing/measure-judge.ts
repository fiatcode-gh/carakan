/**
 * Prints the judge's coverage and precision for every base letter: a genuine
 * trace, a sloppy one (off by half the finger stroke) and blind zigzags over
 * the glyph box. Use it to tune the constants in
 * src/features/tracing/trace-score.ts before the real-finger check.
 *
 *   node tools/tracing/measure-judge.ts
 */
import {
  MIN_COVERAGE,
  MIN_PRECISION,
  scoreTrace,
} from "../../src/features/tracing/trace-score.ts";
import {
  LETTER_IDS,
  STROKE_PX,
  inkMask,
  padGlyph,
  shifted,
  zigzag,
  type Pt,
} from "../../tests/unit/tracing/support/pad.ts";

const half = STROKE_PX / 2;
const sloppy: (readonly [number, number])[] = [
  [half, half],
  [-half, -half],
  [half, -half],
  [-half, half],
];

interface Row {
  readonly name: string;
  readonly strokes: (glyph: ReturnType<typeof padGlyph>) => Pt[][][];
}

const rows: Row[] = [
  { name: "genuine", strokes: (g) => [g.genuine] },
  {
    name: "sloppy (worst of 4 offsets)",
    strokes: (g) => sloppy.map(([dx, dy]) => shifted(g.genuine, dx, dy)),
  },
  ...[12, 18, 24].map((spacing) => ({
    name: `zigzag ${spacing}px (worst of 2 phases, joined or lifted)`,
    strokes: (g: ReturnType<typeof padGlyph>) =>
      [0, spacing / 2].flatMap((phase) =>
        [true, false].map((joined) => zigzag(g.box, spacing, phase, joined)),
      ),
  })),
];

console.log(
  `MIN_COVERAGE ${MIN_COVERAGE}, MIN_PRECISION ${MIN_PRECISION}; cells are coverage / precision\n`,
);
console.log(["letter", ...rows.map((r) => r.name)].join(" | "));
for (const id of LETTER_IDS) {
  const glyph = padGlyph(id);
  const cells = rows.map((row) => {
    // The worst case of a row: the lowest precision (zigzag rows: the highest).
    const scores = row
      .strokes(glyph)
      .map((s) => scoreTrace(glyph.mask, inkMask(s)));
    const zig = row.name.startsWith("zigzag");
    const pick = scores.reduce((a, b) =>
      (zig ? b.precision > a.precision : b.precision < a.precision) ? b : a,
    );
    return `${pick.coverage.toFixed(2)} / ${pick.precision.toFixed(2)} ${pick.passed ? "PASS" : "fail"}`;
  });
  console.log([id, ...cells].join(" | "));
}
