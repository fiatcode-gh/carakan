import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

/** axe reads colors mid-fade otherwise: wait for every entrance animation. */
export const settle = (page: Page) =>
  page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );

export async function expectAccessible(page: Page): Promise<void> {
  await settle(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    results.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target.join(" ")),
    })),
  ).toEqual([]);
}

const TARGETS =
  'a[href], button, input, select, textarea, summary, [role=button], [role=radio], [role=tab], [tabindex]:not([tabindex="-1"])';

/** Visible interactive elements are at least 48x48 CSS px; links in text are exempt. */
export async function expectTouchTargets(page: Page): Promise<void> {
  const small = await page.evaluate((selector) => {
    const out: string[] = [];
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      if (!el.checkVisibility({ visibilityProperty: true })) continue;
      if (el.closest(".visually-hidden") || el.matches(".skip-link")) continue;
      if (
        el instanceof HTMLAnchorElement &&
        el.closest("p, li, dd, .prose") &&
        !el.matches(".btn, .tab-bar__item") &&
        getComputedStyle(el).display === "inline"
      ) {
        continue;
      }
      if (el instanceof HTMLInputElement && el.type === "radio") {
        const wrapper = el.closest("label") ?? el;
        const box = wrapper.getBoundingClientRect();
        if (box.width >= 47.5 && box.height >= 47.5) continue;
      }
      const box = el.getBoundingClientRect();
      if (box.width < 47.5 || box.height < 47.5) {
        out.push(
          `${el.tagName.toLowerCase()}.${el.className} ${Math.round(box.width)}x${Math.round(box.height)}`,
        );
      }
    }
    return out;
  }, TARGETS);
  expect(small, "interactive targets under 48x48 CSS px").toEqual([]);
}

export async function expectNoHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  );
  expect(overflow, "horizontal overflow in CSS px").toBeLessThanOrEqual(0);
}

/** Tab through the page: every focused element draws an outline or a box-shadow ring. */
export async function expectFocusVisible(page: Page, n = 10): Promise<void> {
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur());
  const unringed: string[] = [];
  for (let i = 0; i < n; i++) {
    await page.keyboard.press("Tab");
    const ring = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const style = getComputedStyle(el);
      const outlined =
        style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
      const shadow = style.boxShadow !== "none";
      return {
        name: `${el.tagName.toLowerCase()}.${el.className}`,
        ok: outlined || shadow,
      };
    });
    if (ring && !ring.ok) unringed.push(ring.name);
  }
  expect(unringed, "focused elements without a visible ring").toEqual([]);
}

/** Under reduced motion every element's animation and transition are (near) instant. */
export async function expectReducedMotion(page: Page): Promise<void> {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const slow = await page.evaluate(() => {
    const seconds = (value: string) =>
      Math.max(
        ...value
          .split(",")
          .map((part) => parseFloat(part) * (part.includes("ms") ? 0.001 : 1)),
      );
    const out: string[] = [];
    for (const el of document.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      if (
        seconds(style.animationDuration) > 0.01 ||
        seconds(style.transitionDuration) > 0.01
      ) {
        out.push(`${el.tagName.toLowerCase()}.${el.className}`);
      }
    }
    return out;
  });
  expect(slow, "elements still animating under reduced motion").toEqual([]);
}
