import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { kajRulesetId } from "../../src/engine/index.ts";
import { gotoRoute } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";
import { createSolver } from "./support/solver.ts";
import {
  draw,
  glyphRuns,
  line,
  offsetBy,
  padBox,
  scribble,
  strokesOf,
  zigzagOver,
  type Pointer,
  type Pt,
} from "./support/trace.ts";

const id = JSON.parse(readFileSync("src/l10n/id.json", "utf8")) as Record<
  string,
  string
>;
const solver = await createSolver(kajRulesetId);
const glyph = (glyphId: string) => solver.table.byId.get(glyphId)!;

const button = (page: Page, key: string) =>
  page.getByRole("button", { name: id[key]!, exact: true });
const status = (page: Page) => page.locator(".trace").getByRole("status");
const progress = (page: Page) =>
  page.locator(".trace").getByRole("progressbar");
const doneSlots = (page: Page) =>
  page.locator('.trace .slot[data-done="true"]');

/** Opens the pad and waits until the ghost glyph has been laid out. */
async function openTrace(page: Page, glyphId = "pa"): Promise<void> {
  await gotoRoute(page, `#/trace/${glyphId}`);
  await expect(page.locator(".trace-pad[data-font-size]")).toBeVisible();
}

async function traceGlyph(page: Page, pointer: Pointer): Promise<void> {
  await draw(page, pointer, strokesOf(await glyphRuns(page, glyph("pa").char)));
}

async function inkPixels(page: Page): Promise<number> {
  return page
    .locator(".trace-pad__ink")
    .evaluate((canvas: HTMLCanvasElement) => {
      const { data } = canvas
        .getContext("2d")!
        .getImageData(0, 0, canvas.width, canvas.height);
      let sum = 0;
      for (let i = 3; i < data.length; i += 4) sum += data[i]!;
      return sum;
    });
}

test("[P-B20] the pad shows the glyph reading, three empty slots and no stroke guidance", async ({
  page,
}) => {
  await openTrace(page);
  await expect(page.locator(".trace__reading")).toHaveText(glyph("pa").pujl);
  await expect(progress(page)).toHaveAttribute("aria-valuenow", "0");
  await expect(page.locator(".trace .slot")).toHaveCount(3);
  await expect(doneSlots(page)).toHaveCount(0);
  await expect(page.getByText(/goresan|stroke/i)).toHaveCount(0);
});

