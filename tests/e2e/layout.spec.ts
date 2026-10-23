import type { Locator } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  auditRoutes,
  href,
  isTabRoot,
  tabIds,
  tabOf,
} from "../../src/app/router.ts";
import { SRS_ITEMS } from "../../src/core/db/schema.ts";
import { expectNoHorizontalOverflow, settle } from "./support/a11y.ts";
import { gotoRoute, tokenColor } from "./support/app.ts";
import {
  DESKTOP_MIN_PX,
  frameBox,
  isWide,
  SECTION_TOKENS,
  WIDE_MIN_PX,
} from "./support/book.ts";
import { expect, test } from "./support/fixtures.ts";
import { writeRows } from "./support/lesson.ts";

const id = JSON.parse(readFileSync("src/l10n/id.json", "utf8")) as Record<
  string,
  string
>;

const CONTENT_MAX_PX = 40 * 16;
const CONTENT_WIDE_PX = 64 * 16;

const reviewSeed = () => {
  const now = Date.now();
  const HOUR = 3_600_000;
  const DAY = 24 * HOUR;
  return [
    {
      itemId: "pa",
      intervalDays: 3,
      ease: 2.5,
      repetitions: 2,
      dueAt: now - HOUR,
      lastReviewedAt: now - HOUR - 3 * DAY,
    },
    {
      itemId: "ha",
      intervalDays: 1,
      ease: 2.5,
      repetitions: 1,
      dueAt: now - HOUR / 2,
      lastReviewedAt: now - HOUR / 2 - DAY,
    },
    {
      itemId: "ya",
      intervalDays: 0,
      ease: 2.5,
      repetitions: 0,
      dueAt: now - HOUR / 3,
      lastReviewedAt: null,
    },
  ];
};

/** Distinct rounded x positions: the number of columns of a grid's items. */
const columnsOf = async (items: Locator): Promise<number> => {
  const xs = await items.evaluateAll((els) =>
    els.map((el) => Math.round(el.getBoundingClientRect().x)),
  );
  return new Set(xs).size;
};

const learnColumns = (width: number) =>
  width < 768 ? 2 : width < 1200 ? 3 : 4;
const chartColumns = (width: number) => (width < 1200 ? 5 : 10);

for (const route of auditRoutes) {
  test(`[P-A11Y] ${href(route)} fits and keeps content within the maximum width`, async ({
    page,
  }) => {
    await gotoRoute(page, href(route));
    await expectNoHorizontalOverflow(page);
    const width = await page
      .locator("main:visible")
      .evaluate((el) => el.getBoundingClientRect().width);
    const inner = await page
      .locator("main:visible .page, main:visible")
      .first()
      .evaluate((el) => {
        const style = getComputedStyle(el);
        return (
          el.getBoundingClientRect().width -
          parseFloat(style.paddingLeft) -
          parseFloat(style.paddingRight)
        );
      });
    const viewport = page.viewportSize()!.width;
    const wideRoot = viewport >= WIDE_MIN_PX && isTabRoot(route);
    expect(inner).toBeLessThanOrEqual(
      (wideRoot ? CONTENT_WIDE_PX : CONTENT_MAX_PX) + 1,
    );
    if (viewport >= DESKTOP_MIN_PX && isTabRoot(route)) {
      expect(inner).toBeGreaterThan(CONTENT_MAX_PX);
    }
    expect(width).toBeGreaterThan(0);
  });
}

test("[P-A11Y] Learn shows 2, 3 or 4 tiles per row", async ({ page }) => {
  await gotoRoute(page, "#/");
  const tiles = page.locator("#tab-ladder .ladder__tiles").nth(0).locator("li");
  await expect(tiles.first()).toBeVisible();
  expect(await columnsOf(tiles)).toBe(learnColumns(page.viewportSize()!.width));
});

test("[P-A11Y] the chart shows 5 or 10 tile columns from 48rem", async ({
  page,
}) => {
  test.skip(!isWide(page), "phones keep the auto-fill grid");
  await gotoRoute(page, "#/chart");
  const tiles = page
    .locator('[role="tabpanel"]:visible')
    .locator(".grid")
    .first()
    .locator(".aksara-tile");
  await expect(tiles.first()).toBeVisible();
  expect(await columnsOf(tiles)).toBe(chartColumns(page.viewportSize()!.width));
});

