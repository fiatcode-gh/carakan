import { chromium, devices, type Page } from "@playwright/test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { auditRoutes, href } from "../../src/app/router.ts";
import {
  SRS_ITEMS,
  UNIT_COMPLETIONS,
  type SrsItemRow,
  type UnitCompletionRow,
} from "../../src/core/db/schema.ts";
import { gotoRoute } from "./support/app.ts";
import { expect, test, trackForeignRequests } from "./support/fixtures.ts";
import { completeLesson, id, ladderRow, readStore } from "./support/lesson.ts";
import { createSolver, type Solver } from "./support/solver.ts";

let solver: Solver;
test.beforeAll(async () => {
  solver = await createSolver();
});

/** Loads the app, waits for the worker to be active, then reloads under it. */
async function installAndControl(page: Page, hash = ""): Promise<void> {
  await gotoRoute(page, hash);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
}

test("[P-S09] the app is installable: no CDP installability errors, manifest ids resolve to the origin root", async ({
  page,
  baseURL,
}) => {
  await gotoRoute(page, "");
  const cdp = await page.context().newCDPSession(page);
  const { installabilityErrors } = await cdp.send(
    "Page.getInstallabilityErrors",
  );
  expect(installabilityErrors).toEqual([]);
  const manifest = await cdp.send("Page.getAppManifest");
  expect(manifest.errors).toEqual([]);
  const parsed = JSON.parse(manifest.data!) as Record<string, string>;
  const root = new URL("/", baseURL!).href;
  for (const key of ["start_url", "scope", "id"] as const) {
    expect(new URL(parsed[key]!, manifest.url).href, key).toBe(root);
  }
});

test("[P-S05][P-S09] cold start offline boots to the ladder; every route loads by deep link", async ({
  page,
  context,
}) => {
  await installAndControl(page);
  await context.setOffline(true);
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  await expect(page.locator(".ladder")).toBeVisible();

  for (const route of auditRoutes) {
    await page.goto(`/${href(route)}`);
    await page.reload();
    await page.locator('#app[data-boot="ready"]').waitFor();
    await expect(
      page.getByRole("heading", { level: 1 }).first(),
      href(route),
    ).toBeVisible();
  }
});

test("[P-S05] unit 1 can be completed offline", async ({ page, context }) => {
  await installAndControl(page);
  await context.setOffline(true);
  await page.reload();
  await completeLesson(page, solver, "u1");
  await page.locator(".lesson__foot").getByRole("button").click();
  await expect(ladderRow(page, 1)).toContainText(id["unitStatusCompleted"]!);
  await expect(ladderRow(page, 2)).toContainText(id["unitStatusReady"]!);
});

test("[P-S09] progress and a graded review card survive closing the browser, offline", async ({
  baseURL,
}) => {
  const dir = mkdtempSync(join(tmpdir(), "carakan-profile-"));
  const options = {
    ...devices["Pixel 7"],
    viewport: { width: 360, height: 740 },
    locale: "id-ID",
    baseURL: baseURL!,
  };
  const origin = new URL(baseURL!).origin;
  try {
    const first = await chromium.launchPersistentContext(dir, options);
    const firstPage = first.pages()[0] ?? (await first.newPage());
    const foreign = trackForeignRequests(firstPage, origin);
    await installAndControl(firstPage);
    await completeLesson(firstPage, solver, "u1");
    await gotoRoute(firstPage, "#/review");
    const card = firstPage.locator("#tab-review .card").first();
    await card.getByRole("button", { name: id["revealAnswerButton"]! }).click();
    await card
      .getByRole("button", { name: id["gradeGood"]!, exact: true })
      .click();
    await expect
      .poll(
        async () =>
          (await readStore<SrsItemRow>(firstPage, SRS_ITEMS)).filter(
            (r) => r.lastReviewedAt !== null,
          ).length,
      )
      .toBe(1);
    const graded = (await readStore<SrsItemRow>(firstPage, SRS_ITEMS)).filter(
      (r) => r.lastReviewedAt !== null,
    );
    await first.close();

    const second = await chromium.launchPersistentContext(dir, options);
    await second.setOffline(true);
    const secondPage = second.pages()[0] ?? (await second.newPage());
    foreign.push(...trackForeignRequests(secondPage, origin));
    await gotoRoute(secondPage, "");
    await expect(ladderRow(secondPage, 1)).toContainText(
      id["unitStatusCompleted"]!,
    );
    await expect(ladderRow(secondPage, 2)).toContainText(
      id["unitStatusReady"]!,
    );
    expect(
      await readStore<UnitCompletionRow>(secondPage, UNIT_COMPLETIONS),
    ).toHaveLength(1);
    const reloaded = (
      await readStore<SrsItemRow>(secondPage, SRS_ITEMS)
    ).filter((r) => r.lastReviewedAt !== null);
    expect(reloaded).toEqual(graded);
    await second.close();
    expect(foreign, "requests outside the app origin").toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("persistent storage is requested once on a fresh profile", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __persistCalls: number };
    w.__persistCalls = 0;
    const original = navigator.storage.persist.bind(navigator.storage);
    navigator.storage.persist = () => {
      w.__persistCalls += 1;
      return original();
    };
  });
  await gotoRoute(page, "");
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __persistCalls: number }).__persistCalls,
      ),
    )
    .toBe(1);
});