test("[P-B20] a mouse trace passes three times and Lanjut returns to the chart", async ({
  page,
}) => {
  await gotoRoute(page, "#/chart");
  await page.locator('#tab-chart [data-entry="pa"]').click();
  await page.getByRole("button", { name: /Tulis pa$/ }).click();
  await expect(page).toHaveURL(/#\/trace\/pa$/);
  await expect(page.locator(".trace-pad[data-font-size]")).toBeVisible();
  const strokes = strokesOf(await glyphRuns(page, glyph("pa").char));

  for (const passes of [1, 2, 3]) {
    await draw(page, "mouse", strokes);
    await button(page, "traceCheck").or(button(page, "continueButton")).click();
    await expect(progress(page)).toHaveAttribute(
      "aria-valuenow",
      String(passes),
    );
    await expect(doneSlots(page)).toHaveCount(passes);
    await expect(status(page)).toHaveText(
      id[passes === 3 ? "tracePassLast" : "tracePass"]!,
    );
    await expect(page.locator(".trace__count")).toHaveText(`${passes}/3`);
    expect(await inkPixels(page), "ink clears after a pass").toBe(0);
    if (passes < 3) await expect(button(page, "traceCheck")).toBeVisible();
  }

  await expect(button(page, "continueButton")).toBeFocused();
  await button(page, "continueButton").click();
  await expect(page).toHaveURL(/#\/chart$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("[P-B20] a touch trace passes", async ({ page }) => {
  await openTrace(page);
  await traceGlyph(page, "touch");
  await button(page, "traceCheck").click();
  await expect(status(page)).toHaveText(id["tracePass"]!);
  await expect(doneSlots(page)).toHaveCount(1);
});

test("[P-B20] a pen trace passes", async ({ page }) => {
  await openTrace(page);
  await traceGlyph(page, "pen");
  await button(page, "traceCheck").click();
  await expect(status(page)).toHaveText(id["tracePass"]!);
  await expect(doneSlots(page)).toHaveCount(1);
});

test("[P-B20] a scribble across the whole pad fails and fills no slot", async ({
  page,
}) => {
  await openTrace(page);
  await draw(page, "mouse", await scribble(page));
  await button(page, "traceCheck").click();
  await expect(status(page)).toHaveText(id["traceFail"]!);
  await expect(doneSlots(page)).toHaveCount(0);
  expect(await inkPixels(page), "failed ink stays").toBeGreaterThan(0);
});

test("[P-B20] a short stroke in a corner away from the glyph fails", async ({
  page,
}) => {
  await openTrace(page);
  const box = await padBox(page);
  const from: Pt = [box.x + 20, box.y + 20];
  await draw(page, "mouse", [line(from, [from[0] + 60, from[1] + 20])]);
  await button(page, "traceCheck").click();
  await expect(status(page)).toHaveText(id["traceFail"]!);
  await expect(doneSlots(page)).toHaveCount(0);
});

test("[P-B20] a sloppy trace, off by half the stroke width, still passes", async ({
  page,
}) => {
  await openTrace(page);
  const strokes = strokesOf(await glyphRuns(page, glyph("pa").char));
  await draw(page, "mouse", offsetBy(strokes, 6, 6));
  await button(page, "traceCheck").click();
  await expect(status(page)).toHaveText(id["tracePass"]!);
  await expect(doneSlots(page)).toHaveCount(1);
});

for (const glyphId of ["pa", "ha", "nga"]) {
  for (const spacing of [12, 18, 24]) {
    test(`[P-B20] a blind zigzag over the ${glyphId} ink box, rows ${spacing}px apart, fails and fills no slot`, async ({
      page,
    }) => {
      await openTrace(page, glyphId);
      const runs = await glyphRuns(page, glyph(glyphId).char);
      await draw(page, "mouse", zigzagOver(runs, spacing));
      await button(page, "traceCheck").click();
      await expect(status(page)).toHaveText(id["traceFail"]!);
      await expect(doneSlots(page)).toHaveCount(0);
    });
  }
}

/** Summed alpha of the ink within 10 CSS px of a viewport point. */
function inkNear(page: Page, [x, y]: Pt): Promise<number> {
  return page.locator(".trace-pad__ink").evaluate(
    (canvas: HTMLCanvasElement, at: readonly [number, number]) => {
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      const half = Math.round(10 * scale);
      const { data } = canvas
        .getContext("2d")!
        .getImageData(
          Math.round((at[0] - rect.left) * scale) - half,
          Math.round((at[1] - rect.top) * scale) - half,
          half * 2,
          half * 2,
        );
      let sum = 0;
      for (let i = 3; i < data.length; i += 4) sum += data[i]!;
      return sum;
    },
    [x, y] as const,
  );
}

test("[P-B20] a second finger down while one draws is ignored", async ({
  page,
}) => {
  await openTrace(page);
  const box = await padBox(page);
  const first: Pt = [box.x + 40, box.y + 40];
  const second: Pt = [box.x + box.width - 40, box.y + box.height - 40];
  const cdp = await page.context().newCDPSession(page);
  const point = ([x, y]: Pt, pointId: number) => ({ x, y, id: pointId });
  const touch = (
    type: "touchStart" | "touchMove" | "touchEnd",
    touchPoints: { x: number; y: number; id: number }[],
  ) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints });
  try {
    await touch("touchStart", [point(first, 1)]);
    await touch("touchStart", [point(first, 1), point(second, 2)]);
    const movedFirst: Pt = [first[0] + 30, first[1] + 10];
    const movedSecond: Pt = [second[0] - 30, second[1] - 10];
    await touch("touchMove", [point(movedFirst, 1), point(movedSecond, 2)]);
    await touch("touchEnd", []);
  } finally {
    await cdp.detach();
  }
  expect(await inkNear(page, [first[0] + 30, first[1] + 10])).toBeGreaterThan(
    0,
  );
  expect(await inkNear(page, second), "no ink under the second finger").toBe(0);
  expect(
    await inkNear(page, [second[0] - 30, second[1] - 10]),
    "no ink where the second finger moved",
  ).toBe(0);
});

test("[P-B20] a pointer that cannot be captured does not lock the pad", async ({
  page,
}) => {
  await openTrace(page);
  // An unknown pointer id makes setPointerCapture throw, as a lifted finger would.
  await page.locator(".trace-pad__ink").evaluate((canvas) => {
    canvas.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerId: 999,
        clientX: 40,
        clientY: 40,
        bubbles: true,
      }),
    );
  });
  await traceGlyph(page, "mouse");
  await button(page, "traceCheck").click();
  await expect(status(page)).toHaveText(id["tracePass"]!);
  await expect(doneSlots(page)).toHaveCount(1);
});

test("[P-B20] resizing the pad rubs out the ink, so Selesai finds an empty pad", async ({
  page,
}) => {
  await openTrace(page);
  await draw(page, "mouse", await scribble(page));
  expect(await inkPixels(page)).toBeGreaterThan(0);
  await page.locator(".trace-pad").evaluate((pad: HTMLElement) => {
    pad.style.width = `${pad.clientWidth - 40}px`;
  });
  await expect.poll(() => inkPixels(page)).toBe(0);
  await button(page, "traceCheck").click();
  await expect(status(page)).toHaveText(id["traceEmpty"]!);
});

test("[P-B20] Selesai on an empty pad asks to write first", async ({
  page,
}) => {
  await openTrace(page);
  await button(page, "traceCheck").click();
  await expect(status(page)).toHaveText(id["traceEmpty"]!);
  await expect(doneSlots(page)).toHaveCount(0);
});