test("[P-A11Y] Review puts Hari ini beside the strength list from 64rem", async ({
  page,
}) => {
  await gotoRoute(page, "");
  await writeRows(page, SRS_ITEMS, reviewSeed());
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  await gotoRoute(page, "#/review");
  await expect(page.locator(".review__strengths")).toBeVisible();
  await expect(
    page.getByRole("button", { name: id["reviewStartButton"]! }),
  ).toBeVisible();
  await settle(page);
  const today = (await page.locator(".review-today").boundingBox())!;
  const strengths = (await page.locator(".review__strengths").boundingBox())!;
  if (page.viewportSize()!.width >= DESKTOP_MIN_PX) {
    expect(strengths.x).toBeGreaterThanOrEqual(today.x + today.width);
    expect(Math.abs(strengths.y - today.y)).toBeLessThanOrEqual(1);
  } else {
    expect(strengths.y).toBeGreaterThanOrEqual(today.y + today.height);
  }
});

test("[P-A11Y] the converter puts input and result side by side from 64rem", async ({
  page,
}) => {
  await gotoRoute(page, "#/converter");
  const field = page.getByLabel(id["inputHintLatin"]!);
  await field.fill("hanacaraka");
  const region = page.getByRole("region", { name: id["outputLabel"]! });
  await expect(region).toBeVisible();
  const input = (await field.boundingBox())!;
  const result = (await region.boundingBox())!;
  if (page.viewportSize()!.width >= DESKTOP_MIN_PX) {
    expect(result.x).toBeGreaterThanOrEqual(input.x + input.width);
  } else {
    expect(result.y).toBeGreaterThanOrEqual(input.y + input.height);
  }
});

test("[P-S01] one navigation landmark: a bottom bar on phones, index tabs on the book's edge from 48rem", async ({
  page,
}) => {
  const nav = page.getByRole("navigation");
  for (const route of auditRoutes) {
    await gotoRoute(page, href(route));
    if (!isTabRoot(route)) {
      await expect(nav).toHaveCount(0);
      continue;
    }
    await expect(nav).toHaveCount(1);
    const box = (await nav.boundingBox())!;
    if (!isWide(page)) {
      const viewport = page.viewportSize()!;
      expect(box.y + box.height).toBe(viewport.height);
      expect(box.width).toBe(viewport.width);
      continue;
    }
    const frame = await frameBox(page);
    expect(Math.abs(box.x - (frame.x + frame.width))).toBeLessThanOrEqual(1);
    expect(box.y).toBeGreaterThanOrEqual(frame.y);

    const links = nav.getByRole("link");
    const ink = await tokenColor(page, "--color-ink");
    const current = tabIds.indexOf(tabOf(route)!);
    const widths: number[] = [];
    for (let i = 0; i < SECTION_TOKENS.length; i += 1) {
      const link = links.nth(i);
      const style = await link.evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          background: s.backgroundColor,
          color: s.color,
          shadow: s.boxShadow,
        };
      });
      expect(style.background).toBe(await tokenColor(page, SECTION_TOKENS[i]!));
      expect(style.color).toBe(ink);
      widths.push((await link.boundingBox())!.width);
      if (i === current) {
        await expect(link).toHaveAttribute("aria-current", "page");
        expect(style.shadow).not.toBe("none");
      } else {
        expect(style.shadow).toBe("none");
      }
    }
    for (let i = 0; i < widths.length; i += 1) {
      if (i !== current)
        expect(widths[current]! - widths[i]!).toBeGreaterThanOrEqual(8);
    }
  }
});

test("[P-S01] the wordmark stands on the desk from 64rem, hidden from assistive technology", async ({
  page,
}) => {
  await gotoRoute(page, "#/");
  const wordmark = page.locator(".desk__wordmark");
  const desktop = page.viewportSize()!.width >= DESKTOP_MIN_PX;
  expect(await wordmark.isVisible()).toBe(desktop);
  if (!desktop) return;
  await expect(wordmark).toHaveAttribute("aria-hidden", "true");
  await expect(wordmark).toHaveText(id["appTitle"]!);
  const box = (await wordmark.boundingBox())!;
  expect(box.x + box.width).toBeLessThanOrEqual((await frameBox(page)).x);
});

