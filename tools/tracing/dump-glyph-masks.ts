/**
 * Writes the 20 base-letter glyph masks of the tracing pad to
 * tests/unit/tracing/fixtures/glyph-masks.json, so the unit tests can judge
 * traces against the real Jejeg glyphs without a browser.
 *
 *   npm run build && npx vite preview --port 4181 &
 *   E2E_BASE_URL=http://localhost:4181/ node tools/tracing/dump-glyph-masks.ts
 *
 * The pad is laid out in the mobile e2e viewport (360 x 740, scale 2), the same
 * way the pad does it: the glyph is drawn from the pad's `data-*` layout and
 * cut into TRACE_CELL_PX cells. Each cell row is stored as runs `from-to` of on cells.
 * `scans` holds the pixel runs of every 6th pixel row, as `y:from-to,...`, for
 * building a genuine trace the way the e2e suite does.
 */
import { chromium } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { nglegena } from "../../src/engine/index.ts";
import {
  TRACE_CELL_PX,
  maskFromAlpha,
} from "../../src/features/tracing/trace-score.ts";

const baseUrl = process.env["E2E_BASE_URL"] ?? "http://localhost:4181/";
const out = "tests/unit/tracing/fixtures/glyph-masks.json";

interface Raw {
  width: number;
  height: number;
  alpha: string;
  inkBox: [left: number, top: number, right: number, bottom: number];
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 360, height: 740 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "id-ID",
});
const page = await context.newPage();

const glyphs: Record<
  string,
  { inkBox: number[]; rows: string[]; scans: string[] }
> = {};
let pad = { width: 0, height: 0 };

for (const letter of nglegena) {
  await page.goto(`${baseUrl}#/trace/${letter.id}`);
  await page.locator('#app[data-boot="ready"]').waitFor();
  await page.locator(".trace-pad[data-font-size]").waitFor();
  const raw = await page.evaluate(async (char): Promise<Raw> => {
    const el = [...document.querySelectorAll<HTMLElement>(".trace-pad")].find(
      (e) => e.checkVisibility(),
    )!;
    await document.fonts.load("100px Jejeg", char);
    const width = el.clientWidth;
    const height = el.clientHeight;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    ctx.font = `${el.dataset["fontSize"]}px Jejeg`;
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText(
      char,
      Number(el.dataset["originX"]),
      Number(el.dataset["originY"]),
    );
    const { data } = ctx.getImageData(0, 0, width, height);
    let left = width;
    let top = height;
    let right = -1;
    let bottom = -1;
    let bytes = "";
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const on = data[(y * width + x) * 4 + 3]! >= 128;
        bytes += on ? "1" : "0";
        if (!on) continue;
        left = Math.min(left, x);
        right = Math.max(right, x + 1);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y + 1);
      }
    }
    return { width, height, alpha: bytes, inkBox: [left, top, right, bottom] };
  }, letter.char);

  const rgba = new Uint8ClampedArray(raw.width * raw.height * 4);
  for (let i = 0; i < raw.alpha.length; i++) {
    if (raw.alpha[i] === "1") rgba[i * 4 + 3] = 255;
  }
  const mask = maskFromAlpha(rgba, raw.width, raw.height);
  const rows: string[] = [];
  for (let y = 0; y < mask.height; y++) {
    const runs: string[] = [];
    let start = -1;
    for (let x = 0; x <= mask.width; x++) {
      const on = x < mask.width && mask.cells[y * mask.width + x] === 1;
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        runs.push(`${start}-${x - 1}`);
        start = -1;
      }
    }
    rows.push(runs.join(","));
  }
  const scans: string[] = [];
  for (let y = 0; y < raw.height; y += 6) {
    const runs: string[] = [];
    let start = -1;
    for (let x = 0; x <= raw.width; x++) {
      const on = x < raw.width && raw.alpha[y * raw.width + x] === "1";
      if (on && start < 0) start = x;
      if (!on && start >= 0) {
        runs.push(`${start}-${x - 1}`);
        start = -1;
      }
    }
    if (runs.length > 0) scans.push(`${y}:${runs.join(",")}`);
  }
  glyphs[letter.id] = { inkBox: raw.inkBox, rows, scans };
  pad = { width: raw.width, height: raw.height };
}
await browser.close();

writeFileSync(
  out,
  JSON.stringify({ cellPx: TRACE_CELL_PX, padPx: pad, glyphs }),
);
console.log(`wrote ${out}`);
