import { auditRoutes, href, isTabRoot } from "../../src/app/router.ts";
import { expectNoHorizontalOverflow } from "./support/a11y.ts";
import { gotoRoute } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";

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

test("[P-S01] the tab bar is visible on tab roots and hidden on pushed pages", async ({
  page,
}) => {
  const nav = page.getByRole("navigation");
  for (const route of auditRoutes) {
    await gotoRoute(page, href(route));
    if (isTabRoot(route)) {
      await expect(nav).toBeVisible();
      const box = (await nav.boundingBox())!;
      const viewport = page.viewportSize()!;
      if (viewport.width >= 960) {
        expect(box.x).toBe(0);
        expect(box.height).toBe(viewport.height);
      } else {
        expect(box.y + box.height).toBe(viewport.height);
        expect(box.width).toBe(viewport.width);
      }
    } else {
      await expect(nav).toBeHidden();
    }
  }
});
