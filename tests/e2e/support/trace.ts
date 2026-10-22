import type { CDPSession, Page } from "@playwright/test";

export interface Run {
  readonly y: number;
  readonly x0: number;
  readonly x1: number;
}

export type Pointer = "mouse" | "touch" | "pen";
export type Pt = readonly [x: number, y: number];

/**
 * Rebuilds the glyph mask in the page from the pad's `data-*` layout (the pad
 * carries no answer geometry) and returns page-coordinate runs of ink, one
 * scan every 6px row, each trimmed 2px at both ends.
 */
export function glyphRuns(page: Page, char: string): Promise<Run[]> {
  return page.evaluate(async (glyph) => {
    const pad = [...document.querySelectorAll<HTMLElement>(".trace-pad")].find(
      (el) => el.checkVisibility(),
    )!;
    await document.fonts.load("100px Jejeg", glyph);
    const fontSize = Number(pad.dataset["fontSize"]);
    const originX = Number(pad.dataset["originX"]);
    const originY = Number(pad.dataset["originY"]);
    const width = pad.clientWidth;
    const height = pad.clientHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.font = `${fontSize}px Jejeg`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(glyph, originX, originY);
    const { data } = ctx.getImageData(0, 0, width, height);
    const box = pad.getBoundingClientRect();
    const left = box.left + pad.clientLeft;
    const top = box.top + pad.clientTop;
    const runs: { y: number; x0: number; x1: number }[] = [];
    for (let y = 0; y < height; y += 6) {
      let start = -1;
      for (let x = 0; x <= width; x++) {
        const on = x < width && data[(y * width + x) * 4 + 3]! >= 128;
        if (on && start < 0) start = x;
        if (!on && start >= 0) {
          const x0 = start + 2;
          const x1 = x - 1 - 2;
          if (x1 >= x0) runs.push({ y: top + y, x0: left + x0, x1: left + x1 });
          start = -1;
        }
      }
    }
    return runs;
  }, char);
}

/** The pad's page rectangle (inside its border). */
export function padBox(
  page: Page,
): Promise<{ x: number; y: number; width: number; height: number }> {
  return page.evaluate(() => {
    const pad = [...document.querySelectorAll<HTMLElement>(".trace-pad")].find(
      (el) => el.checkVisibility(),
    )!;
    const box = pad.getBoundingClientRect();
    return {
      x: box.left + pad.clientLeft,
      y: box.top + pad.clientTop,
      width: pad.clientWidth,
      height: pad.clientHeight,
    };
  });
}

/** A straight line sampled every ~10px. */
export function line(from: Pt, to: Pt): Pt[] {
  const steps = Math.max(
    1,
    Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 10),
  );
  return Array.from({ length: steps + 1 }, (_, i) => [
    from[0] + ((to[0] - from[0]) * i) / steps,
    from[1] + ((to[1] - from[1]) * i) / steps,
  ]);
}

/** One stroke across every run, so a trace covers the whole glyph. */
export function strokesOf(runs: readonly Run[]): Pt[][] {
  return runs.map((r) => line([r.x0, r.y], [r.x1, r.y]));
}

/** Draws strokes with a real pointer of the given type. */
export async function draw(
  page: Page,
  pointer: Pointer,
  strokes: readonly (readonly Pt[])[],
): Promise<void> {
  if (pointer === "mouse") {
    for (const stroke of strokes) {
      await page.mouse.move(stroke[0]![0], stroke[0]![1]);
      await page.mouse.down();
      for (const [x, y] of stroke.slice(1)) await page.mouse.move(x, y);
      await page.mouse.up();
    }
    return;
  }
  const cdp: CDPSession = await page.context().newCDPSession(page);
  try {
    for (const stroke of strokes) {
      const [first, ...rest] = stroke as Pt[];
      if (pointer === "touch") {
        const at = ([x, y]: Pt) => [{ x, y }];
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchStart",
          touchPoints: at(first!),
        });
        for (const p of rest) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: at(p),
          });
        }
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchEnd",
          touchPoints: [],
        });
      } else {
        const send = (
          type: "mouseMoved" | "mousePressed" | "mouseReleased",
          [x, y]: Pt,
          buttons: number,
        ) =>
          cdp.send("Input.dispatchMouseEvent", {
            type,
            x,
            y,
            button: type === "mouseMoved" && buttons === 0 ? "none" : "left",
            buttons,
            clickCount: type === "mouseMoved" ? 0 : 1,
            pointerType: "pen",
          });
        await send("mouseMoved", first!, 0);
        await send("mousePressed", first!, 1);
        for (const p of rest) await send("mouseMoved", p, 1);
        await send("mouseReleased", rest.at(-1) ?? first!, 0);
      }
    }
  } finally {
    await cdp.detach();
  }
}

/** A zigzag over the whole pad: lots of ink, little of it on the glyph. */
export async function scribble(page: Page): Promise<Pt[][]> {
  const box = await padBox(page);
  const stroke: Pt[] = [];
  const rows = 14;
  for (let i = 0; i <= rows; i++) {
    const y = box.y + 8 + ((box.height - 16) * i) / rows;
    const xs: [number, number] =
      i % 2 === 0
        ? [box.x + 8, box.x + box.width - 8]
        : [box.x + box.width - 8, box.x + 8];
    stroke.push(...line([xs[0], y], [xs[1], y]));
    if (i < rows) {
      const nextY = box.y + 8 + ((box.height - 16) * (i + 1)) / rows;
      stroke.push(...line([xs[1], y], [xs[1], nextY]));
    }
  }
  return [stroke];
}