test("[P-B20] Hapus clears the ink, so Selesai finds an empty pad", async ({
  page,
}) => {
  await openTrace(page);
  await draw(page, "mouse", await scribble(page));
  expect(await inkPixels(page)).toBeGreaterThan(0);
  await button(page, "traceClear").click();
  expect(await inkPixels(page)).toBe(0);
  await button(page, "traceCheck").click();
  await expect(status(page)).toHaveText(id["traceEmpty"]!);
});

test("[P-B20] Lewati finishes at once", async ({ page }) => {
  await gotoRoute(page, "#/chart");
  await page.locator('#tab-chart [data-entry="pa"]').click();
  await page.getByRole("button", { name: /Tulis pa$/ }).click();
  await expect(page.locator(".trace-pad[data-font-size]")).toBeVisible();
  await button(page, "traceSkip").click();
  await expect(page).toHaveURL(/#\/chart$/);
});

test("[P-B20] Tab reaches back, Lewati, Hapus and Selesai, each with a ring", async ({
  page,
}) => {
  await openTrace(page);
  const wanted = [
    id["backButton"]!,
    id["traceSkip"]!,
    id["traceClear"]!,
    id["traceCheck"]!,
  ];
  const reached: string[] = [];
  for (let i = 0; i < 8 && reached.length < wanted.length; i++) {
    await page.keyboard.press("Tab");
    const focus = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const style = getComputedStyle(el);
      return {
        name: el.getAttribute("aria-label") ?? el.textContent?.trim() ?? "",
        ringed:
          style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0,
      };
    });
    if (wanted.includes(focus.name)) {
      expect(focus.ringed, `${focus.name} shows a focus ring`).toBe(true);
      reached.push(focus.name);
    }
  }
  expect(reached).toEqual(wanted);
});

test("[P-C09] Tulis ha on a base letter opens its trace page; back returns to the chart", async ({
  page,
}) => {
  await gotoRoute(page, "#/chart");
  await page.locator('#tab-chart [data-entry="ha"]').click();
  await page.getByRole("button", { name: /Tulis ha$/ }).click();
  await expect(page).toHaveURL(/#\/trace\/ha$/);
  await expect(page.locator(".trace__reading")).toHaveText(glyph("ha").pujl);
  await button(page, "backButton").click();
  await expect(page).toHaveURL(/#\/chart$/);
  await expect(page.getByRole("dialog")).toHaveCount(0);
});

test("[P-C09] Tulis is offered for base letters only", async ({ page }) => {
  await gotoRoute(page, "#/chart");
  await page.locator('#tab-chart [data-entry="ha"]').click();
  await expect(page.getByRole("button", { name: /Tulis ha$/ })).toBeVisible();
  await page.keyboard.press("Escape");
  await page
    .getByRole("tab", { name: id["chartTabSandhangan"]!, exact: true })
    .click();
  await page.locator('#tab-chart [data-entry="wulu"]').click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("button", { name: /^Latihan/ })).toHaveCount(0);
});

for (const glyphId of ["wulu", "nope"]) {
  test(`[P-C09] #/trace/${glyphId} redirects to the chart`, async ({
    page,
  }) => {
    await gotoRoute(page, `#/trace/${glyphId}`);
    await expect(page).toHaveURL(/#\/chart$/);
  });
}

/** The phones the bar used to cover the result on: the user's, and a taller one. */
for (const viewport of [
  { width: 392, height: 755 },
  { width: 390, height: 844 },
]) {
  test.describe(`at ${viewport.width}x${viewport.height}`, () => {
    test.use({ viewport });

    /**
     * The result line is on screen and clear of the sticky action bar, with the
     * page at its top: a user who has not scrolled must see it.
     */
    async function expectResultInView(page: Page, text: string): Promise<void> {
      await page.evaluate(() => window.scrollTo(0, 0));
      await expect(status(page)).toHaveText(text);
      const result = (await status(page).boundingBox())!;
      const bar = (await page.locator(".trace .bar").boundingBox())!;
      expect(result.height, "the result has a box").toBeGreaterThan(0);
      expect(result.y, "below the top of the screen").toBeGreaterThanOrEqual(0);
      expect(
        result.y + result.height,
        "above the action bar",
      ).toBeLessThanOrEqual(bar.y);
    }

    test("[P-B20] the result of an empty, a failed and a passed attempt is in view above the bar", async ({
      page,
    }) => {
      await openTrace(page);
      await button(page, "traceCheck").click();
      await expectResultInView(page, id["traceEmpty"]!);

      await draw(page, "mouse", await scribble(page));
      await button(page, "traceCheck").click();
      await expectResultInView(page, id["traceFail"]!);

      await button(page, "traceClear").click();
      await traceGlyph(page, "mouse");
      await button(page, "traceCheck").click();
      await expectResultInView(page, id["tracePass"]!);
    });
  });
}