test("[P-A11Y] from 48rem the page is a book on the desk", async ({ page }) => {
  test.skip(!isWide(page), "phones have no desk");
  await gotoRoute(page, "#/");
  const colour = (selector: string) =>
    page
      .locator(selector)
      .first()
      .evaluate((el) => {
        const s = getComputedStyle(el);
        return {
          background: s.backgroundColor,
          borderTopWidth: s.borderTopWidth,
          borderTopColor: s.borderTopColor,
          shadow: s.boxShadow,
        };
      });
  expect((await colour("body")).background).toBe(
    await tokenColor(page, "--color-neutral"),
  );
  expect((await colour(".book")).background).toBe(
    await tokenColor(page, "--color-paper"),
  );
  const frame = await colour(".desk__frame");
  expect(frame.borderTopWidth).toBe("2px");
  expect(frame.borderTopColor).toBe(await tokenColor(page, "--color-ink"));
  expect(frame.shadow).not.toBe("none");
  for (const selector of [
    ".desk__frame",
    ".desk__band--top",
    ".desk__band--bottom",
    ".desk__wordmark",
  ]) {
    await expect(page.locator(selector)).toHaveAttribute("aria-hidden", "true");
  }
});

test("[P-A11Y] the page scrolls inside a fixed book: PageDown scrolls, frame and tabs stay", async ({
  page,
}) => {
  test.skip(!isWide(page), "phones have no desk");
  await gotoRoute(page, "#/");
  // Test-only: make the page taller than any viewport whatever the grids do.
  await page.locator("main:visible").evaluate((el) => {
    const filler = document.createElement("div");
    filler.style.height = "3000px";
    el.append(filler);
  });
  const nav = page.getByRole("navigation");
  const frame = await frameBox(page);
  const tabs = (await nav.boundingBox())!;
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  await page.keyboard.press("PageDown");
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);
  expect(await frameBox(page)).toEqual(frame);
  expect(await nav.boundingBox()).toEqual(tabs);
});

test("[P-A11Y] a toast sits inside the book", async ({ page }) => {
  test.skip(!isWide(page), "phones have no desk");
  await gotoRoute(page, "#/converter");
  await page.getByLabel(id["inputHintLatin"]!).fill("hanacaraka");
  await page.getByRole("button", { name: id["listenButton"]! }).click();
  const toast = page
    .getByRole("status")
    .filter({ hasText: id["audioComingSoon"]! });
  await expect(toast).toBeVisible();
  const box = (await toast.boundingBox())!;
  const frame = await frameBox(page);
  expect(box.x).toBeGreaterThanOrEqual(frame.x);
  expect(box.x + box.width).toBeLessThanOrEqual(frame.x + frame.width);
  expect(
    Math.abs(box.x + box.width / 2 - (frame.x + frame.width / 2)),
  ).toBeLessThanOrEqual(1);
  expect(box.y + box.height).toBeLessThanOrEqual(frame.y + frame.height);
});

const SIZES = [
  { width: 768, height: 1024 },
  { width: 1024, height: 768 },
  { width: 1280, height: 800 },
  { width: 1440, height: 900 },
] as const;

for (const { width, height } of SIZES) {
  for (const route of auditRoutes) {
    test(`[P-A11Y] ${width}x${height} ${href(route)} has no horizontal overflow and keeps the tabs on screen`, async ({
      page,
    }, testInfo) => {
      test.skip(
        testInfo.project.name !== "desktop",
        "one run is enough: each test sets its own viewport",
      );
      await page.setViewportSize({ width, height });
      await gotoRoute(page, href(route));
      await expectNoHorizontalOverflow(page);
      if (!isTabRoot(route)) return;
      const nav = page.getByRole("navigation");
      const box = (await nav.boundingBox())!;
      const frame = await frameBox(page);
      expect(box.x + box.width).toBeLessThanOrEqual(width);
      expect(Math.abs(box.x - (frame.x + frame.width))).toBeLessThanOrEqual(1);
      const links = nav.getByRole("link");
      await expect(links).toHaveCount(4);
      for (const link of await links.all()) await expect(link).toBeVisible();
    });
  }
}

for (const { width, height } of SIZES) {
  test(`[P-A11Y] ${width}x${height} Learn and chart column counts`, async ({
    page,
  }, testInfo) => {
    test.skip(
      testInfo.project.name !== "desktop",
      "one run is enough: each test sets its own viewport",
    );
    await page.setViewportSize({ width, height });
    await gotoRoute(page, "#/");
    const learn = page
      .locator("#tab-ladder .ladder__tiles")
      .nth(0)
      .locator("li");
    await expect(learn.first()).toBeVisible();
    expect(await columnsOf(learn)).toBe(learnColumns(width));
    await gotoRoute(page, "#/chart");
    const chart = page
      .locator('[role="tabpanel"]:visible')
      .locator(".grid")
      .first()
      .locator(".aksara-tile");
    await expect(chart.first()).toBeVisible();
    expect(await columnsOf(chart)).toBe(chartColumns(width));
  });
}
