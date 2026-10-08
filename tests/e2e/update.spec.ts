import { chromium, devices, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gotoRoute } from "./support/app.ts";
import { expect, test, trackForeignRequests } from "./support/fixtures.ts";
import { id, walkMeet } from "./support/lesson.ts";
import { createSolver, type Solver } from "./support/solver.ts";
import {
  startStaticServer,
  type StaticServer,
} from "./support/static-server.ts";

const PORT = 4174;
const V1 = ".cache/dist-v1";
const V2 = ".cache/dist-v2";

// One worker owns the server and the two builds.
test.describe.configure({ mode: "serial" });
test.use({ baseURL: `http://127.0.0.1:${PORT}/` });

let solver: Solver;
let server: StaticServer;

function build(outDir: string, buildId: string): void {
  execFileSync(
    "npx",
    [
      "vite",
      "build",
      "--outDir",
      outDir,
      "--emptyOutDir",
      "--logLevel",
      "error",
    ],
    { env: { ...process.env, CARAKAN_BUILD_ID: buildId }, stdio: "inherit" },
  );
}

test.beforeAll(async () => {
  solver = await createSolver();
  build(V1, "e2e-v1");
  build(V2, "e2e-v2");
  server = await startStaticServer(V1, PORT);
});

test.afterAll(async () => {
  await server.close();
});

test.beforeEach(() => {
  server.setRoot(V1);
});

const banner = (page: Page) => page.getByText(id["updateAvailable"]!);
const buildOf = (page: Page) =>
  page.locator("meta[name=carakan-build]").getAttribute("content");

async function installAndControl(page: Page): Promise<void> {
  await gotoRoute(page, "");
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  await expect
    .poll(() =>
      page.evaluate(() => navigator.serviceWorker.controller !== null),
    )
    .toBe(true);
  expect(await buildOf(page)).toBe("e2e-v1");
}

/** Publishes v2 and asks the browser to look for it. */
async function publishV2(page: Page): Promise<void> {
  server.setRoot(V2);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.update();
  });
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const registration = await navigator.serviceWorker.ready;
        return registration.waiting !== null;
      }),
    )
    .toBe(true);
}

test("an update never interrupts a lesson, is offered on the ladder, can wait, and reloads on accept", async ({
  page,
}) => {
  await installAndControl(page);

  // (a) a waiting worker, mid-lesson: no banner, the question stays.
  await gotoRoute(page, `#/lesson/${solver.content.units[0]!.id}`);
  await walkMeet(page, solver.content.units[0]!.glyphs.length);
  await page.locator(".options button").first().waitFor();
  await publishV2(page);
  await expect(banner(page)).toHaveCount(0);
  await expect(page.locator(".options button").first()).toBeVisible();

  // (b) back on the ladder the banner shows; Later hides it.
  await page.evaluate(() => {
    location.hash = "#/";
  });
  await expect(page.locator(".ladder")).toBeVisible();
  await expect(banner(page)).toBeVisible();
  await expect(
    page.getByRole("status").filter({ has: banner(page) }),
  ).toBeVisible();
  await page.getByRole("button", { name: id["updateLaterButton"]! }).click();
  await expect(banner(page)).toHaveCount(0);

  // (c) the next page lifetime asks again; accepting loads v2.
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  expect(await buildOf(page)).toBe("e2e-v1");
  await expect(banner(page)).toBeVisible();
  await Promise.all([
    page.waitForEvent("load"),
    page.getByRole("button", { name: id["updateReloadButton"]! }).click(),
  ]);
  await page.locator('#app[data-boot="ready"]').waitFor();
  expect(await buildOf(page)).toBe("e2e-v2");
  await expect(banner(page)).toHaveCount(0);
});

test("a waiting update activates on the next launch with no prompt", async ({
  baseURL,
}) => {
  const dir = mkdtempSync(join(tmpdir(), "carakan-update-"));
  const options = {
    ...devices["Pixel 7"],
    viewport: { width: 360, height: 740 },
    locale: "id-ID",
    baseURL: baseURL!,
  };
  try {
    const context = await chromium.launchPersistentContext(dir, options);
    const first = context.pages()[0] ?? (await context.newPage());
    const foreign = trackForeignRequests(first, new URL(baseURL!).origin);
    await installAndControl(first);
    await publishV2(first);
    await expect(first.locator(".ladder")).toBeVisible();

    // Close every page of the context, then open a fresh one.
    await first.close();
    const next = await context.newPage();
    foreign.push(...trackForeignRequests(next, new URL(baseURL!).origin));
    await gotoRoute(next, "");
    await expect.poll(() => buildOf(next)).toBe("e2e-v2");
    await expect(banner(next)).toHaveCount(0);
    await context.close();
    expect(foreign, "requests outside the app origin").toEqual([]);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("accepting in one window does not reload another window that is mid-lesson", async ({
  page: ladder,
  context,
}) => {
  await installAndControl(ladder);

  const lesson = await context.newPage();
  await gotoRoute(lesson, `#/lesson/${solver.content.units[0]!.id}`);
  await walkMeet(lesson, solver.content.units[0]!.glyphs.length);
  await lesson.locator(".options button").first().waitFor();
  const prompt = await lesson.locator(".lesson").innerHTML();
  await lesson.evaluate(() => {
    const w = window as unknown as Record<string, unknown>;
    w["__lifetime"] = true;
    w["__controllerChanges"] = 0;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      (w["__controllerChanges"] as number)++;
    });
  });

  await publishV2(ladder);
  await expect(banner(ladder)).toBeVisible();
  await Promise.all([
    ladder.waitForEvent("load"),
    ladder.getByRole("button", { name: id["updateReloadButton"]! }).click(),
  ]);
  await ladder.locator('#app[data-boot="ready"]').waitFor();
  expect(await buildOf(ladder)).toBe("e2e-v2");

  // The other window sees the worker change, yet keeps its page and question.
  await expect
    .poll(() =>
      lesson.evaluate(
        () =>
          (window as unknown as Record<string, number>)["__controllerChanges"],
      ),
    )
    .toBe(1);
  expect(
    await lesson.evaluate(
      () => (window as unknown as Record<string, unknown>)["__lifetime"],
    ),
  ).toBe(true);
  expect(await buildOf(lesson)).toBe("e2e-v1");
  expect(await lesson.locator(".lesson").innerHTML()).toBe(prompt);
  await expect(banner(lesson)).toHaveCount(0);

  // Once it is off the lesson, its own accept loads the new build.
  await lesson.evaluate(() => {
    location.hash = "#/";
  });
  await expect(banner(lesson)).toBeVisible();
  await Promise.all([
    lesson.waitForEvent("load"),
    lesson.getByRole("button", { name: id["updateReloadButton"]! }).click(),
  ]);
  await lesson.locator('#app[data-boot="ready"]').waitFor();
  expect(await buildOf(lesson)).toBe("e2e-v2");
});
