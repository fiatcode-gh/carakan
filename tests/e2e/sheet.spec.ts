import type { CDPSession, Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { gotoRoute } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";

const id = JSON.parse(readFileSync("src/l10n/id.json", "utf8")) as Record<
  string,
  string
>;

// The chart's detail sheet stands for every sheet: they are all `Sheet`.
const dialog = (page: Page): Locator => page.getByRole("dialog");
const tile = (page: Page): Locator =>
  page.locator('#tab-chart [data-entry="ka"]');
const grab = (page: Page): Locator => page.locator(".sheet__grab");
const top = async (locator: Locator): Promise<number> =>
  (await locator.boundingBox())!.y;
const centre = async (locator: Locator): Promise<[number, number]> => {
  const box = (await locator.boundingBox())!;
  return [box.x + box.width / 2, box.y + box.height / 2];
};

async function openSheet(page: Page): Promise<void> {
  await gotoRoute(page, "#/chart");
  await tile(page).click();
  await expect(dialog(page)).toBeVisible();
  // The sheet slides in; measure only once it has come to rest.
  await expect
    .poll(async () => {
      const before = await top(dialog(page));
      await page.waitForTimeout(80);
      return before === (await top(dialog(page)));
    })
    .toBe(true);
}

/** Presses on a spot and drags `dy` down in a few steps, without releasing. */
async function dragFrom(
  page: Page,
  [x, y]: [number, number],
  dy: number,
  steps = 6,
): Promise<void> {
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x, y + dy, { steps });
}

test("[P-C03] the grab handle drags the sheet down with the pointer and never above its resting place", async ({
  page,
}) => {
  await openSheet(page);
  const rest = await top(dialog(page));
  const [x, y] = await centre(grab(page));

  await dragFrom(page, [x, y], 80);
  await expect.poll(() => top(dialog(page))).toBeCloseTo(rest + 80, 0);

  await page.mouse.move(x, y - 60, { steps: 6 });
  await expect.poll(() => top(dialog(page))).toBeCloseTo(rest, 0);
  await page.mouse.up();
  await expect(dialog(page)).toBeVisible();
});

test("[P-C03] a drag past a quarter of the sheet closes it and returns focus to the tile", async ({
  page,
}) => {
  await openSheet(page);
  const height = (await dialog(page).boundingBox())!.height;
  await dragFrom(page, await centre(grab(page)), Math.ceil(height * 0.3));
  await page.waitForTimeout(250);
  await page.mouse.up();

  await expect(dialog(page)).toBeHidden();
  await expect(tile(page)).toBeFocused();
});

test("[P-C03] a drag that starts on the sheet title closes it too", async ({
  page,
}) => {
  await openSheet(page);
  const height = (await dialog(page).boundingBox())!.height;
  await dragFrom(
    page,
    await centre(dialog(page).locator(".sheet__title")),
    Math.ceil(height * 0.3),
  );
  await page.waitForTimeout(250);
  await page.mouse.up();

  await expect(dialog(page)).toBeHidden();
});

test("[P-C03] a short slow drag springs the sheet back", async ({ page }) => {
  await openSheet(page);
  const rest = await top(dialog(page));
  await dragFrom(page, await centre(grab(page)), 30);
  await page.waitForTimeout(250);
  await page.mouse.up();

  await expect(dialog(page)).toBeVisible();
  await expect.poll(() => top(dialog(page))).toBeCloseTo(rest, 0);
});

test("[P-C03] a quick downward fling closes the sheet even when it moved little", async ({
  page,
}) => {
  await openSheet(page);
  const height = (await dialog(page).boundingBox())!.height;
  const dy = 60;
  expect(dy, "less than a quarter of the sheet").toBeLessThan(height * 0.25);
  await dragFrom(page, await centre(grab(page)), dy, 3);
  await page.mouse.up();

  await expect(dialog(page)).toBeHidden();
});

