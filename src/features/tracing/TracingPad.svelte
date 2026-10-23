<script module lang="ts">
  export interface Point {
    readonly x: number;
    readonly y: number;
  }
</script>

<script lang="ts">
  import { onMount } from "svelte";
  import { padSize } from "./pad-size.ts";
  import { maskFromAlpha, scoreTrace, type TraceScore } from "./trace-score.ts";

  interface Props {
    /** The aksara to trace; the parent keys the pad on it. */
    char: string;
    /** Accessible name of the writing area. */
    label: string;
    strokes?: Point[][];
  }

  interface Layout {
    fontSize: number;
    originX: number;
    originY: number;
    guideTop: number;
    guideBottom: number;
  }

  /** The finger or pen line, in CSS pixels. */
  const STROKE_PX = 12;
  const GHOST_PX = 2;
  const MEASURE_PX = 100;
  /** The ink box takes at most this share of the pad. */
  const FIT_WIDTH = 0.75;
  const FIT_HEIGHT = 0.6;

  let { char, label, strokes = $bindable([]) }: Props = $props();

  let root = $state<HTMLDivElement>();
  let ghostCanvas = $state<HTMLCanvasElement>();
  let inkCanvas = $state<HTMLCanvasElement>();
  /** The pad's size in CSS pixels, for change detection. */
  let client = $state({ width: 0, height: 0 });
  /** The logical size: the phone pad's pixels, whatever the pad is magnified to. */
  let size = $state({ width: 0, height: 0 });
  let scale = $state(1);
  let layout = $state<Layout | null>(null);

  let fontLoaded = false;
  let ready: Promise<unknown> = Promise.resolve();
  let activePointer: number | null = null;
  let current: Point[] | null = null;

  function cssColor(name: string): string {
    return getComputedStyle(root!).getPropertyValue(name).trim();
  }

  function context(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const ctx = canvas.getContext("2d");
    if (ctx === null) throw new Error("2d canvas is not available");
    const pixels = (window.devicePixelRatio || 1) * scale;
    ctx.setTransform(pixels, 0, 0, pixels, 0, 0);
    return ctx;
  }

  function sizeCanvases(): void {
    const dpr = window.devicePixelRatio || 1;
    for (const canvas of [ghostCanvas!, inkCanvas!]) {
      canvas.width = Math.round(client.width * dpr);
      canvas.height = Math.round(client.height * dpr);
    }
  }

  /** A logical rect can miss a sub-pixel strip when the pad is magnified. */
  function wipe(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    ctx.restore();
  }

  function setGlyphText(ctx: CanvasRenderingContext2D, fontSize: number): void {
    ctx.font = `${fontSize}px Jejeg`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
  }

  /** Fits the glyph's ink box into the pad and draws the ghost. */
  function place(): void {
    if (!fontLoaded || size.width === 0) return;
    const ctx = context(ghostCanvas!);
    setGlyphText(ctx, MEASURE_PX);
    const m = ctx.measureText(char);
    const inkWidth = m.actualBoundingBoxLeft + m.actualBoundingBoxRight;
    const inkHeight = m.actualBoundingBoxAscent + m.actualBoundingBoxDescent;
    if (inkWidth === 0 || inkHeight === 0) {
      throw new Error("the glyph did not render: is Jejeg loaded?");
    }
    const fit = Math.min(
      (FIT_WIDTH * size.width) / inkWidth,
      (FIT_HEIGHT * size.height) / inkHeight,
    );
    const originY =
      (size.height - inkHeight * fit) / 2 + m.actualBoundingBoxAscent * fit;
    layout = {
      fontSize: MEASURE_PX * fit,
      originX:
        (size.width - inkWidth * fit) / 2 + m.actualBoundingBoxLeft * fit,
      originY,
      guideTop: originY - m.actualBoundingBoxAscent * fit,
      guideBottom: originY + m.actualBoundingBoxDescent * fit,
    };

    wipe(ctx);
    setGlyphText(ctx, layout.fontSize);
    ctx.lineWidth = GHOST_PX;
    ctx.lineJoin = "round";
    ctx.strokeStyle = cssColor("--color-placeholder");
    ctx.strokeText(char, layout.originX, layout.originY);
  }

  function dot(ctx: CanvasRenderingContext2D, at: Point): void {
    ctx.beginPath();
    ctx.arc(at.x, at.y, STROKE_PX / 2, 0, Math.PI * 2);
    ctx.fill();
  }

  function style(ctx: CanvasRenderingContext2D): void {
    const ink = cssColor("--color-trace-ink");
    ctx.strokeStyle = ink;
    ctx.fillStyle = ink;
    ctx.lineWidth = STROKE_PX;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }

  function paint(
    ctx: CanvasRenderingContext2D,
    all: readonly (readonly Point[])[],
  ): void {
    style(ctx);
    for (const stroke of all) {
      const [first, ...rest] = stroke;
      if (first === undefined) continue;
      if (rest.length === 0) {
        dot(ctx, first);
        continue;
      }
      ctx.beginPath();
      ctx.moveTo(first.x, first.y);
      for (const p of rest) ctx.lineTo(p.x, p.y);
      ctx.stroke();
    }
  }

  function pointOf(event: PointerEvent): Point {
    const rect = inkCanvas!.getBoundingClientRect();
    return {
      x: (event.clientX - rect.left) / scale,
      y: (event.clientY - rect.top) / scale,
    };
  }

  function begin(event: PointerEvent): void {
    // One finger at a time: a second pointer never starts a stroke.
    if (activePointer !== null) return;
    try {
      inkCanvas!.setPointerCapture(event.pointerId);
    } catch {
      // The pointer is already gone: no pointerup will follow, so a stroke
      // started now would hold the pad until the next resize or Hapus.
      return;
    }
    activePointer = event.pointerId;
    const at = pointOf(event);
    strokes = [...strokes, [at]];
    current = strokes[strokes.length - 1]!;
    const ctx = context(inkCanvas!);
    style(ctx);
    dot(ctx, at);
  }

  function move(event: PointerEvent): void {
    if (event.pointerId !== activePointer || current === null) return;
    const coalesced = event.getCoalescedEvents?.() ?? [];
    const events = coalesced.length > 0 ? coalesced : [event];
    const ctx = context(inkCanvas!);
    style(ctx);
    for (const e of events) {
      const from = current[current.length - 1]!;
      const to = pointOf(e);
      current.push(to);
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
    }
  }

  function end(event: PointerEvent): void {
    if (event.pointerId !== activePointer) return;
    activePointer = null;
    current = null;
    try {
      inkCanvas!.releasePointerCapture(event.pointerId);
    } catch {
      // Already released.
    }
  }

  /** Rubs out all ink. */
  export function clear(): void {
    strokes = [];
    activePointer = null;
    current = null;
    const ctx = context(inkCanvas!);
    wipe(ctx);
  }

  function raster(
    draw: (ctx: CanvasRenderingContext2D) => void,
  ): Uint8ClampedArray {
    const canvas = document.createElement("canvas");
    canvas.width = size.width;
    canvas.height = size.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (ctx === null) throw new Error("2d canvas is not available");
    draw(ctx);
    return ctx.getImageData(0, 0, size.width, size.height).data;
  }

  /** Judges the ink against the glyph (free tracing: no order, no direction). */
  export async function score(): Promise<TraceScore> {
    await ready;
    if (layout === null) throw new Error("the pad has not been laid out");
    const { fontSize, originX, originY } = layout;
    const { width, height } = size;
    const glyph = raster((ctx) => {
      setGlyphText(ctx, fontSize);
      ctx.fillStyle = cssColor("--color-trace-ink");
      ctx.fillText(char, originX, originY);
    });
    const ink = raster((ctx) => paint(ctx, strokes));
    return scoreTrace(
      maskFromAlpha(glyph, width, height),
      maskFromAlpha(ink, width, height),
    );
  }

  onMount(() => {
    ready = document.fonts.load(`${MEASURE_PX}px Jejeg`, char).then(() => {
      fontLoaded = true;
      place();
    });
    const observer = new ResizeObserver(() => {
      const width = root!.clientWidth;
      const height = root!.clientHeight;
      if (width === client.width && height === client.height) return;
      const first = client.width === 0;
      client = { width, height };
      const logical = padSize(width, height);
      size = { width: logical.width, height: logical.height };
      scale = logical.scale;
      sizeCanvases();
      // Resizing wipes the canvases; ink would not line up with the new glyph.
      if (!first) {
        strokes = [];
        activePointer = null;
        current = null;
      }
      place();
    });
    observer.observe(root!);
    return () => observer.disconnect();
  });
