/** Side of one mask cell in CSS pixels. */
export const TRACE_CELL_PX = 4;
/** How far (in cells) ink may sit from the glyph and still cover it. */
export const COVER_RADIUS = 2;
/** How far (in cells) ink may sit from the glyph and still count as on it. */
export const PRECISION_RADIUS = 4;
/** Share of the glyph the ink must cover. */
export const MIN_COVERAGE = 0.6;
/** Share of the ink that must lie near the glyph. */
export const MIN_PRECISION = 0.7;

/** A coarse on/off raster; `cells` is row-major, 1 = on. */
export interface CellMask {
  readonly width: number;
  readonly height: number;
  readonly cells: Uint8Array;
}

export interface TraceScore {
  readonly coverage: number;
  readonly precision: number;
  readonly passed: boolean;
}

/** A cell is on when any pixel in it has alpha of at least 128. */
export function maskFromAlpha(
  rgba: Uint8ClampedArray,
  widthPx: number,
  heightPx: number,
  cellPx: number = TRACE_CELL_PX,
): CellMask {
  if (rgba.length !== widthPx * heightPx * 4) {
    throw new RangeError(
      `${rgba.length} bytes do not hold ${widthPx}x${heightPx} RGBA pixels`,
    );
  }
  const width = Math.ceil(widthPx / cellPx);
  const height = Math.ceil(heightPx / cellPx);
  const cells = new Uint8Array(width * height);
  for (let y = 0; y < heightPx; y++) {
    const row = Math.floor(y / cellPx) * width;
    for (let x = 0; x < widthPx; x++) {
      if (rgba[(y * widthPx + x) * 4 + 3]! >= 128) {
        cells[row + Math.floor(x / cellPx)] = 1;
      }
    }
  }
  return { width, height, cells };
}

/** Grows every on cell into a square of side `2 * radius + 1` (Chebyshev). */
export function dilate(mask: CellMask, radius: number): CellMask {
  const { width, height, cells } = mask;
  // Two separable passes: along rows, then along columns.
  const across = new Uint8Array(cells.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (cells[y * width + x] === 0) continue;
      const from = Math.max(0, x - radius);
      const to = Math.min(width - 1, x + radius);
      for (let nx = from; nx <= to; nx++) across[y * width + nx] = 1;
    }
  }
  const out = new Uint8Array(cells.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (across[y * width + x] === 0) continue;
      const from = Math.max(0, y - radius);
      const to = Math.min(height - 1, y + radius);
      for (let ny = from; ny <= to; ny++) out[ny * width + x] = 1;
    }
  }
  return { width, height, cells: out };
}

function count(mask: CellMask): number {
  let n = 0;
  for (const cell of mask.cells) n += cell;
  return n;
}

function overlap(a: CellMask, b: CellMask): number {
  let n = 0;
  for (let i = 0; i < a.cells.length; i++) n += a.cells[i]! & b.cells[i]!;
  return n;
}

/**
 * Judges free tracing: the ink must cover most of the glyph and stay near it.
 * Order, direction and stroke count are not judged.
 */
export function scoreTrace(glyph: CellMask, ink: CellMask): TraceScore {
  if (glyph.width !== ink.width || glyph.height !== ink.height) {
    throw new RangeError("the glyph and ink masks differ in size");
  }
  const glyphCells = count(glyph);
  if (glyphCells === 0) throw new RangeError("the glyph mask is empty");
  const inkCells = count(ink);
  if (inkCells === 0) return { coverage: 0, precision: 0, passed: false };
  const coverage = overlap(glyph, dilate(ink, COVER_RADIUS)) / glyphCells;
  const precision = overlap(ink, dilate(glyph, PRECISION_RADIUS)) / inkCells;
  return {
    coverage,
    precision,
    passed: coverage >= MIN_COVERAGE && precision >= MIN_PRECISION,
  };
}
