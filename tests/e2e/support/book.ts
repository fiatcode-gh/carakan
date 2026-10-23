import type { Page } from "@playwright/test";

/** 48rem: the one breakpoint of the wide (notebook) layout. */
export const WIDE_MIN_PX = 768;
/** 64rem: the desktop desk with the wordmark. */
export const DESKTOP_MIN_PX = 1024;

export const isWide = (page: Page): boolean =>
  page.viewportSize()!.width >= WIDE_MIN_PX;

/** The book page's rectangle: the fixed frame drawn over it. */
export async function frameBox(
  page: Page,
): Promise<{ x: number; y: number; width: number; height: number }> {
  return (await page.locator(".desk__frame").boundingBox())!;
}

/** The index tabs' section colours, in tab order. */
export const SECTION_TOKENS = [
  "--color-coral",
  "--color-periwinkle",
  "--color-sage",
  "--color-butter",
] as const;
