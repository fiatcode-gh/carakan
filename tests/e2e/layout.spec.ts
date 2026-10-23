import { readFileSync } from "node:fs";
import {
  auditRoutes,
  href,
  isTabRoot,
  tabIds,
  tabOf,
} from "../../src/app/router.ts";
import { expectNoHorizontalOverflow } from "./support/a11y.ts";
import { gotoRoute, tokenColor } from "./support/app.ts";
import {
  DESKTOP_MIN_PX,
  frameBox,
  isWide,
  SECTION_TOKENS,
} from "./support/book.ts";
import { expect, test } from "./support/fixtures.ts";

const id = JSON.parse(readFileSync("src/l10n/id.json", "utf8")) as Record<
  string,
  string
>;

const CONTENT_MAX_PX = 40 * 16;

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
    expect(inner).toBeLessThanOrEqual(CONTENT_MAX_PX + 1);
    expect(width).toBeGreaterThan(0);
  });
}

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
