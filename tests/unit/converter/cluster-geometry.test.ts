import { describe, expect, it } from "vitest";
import {
  clusterAt,
  clusterBoxes,
  type Box,
} from "../../../src/features/converter/cluster-geometry";

const box = (x: number, y: number, width: number, height: number): Box => ({
  x,
  y,
  width,
  height,
});
const bounds = { width: 400, height: 300 };
function only<T>(xs: readonly T[]): T {
  const x = xs[0];
  if (!x) throw new Error("empty");
  return x;
}

describe("clusterBoxes", () => {
  it("[P-U10] grows a narrow glyph symmetrically to 48 wide", () => {
    const b = only(clusterBoxes([box(100, 100, 21, 53)], bounds));
    expect(b.hit).toEqual(box(86.5, 100, 48, 53));
    expect(b.glyph).toEqual(box(100, 100, 21, 53));
  });

  it("[P-U10] leaves a wide glyph unchanged", () => {
    const b = only(clusterBoxes([box(100, 100, 61, 53)], bounds));
    expect(b.hit).toEqual(box(100, 100, 61, 53));
  });

  it("[P-U10] shifts into the left and right edges", () => {
    const edges = clusterBoxes(
      [box(0, 100, 21, 53), box(379, 100, 21, 53)],
      bounds,
    );
    const l = only(edges.slice(0, 1));
    const r = only(edges.slice(1));
    expect(l.hit).toEqual(box(0, 100, 48, 53));
    expect(r.hit.x + r.hit.width).toBe(400);
    expect(r.hit.width).toBe(48);
  });

  it("[P-U10] keeps the box centred when bounds are narrower than it", () => {
    const b = only(
      clusterBoxes([box(10, 100, 20, 53)], {
        width: 40,
        height: 300,
      }),
    );
    expect(b.hit.width).toBe(48);
    expect(b.hit.x).toBe(-4);
  });

  it("[P-U10] grows a short glyph to 48 tall and clamps at y=0", () => {
    const b = only(clusterBoxes([box(100, 5, 61, 20)], bounds));
    expect(b.hit.height).toBe(48);
    expect(b.hit.y).toBe(0);
  });
});

describe("clusterAt", () => {
  const boxes = clusterBoxes(
    [box(100, 100, 21, 53), box(130, 100, 61, 53)],
    bounds,
  );

  it("[P-U10] returns the cluster containing the point", () => {
    expect(clusterAt(boxes, 150, 120)).toBe(1);
  });

  it("[P-U10] picks the nearer glyph in the gap", () => {
    expect(clusterAt(boxes, 123, 120)).toBe(0);
    expect(clusterAt(boxes, 128, 120)).toBe(1);
  });

  it("[P-U10] gives the lower index on a tie", () => {
    expect(clusterAt(boxes, 125.5, 120)).toBe(0);
  });

  it("[P-U10] ignores expanded hit boxes inside a neighbour glyph", () => {
    const wide = clusterBoxes(
      [box(100, 100, 61, 53), box(162, 100, 10, 53)],
      bounds,
    );
    expect(clusterAt(wide, 158, 120)).toBe(0);
  });

  it("[P-U10] picks the nearest by distance above every line", () => {
    expect(clusterAt(boxes, 185, 20)).toBe(1);
  });

  it("[P-U10] returns null for no clusters", () => {
    expect(clusterAt([], 10, 10)).toBeNull();
  });
});
