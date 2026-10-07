export interface Box {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface ClusterBox {
  readonly glyph: Box;
  readonly hit: Box;
}

/** Touch-target minimum (docs/spec.md section 8). */
export const minTarget = 48;

/** Grow `start`/`size` about its centre to `max(min, size)`, then shift into `[0, limit]`. */
function growAxis(
  start: number,
  size: number,
  limit: number,
  min: number,
): [number, number] {
  const grown = Math.max(min, size);
  const centred = start + size / 2 - grown / 2;
  if (limit < grown) return [centred, grown];
  return [Math.min(Math.max(centred, 0), limit - grown), grown];
}

export function clusterBoxes(
  glyphs: readonly Box[],
  bounds: { readonly width: number; readonly height: number },
  min: number = minTarget,
): readonly ClusterBox[] {
  return glyphs.map((glyph) => {
    const [x, width] = growAxis(glyph.x, glyph.width, bounds.width, min);
    const [y, height] = growAxis(glyph.y, glyph.height, bounds.height, min);
    return { glyph, hit: { x, y, width, height } };
  });
}

function distance(box: Box, x: number, y: number): number {
  const dx = Math.max(box.x - x, 0, x - (box.x + box.width));
  const dy = Math.max(box.y - y, 0, y - (box.y + box.height));
  return Math.hypot(dx, dy);
}

/** Index of the glyph nearest to the point; hit boxes are deliberately ignored. */
export function clusterAt(
  boxes: readonly ClusterBox[],
  x: number,
  y: number,
): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  boxes.forEach((b, i) => {
    const d = distance(b.glyph, x, y);
    if (d < bestDistance) {
      best = i;
      bestDistance = d;
    }
  });
  return best;
}
