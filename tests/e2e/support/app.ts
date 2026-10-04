import type { Page } from "@playwright/test";
import type { LocaleSetting } from "../../../src/core/locale/locale-controller.ts";

/** Opens a hash route and waits until bootstrap has finished. */
export async function gotoRoute(page: Page, hash: string): Promise<void> {
  await page.goto(`/${hash}`);
  await page.locator('#app[data-boot="ready"]').waitFor();
}

/** Pre-seeds the persisted UI-language choice before the app starts. */
export async function seedLocale(
  page: Page,
  setting: LocaleSetting,
): Promise<void> {
  await page.addInitScript((value) => {
    localStorage.setItem("carakan.uiLocale", value);
  }, setting);
}
