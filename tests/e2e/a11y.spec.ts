import { auditRoutes, href, isTabRoot } from "../../src/app/router.ts";
import {
  expectAccessible,
  expectFocusVisible,
  expectNoHorizontalOverflow,
  expectReducedMotion,
  expectTouchTargets,
} from "./support/a11y.ts";
import { gotoRoute, seedLocale } from "./support/app.ts";
import { test } from "./support/fixtures.ts";

for (const locale of ["id", "en"] as const) {
  for (const route of auditRoutes) {
    test(`[P-A11Y] ${href(route)} (${locale}) is accessible, touchable and fits`, async ({
      page,
    }) => {
      await seedLocale(page, locale);
      await gotoRoute(page, href(route));
      await expectAccessible(page);
      await expectTouchTargets(page);
      await expectNoHorizontalOverflow(page);
    });
  }
}

for (const route of auditRoutes.filter(isTabRoot)) {
  test(`[P-A11Y] ${href(route)} shows focus rings`, async ({ page }) => {
    await gotoRoute(page, href(route));
    await expectFocusVisible(page);
  });

  test(`[P-A11Y] ${href(route)} honours reduced motion`, async ({ page }) => {
    await gotoRoute(page, href(route));
    await expectReducedMotion(page);
  });
}
