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

/** The computed colour a design token resolves to (e.g. `--color-ink`). */
export function tokenColor(page: Page, token: string): Promise<string> {
  return page.evaluate((name) => {
    const probe = document.createElement("span");
    probe.style.color = `var(${name})`;
    document.body.append(probe);
    const colour = getComputedStyle(probe).color;
    probe.remove();
    return colour;
  }, token);
}
