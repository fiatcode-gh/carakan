import { readFileSync } from "node:fs";
import { auditRoutes, href } from "../../src/app/router.ts";
import { gotoRoute, seedLocale } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";

const messages = (locale: "id" | "en") =>
  JSON.parse(readFileSync(`src/l10n/${locale}.json`, "utf8")) as Record<
    string,
    string
  >;
const id = messages("id");
const en = messages("en");

const tabs = (
  page: import("@playwright/test").Page,
  messages: Record<string, string> = id,
) =>
  page
    .getByRole("navigation", { name: messages["mainNavLabel"] })
    .getByRole("link");

test("[P-S01] four tabs in order, labelled, with icons and a selected state", async ({
  page,
}) => {
  await gotoRoute(page, "");
  const links = tabs(page);
  await expect(links).toHaveText([
    id["navLadder"]!,
    id["navChart"]!,
    id["navReview"]!,
    id["navConverter"]!,
  ]);
  for (const link of await links.all()) {
    await expect(link.locator('svg[aria-hidden="true"]')).toHaveCount(1);
  }
  await expect(links.nth(0)).toHaveAttribute("aria-current", "page");
  await links.nth(1).click();
  await expect(links.nth(1)).toHaveAttribute("aria-current", "page");
  await expect(links.nth(0)).not.toHaveAttribute("aria-current", "page");
});

test("[P-S02] first launch shows Belajar at #/", async ({ page }) => {
  await page.goto("/");
  await page.locator('#app[data-boot="ready"]').waitFor();
  expect(new URL(page.url()).hash).toBe("#/");
  await expect(
    page.getByRole("heading", { level: 1, name: id["navLadder"]! }),
  ).toBeVisible();
});

test("[P-S03] tab state survives switching and tab switches add no history entries", async ({
  page,
}) => {
  await gotoRoute(page, "#/chart");
  const before = await page.evaluate(() => history.length);
  await page.evaluate(() => {
    const node = document.querySelector("#tab-chart")!;
    node.setAttribute("data-marked", "yes");
    (window as unknown as { __chart: Element }).__chart = node;
  });
  await tabs(page).nth(3).click();
  await expect(page.locator("#tab-chart")).toBeHidden();
  await expect(
    page.getByRole("heading", { level: 1, name: id["converterTitle"]! }),
  ).toBeVisible();
  await tabs(page).nth(1).click();
  await expect(page.locator("#tab-chart")).toBeVisible();
  const state = await page.evaluate(() => ({
    marked: document.querySelector("#tab-chart")!.getAttribute("data-marked"),
    same:
      (window as unknown as { __chart: Element }).__chart ===
      document.querySelector("#tab-chart"),
    length: history.length,
  }));
  expect(state).toEqual({ marked: "yes", same: true, length: before });
});