test("[P-C03] dragging on the scrolling body does not move the sheet", async ({
  page,
}) => {
  await openSheet(page);
  const rest = await top(dialog(page));
  await dragFrom(page, await centre(dialog(page).locator(".sheet__body")), 200);
  expect(await top(dialog(page))).toBe(rest);
  await page.mouse.up();
  await expect(dialog(page)).toBeVisible();
  expect(await top(dialog(page))).toBe(rest);
});

test("[P-C03] a finger drag on the handle closes the sheet", async ({
  page,
}) => {
  await openSheet(page);
  const height = (await dialog(page).boundingBox())!.height;
  const [x, y] = await centre(grab(page));
  const cdp: CDPSession = await page.context().newCDPSession(page);
  try {
    const touch = (
      type: "touchStart" | "touchMove" | "touchEnd",
      at: number | null,
    ) =>
      cdp.send("Input.dispatchTouchEvent", {
        type,
        touchPoints: at === null ? [] : [{ x, y: at }],
      });
    await touch("touchStart", y);
    for (let step = 1; step <= 8; step += 1) {
      await touch("touchMove", y + (height * 0.4 * step) / 8);
    }
    await page.waitForTimeout(250);
    await touch("touchEnd", null);
  } finally {
    await cdp.detach();
  }
  await expect(dialog(page)).toBeHidden();
  await expect(tile(page)).toBeFocused();
});

test("[P-C03] the drag zone takes no browser panning", async ({ page }) => {
  await openSheet(page);
  const action = await grab(page).evaluate(
    (el) => getComputedStyle(el.closest("[data-sheet-drag]")!).touchAction,
  );
  expect(action).toBe("none");
});

test("[P-C03] the close button and Escape still close the sheet", async ({
  page,
}) => {
  await openSheet(page);
  await dialog(page).getByRole("button", { name: id["closeButton"]! }).click();
  await expect(dialog(page)).toBeHidden();

  await tile(page).click();
  await page.keyboard.press("Escape");
  await expect(dialog(page)).toBeHidden();
});

test.describe("reduced motion", () => {
  test.use({ reducedMotion: "reduce" });

  test("[P-C03] the sheet follows the finger but neither springs back nor slides away", async ({
    page,
  }) => {
    await openSheet(page);
    const rest = await top(dialog(page));
    await dragFrom(page, await centre(grab(page)), 30);
    await page.waitForTimeout(250);
    await page.mouse.up();
    // Under reduced motion every transition lasts 0.01 ms (base.css); anything
    // longer is a slide the user asked not to see.
    expect(
      await dialog(page).evaluate(
        (el) =>
          el
            .getAnimations()
            .filter(
              (a) =>
                a.playState === "running" &&
                Number(a.effect?.getTiming().duration) > 1,
            ).length,
      ),
      "no visible animation runs after the release",
    ).toBe(0);
    await expect.poll(() => top(dialog(page))).toBe(rest);

    const height = (await dialog(page).boundingBox())!.height;
    await dragFrom(page, await centre(grab(page)), Math.ceil(height * 0.3));
    await page.waitForTimeout(250);
    await page.mouse.up();
    await expect(dialog(page)).toBeHidden();
  });
});

test.describe("a wide screen", () => {
  test.use({ viewport: { width: 800, height: 1280 } });

  test("[P-C03] the centred dialog has no handle and does not drag", async ({
    page,
  }) => {
    await openSheet(page);
    await expect(grab(page)).toBeHidden();
    const rest = await top(dialog(page));
    await dragFrom(
      page,
      await centre(dialog(page).locator(".sheet__title")),
      200,
    );
    expect(await top(dialog(page))).toBe(rest);
    await page.mouse.up();
    await expect(dialog(page)).toBeVisible();
  });
});

test("[W03] a pull down never reaches the browser: no pull-to-refresh", async ({
  page,
}) => {
  await openSheet(page);
  const behaviours = await page.evaluate(() => {
    const y = (el: Element) => getComputedStyle(el).overscrollBehaviorY;
    return {
      html: y(document.documentElement),
      body: y(document.body),
      sheetBody: y(document.querySelector(".sheet__body")!),
    };
  });
  expect(behaviours).toEqual({
    html: "contain",
    body: "contain",
    sheetBody: "contain",
  });
});