</script>

<div
  class="trace-pad"
  role="img"
  aria-label={label}
  bind:this={root}
  data-font-size={layout?.fontSize}
  data-origin-x={layout?.originX}
  data-origin-y={layout?.originY}
  data-scale={scale}
>
  {#if layout}
    <span class="trace-pad__guide" style:top="{layout.guideTop * scale}px"
    ></span>
    <span class="trace-pad__guide" style:top="{layout.guideBottom * scale}px"
    ></span>
  {/if}
  <canvas class="trace-pad__canvas" bind:this={ghostCanvas}></canvas>
  <canvas
    class="trace-pad__canvas trace-pad__ink"
    bind:this={inkCanvas}
    onpointerdown={begin}
    onpointermove={move}
    onpointerup={end}
    onpointercancel={end}
    onlostpointercapture={end}
  ></canvas>
</div>

<style>
  .trace-pad {
    position: relative;
    box-sizing: border-box;
    height: 340px;
    overflow: hidden;
    border: var(--border);
    background: var(--color-card);
    box-shadow: var(--shadow-hero);
    touch-action: none;
    user-select: none;
  }

  /* Fills the size container its parent gives it (TracePractice), keeping the phone pad's shape. */
  @media (min-width: 48rem) {
    .trace-pad {
      width: min(100cqw, 100cqh * 324 / 340);
      height: auto;
      aspect-ratio: 324 / 340;
    }
  }

  .trace-pad__guide {
    position: absolute;
    inset-inline: 0;
    border-top: 2px dashed var(--color-margin);
    pointer-events: none;
  }

  .trace-pad__canvas {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
  }

  .trace-pad__ink {
    touch-action: none;
    cursor: crosshair;
  }
</style>
