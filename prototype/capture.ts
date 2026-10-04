// Screenshots of the prototype: every screen at 360x740 DPR 2 (mobile, id-ID,
// reduced motion so the staggered entrance is settled), the icon, and a few
// wide-viewport and focus-ring extras, into docs/design/screens/.
//
// Uses a running `npm run prototype` on :5180 when there is one, otherwise
// starts its own Vite server for the duration of the run.
import { chromium, type Page } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { createServer } from "vite";

const PORT = 5180;
const BASE = `http://localhost:${PORT}`;
const OUT = "docs/design/screens";

/** [file name, hash route, how to frame it]. `sheet`: viewport only, the dialog is fixed. */
const mobileScreens: ReadonlyArray<
  readonly [string, string, "page" | "viewport"]
> = [
  ["ladder", "ladder", "page"],
  ["teacher", "teacher", "page"],
  ["lesson-meet", "lesson-meet", "viewport"],
  ["lesson-q-glyph", "lesson-q-glyph", "viewport"],
  ["lesson-q-sound", "lesson-q-sound", "viewport"],
  ["lesson-feedback", "lesson-feedback", "page"],
  ["lesson-done", "lesson-done", "viewport"],
  ["chart", "chart", "page"],
  ["chart-detail", "chart+sheet-na", "viewport"],
  ["chart-detail-sandhangan", "chart+sheet-wulu", "viewport"],
  ["review", "review", "page"],
  ["review-help", "review-help", "page"],
  ["review-empty", "review-empty", "page"],
  ["converter-l2a", "converter-l2a", "page"],
  ["converter-l2a-copied", "converter-l2a+toast-copy", "viewport"],
  ["converter-a2l", "converter-a2l+sheet-picker", "viewport"],
  ["settings", "settings", "page"],
  ["settings-report", "settings+sheet-report", "viewport"],
  ["states", "states", "page"],
];

async function probe(): Promise<boolean> {
  try {
    return (await fetch(BASE)).ok;
  } catch {
    return false;
  }
}

async function open(page: Page, route: string): Promise<void> {
  await page.goto(`${BASE}/#${route}`);
  await page.waitForSelector("body[data-ready=true]");
  await page.evaluate(() => document.fonts.ready);
}

/** The 360 px baseline must never scroll sideways. */
async function assertNoOverflow(
  page: Page,
  name: string,
  width: number,
): Promise<void> {
  const scrollWidth = await page.evaluate(
    () => document.documentElement.scrollWidth,
  );
  if (scrollWidth > width) {
    throw new Error(
      `${name}: horizontal overflow, scrollWidth ${scrollWidth} > ${width}`,
    );
  }
}

mkdirSync(OUT, { recursive: true });
const own = (await probe())
  ? undefined
  : await createServer({
      configFile: "prototype/vite.config.ts",
      server: { port: PORT, strictPort: true },
    });
await own?.listen();
const browser = await chromium.launch();
try {
  const mobile = await browser.newContext({
    viewport: { width: 360, height: 740 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    locale: "id-ID",
    reducedMotion: "reduce",
  });
  for (const [name, route, frame] of mobileScreens) {
    // A fresh page per screen: a mobile-emulated page keeps the tallest viewport it was resized to.
    const page = await mobile.newPage();
    await open(page, route);
    await assertNoOverflow(page, name, 360);
    if (frame === "page") {
      // Resize to the content height so fixed bars land where a phone shows them.
      const height = await page.evaluate(
        () => document.documentElement.scrollHeight,
      );
      await page.setViewportSize({ width: 360, height: Math.max(740, height) });
    }
    await page.screenshot({ path: `${OUT}/${name}.png` });
    console.log(`${OUT}/${name}.png`);
    await page.close();
  }

  // Keyboard focus ring: three Tab presses from the top of the ladder.
  const focusPage = await mobile.newPage();
  await open(focusPage, "ladder");
  for (let i = 0; i < 4; i++) await focusPage.keyboard.press("Tab");
  await focusPage.screenshot({ path: `${OUT}/focus-ladder.png` });
  console.log(`${OUT}/focus-ladder.png`);

  const wide = async (
    name: string,
    route: string,
    width: number,
    height: number,
  ) => {
    const context = await browser.newContext({
      viewport: { width, height },
      deviceScaleFactor: 1,
      locale: "id-ID",
      reducedMotion: "reduce",
    });
    const p = await context.newPage();
    await open(p, route);
    await p.screenshot({ path: `${OUT}/${name}.png` });
    console.log(`${OUT}/${name}.png`);
    await context.close();
  };
  await wide("tablet-converter-l2a", "converter-l2a", 800, 1280);
  await wide("desktop-ladder", "ladder", 1280, 800);
  await wide("desktop-chart-detail", "chart+sheet-na", 1280, 800);

  const icons = await browser.newContext({
    viewport: { width: 1200, height: 600 },
    deviceScaleFactor: 1,
  });
  const iconPage = await icons.newPage();
  await iconPage.goto(`${BASE}/icon.html`);
  await iconPage.waitForSelector("#icon-any .icon-glyph:not(:empty)");
  await iconPage.evaluate(() => document.fonts.ready);
  await iconPage
    .locator("#icon-any")
    .screenshot({ path: `${OUT}/icon.png`, omitBackground: true });
  await iconPage
    .locator("#icon-maskable")
    .screenshot({ path: `${OUT}/icon-maskable.png` });
  await iconPage.goto(`${BASE}/icon.html?guide`);
  await iconPage.waitForSelector("#icon-any .icon-glyph:not(:empty)");
  await iconPage.evaluate(() => document.fonts.ready);
  await iconPage
    .locator("#icon-maskable")
    .screenshot({ path: `${OUT}/icon-maskable-guide.png` });
  console.log(`${OUT}/icon.png, icon-maskable.png, icon-maskable-guide.png`);
} finally {
  await browser.close();
  await own?.close();
}