test("[P-S04] converter info opens settings; back returns to the converter intact", async ({
  page,
}) => {
  await gotoRoute(page, "#/converter");
  await page.evaluate(() =>
    document
      .querySelector("#tab-converter")!
      .setAttribute("data-marked", "yes"),
  );
  await page.getByRole("link", { name: id["aboutTitle"]! }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(
    page.getByRole("heading", { level: 1, name: id["settingsTitle"]! }),
  ).toBeVisible();
  await expect(tabs(page)).toBeHidden();
  await page.getByRole("button", { name: id["backButton"]! }).click();
  await expect(page).toHaveURL(/#\/converter$/);
  await expect(page.locator("#tab-converter")).toHaveAttribute(
    "data-marked",
    "yes",
  );
});

test("[P-S04] the ladder reaches settings and the teacher page, and the review tab its help", async ({
  page,
}) => {
  await gotoRoute(page, "");
  await page.getByRole("link", { name: id["teacherTitle"]! }).click();
  await expect(page).toHaveURL(/#\/teacher$/);
  await page.getByRole("button", { name: id["backButton"]! }).click();
  await expect(page).toHaveURL(/#\/$/);
  await page.getByRole("link", { name: id["settingsTitle"]! }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await page.getByRole("button", { name: id["backButton"]! }).click();
  await tabs(page).nth(2).click();
  await page.getByRole("link", { name: id["reviewHelpTitle"]! }).click();
  await expect(page).toHaveURL(/#\/review-help$/);
});

for (const route of auditRoutes) {
  test(`[P-S05] ${href(route)} loads directly`, async ({ page }) => {
    await gotoRoute(page, href(route));
    expect(new URL(page.url()).hash).toBe(href(route));
    await expect(page.locator("h1:visible")).toHaveCount(1);
  });
}

test("[P-S05] an unknown hash lands on #/", async ({ page }) => {
  await gotoRoute(page, "#/does-not-exist");
  await expect.poll(() => new URL(page.url()).hash).toBe("#/");
  await expect(
    page.getByRole("heading", { level: 1, name: id["navLadder"]! }),
  ).toBeVisible();
});

test("[P-S05] back from a deep-linked pushed page goes to the ladder", async ({
  page,
}) => {
  await gotoRoute(page, "#/settings");
  await page.getByRole("button", { name: id["backButton"]! }).click();
  await expect(page).toHaveURL(/#\/$/);
});

test("[P-S06] a slow manifest shows the loading state until it arrives", async ({
  page,
}) => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => (release = resolve));
  await page.route("**/content/v1/manifest.json", async (route) => {
    await gate;
    await route.continue();
  });
  await page.goto("/", { waitUntil: "commit" });
  await expect(page.getByText(id["loadingLabel"]!)).toBeVisible();
  await expect(page.locator("#app")).toHaveAttribute("data-boot", "loading");
  release();
  await expect(page.locator("#app")).toHaveAttribute("data-boot", "ready");
});

test("[P-S06] a failing manifest shows the load error and retry recovers", async ({
  page,
}) => {
  await page.route("**/content/v1/manifest.json", (route) =>
    route.fulfill({ status: 500, body: "nope" }),
  );
  await page.goto("/");
  await expect(page.getByText(id["loadErrorTitle"]!)).toBeVisible();
  await expect(page.locator("#app")).toHaveAttribute("data-boot", "error");
  await page.unroute("**/content/v1/manifest.json");
  await page.getByRole("button", { name: id["retryButton"]! }).click();
  await expect(page.locator("#app")).toHaveAttribute("data-boot", "ready");
});

test("[P-S06] unavailable storage shows the storage error", async ({
  page,
}) => {
  await page.addInitScript(() => {
    indexedDB.open = () => {
      throw new Error("storage unavailable");
    };
  });
  await page.goto("/");
  await expect(page.getByText(id["storageErrorTitle"]!)).toBeVisible();
  await expect(
    page.getByRole("button", { name: id["retryButton"]! }),
  ).toBeVisible();
});

test("[P-S07] the UI font is MPLUS Rounded 1c and loads", async ({ page }) => {
  await gotoRoute(page, "");
  const family = await page.evaluate(
    () => getComputedStyle(document.body).fontFamily,
  );
  expect(family.replaceAll('"', "").startsWith("MPLUS Rounded 1c")).toBe(true);
  const loaded = await page.evaluate(async () => {
    await document.fonts.ready;
    return document.fonts.check('16px "MPLUS Rounded 1c"');
  });
  expect(loaded).toBe(true);
});

test("[P-S08] the document title is appTitle", async ({ page }) => {
  await gotoRoute(page, "");
  await expect(page).toHaveTitle(id["appTitle"]!);
});

test("[P-T03] a seeded English choice renders English on first render", async ({
  page,
}) => {
  await seedLocale(page, "en");
  await gotoRoute(page, "");
  await expect(tabs(page, en)).toHaveText([
    en["navLadder"]!,
    en["navChart"]!,
    en["navReview"]!,
    en["navConverter"]!,
  ]);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page).toHaveTitle(en["appTitle"]!);
});

test.describe("[P-T04] system language", () => {
  test.describe("en-US", () => {
    test.use({ locale: "en-US" });
    test("follows the browser into English", async ({ page }) => {
      await gotoRoute(page, "");
      await expect(tabs(page, en).first()).toHaveText(en["navLadder"]!);
      await expect(page.locator("html")).toHaveAttribute("lang", "en");
    });
  });

  test.describe("fr-FR", () => {
    test.use({ locale: "fr-FR" });
    test("falls back to Indonesian", async ({ page }) => {
      await gotoRoute(page, "");
      await expect(tabs(page).first()).toHaveText(id["navLadder"]!);
      await expect(page.locator("html")).toHaveAttribute("lang", "id");
    });
  });
});
