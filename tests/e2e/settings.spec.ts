import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  MISTAKE_LOGS,
  SRS_ITEMS,
  UNIT_COMPLETIONS,
} from "../../src/core/db/schema.ts";
import { aksaraEngineRulesetId } from "../../src/engine/index.ts";
import { buildFeedbackReport } from "../../src/features/settings/feedback-report.ts";
import {
  expectAccessible,
  expectNoHorizontalOverflow,
  expectTouchTargets,
} from "./support/a11y.ts";
import { gotoRoute, seedLocale } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";
import { ladderRow, readStore, writeRows } from "./support/lesson.ts";
import { createSolver, type Solver } from "./support/solver.ts";

const messages = (locale: "id" | "en") =>
  JSON.parse(readFileSync(`src/l10n/${locale}.json`, "utf8")) as Record<
    string,
    string
  >;
const id = messages("id");
const en = messages("en");
const { version } = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
};

test.use({ permissions: ["clipboard-read", "clipboard-write"] });

const shoot = (page: Page, name: string) =>
  page.screenshot({ path: `test-results/settings-${name}.png` });

const radio = (page: Page, name: string) => page.getByRole("radio", { name });
const reportDialog = (page: Page, catalog = id) =>
  page.getByRole("dialog", { name: catalog["reportButton"]! });

test("[P-T01] offers System, Indonesian and English with System checked", async ({
  page,
}) => {
  await gotoRoute(page, "#/settings");
  await expect(
    page.getByRole("group", { name: id["languageHeading"]! }),
  ).toBeVisible();
  await expect(radio(page, id["languageSystem"]!)).toBeChecked();
  await expect(radio(page, id["languageIndonesian"]!)).not.toBeChecked();
  await expect(radio(page, id["languageEnglish"]!)).not.toBeChecked();
});

test("[P-T02] choosing English re-localizes at once and survives reload", async ({
  page,
}) => {
  await gotoRoute(page, "#/");
  await page.getByRole("link", { name: id["settingsTitle"]! }).click();
  await radio(page, id["languageEnglish"]!).check();
  await expect(
    page.getByRole("heading", { name: en["settingsTitle"]!, level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: en["aboutSectionHeading"]! }),
  ).toBeVisible();
  await page.getByRole("button", { name: en["backButton"]! }).click();
  await expect(
    page.getByRole("link", { name: en["navChart"]! }).first(),
  ).toBeVisible();
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  await expect(
    page.getByRole("link", { name: en["navChart"]! }).first(),
  ).toBeVisible();
});

test("[P-T02] a choice that cannot be stored is not applied", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await gotoRoute(page, "#/settings");
  await radio(page, id["languageEnglish"]!).click();
  await expect(radio(page, id["languageSystem"]!)).toBeChecked();
  await expect(radio(page, id["languageEnglish"]!)).not.toBeChecked();
  await expect(
    page.getByRole("heading", { name: id["settingsTitle"]!, level: 1 }),
  ).toBeVisible();
});

test("[P-T03] an unknown stored value behaves as System", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("carakan.uiLocale", "xx"),
  );
  await gotoRoute(page, "#/settings");
  await expect(radio(page, id["languageSystem"]!)).toBeChecked();
  await expect(
    page.getByRole("heading", { name: id["settingsTitle"]!, level: 1 }),
  ).toBeVisible();
});

test("[P-T05] about shows version, ruleset, sources, fonts and corpus", async ({
  page,
}) => {
  await gotoRoute(page, "#/settings");
  const main = page.getByRole("main");
  for (const key of [
    "aboutSectionHeading",
    "rulesetHeading",
    "ruleSourceHeading",
    "fontHeading",
    "corpusHeading",
  ]) {
    await expect(
      main.getByRole("heading", { name: id[key]!, exact: true }),
    ).toBeVisible();
  }
  await expect(main).toContainText(id["appTitle"]!);
  await expect(main).toContainText(id["appSubtitle"]!);
  await expect(main).toContainText(
    id["versionLabel"]!.replace("{version}", version),
  );
  await expect(main).toContainText(aksaraEngineRulesetId);
  await expect(main).toContainText("kaj1-2021-simplified-v3");
  await expect(main).toContainText(id["ruleSourceBody"]!);
  await expect(main).toContainText(id["fontBody"]!);
  await expect(main).toContainText(id["corpusBody"]!);
});

test("[W09] the licence and corpus links resolve on the server", async ({
  page,
}) => {
  await gotoRoute(page, "#/settings");
  const names = [
    "NOTICE-fonts.txt",
    "ofl-mplus.txt",
    "lucide-LICENSE.txt",
    "words.json",
  ];
  for (const name of names) {
    const link = page.getByRole("link", { name, exact: true });
    await expect(link).toBeVisible();
    const href = await link.evaluate((a) => (a as HTMLAnchorElement).href);
    const response = await page.request.get(href);
    expect(response.status(), href).toBe(200);
  }
});

test("[W09] every file path the corpus copy names is served", async ({
  page,
}) => {
  for (const catalog of [id, en]) {
    const paths = catalog["corpusBody"]!.match(/[\w-]+(?:\/[\w.-]+)+/g) ?? [];
    expect(paths.length).toBeGreaterThan(0);
    for (const path of paths) {
      const response = await page.request.get(`/${path}`);
      expect(response.status(), path).toBe(200);
      expect(response.headers()["content-type"], path).not.toContain(
        "text/html",
      );
    }
  }
});

test("[P-T06] the report keeps its text, copies the Indonesian report and confirms", async ({
  page,
}) => {
  await gotoRoute(page, "#/settings");
  await page.getByRole("button", { name: id["reportButton"]! }).click();
  const dialog = reportDialog(page);
  await expect(dialog).toBeVisible();
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "report-dialog");
  await dialog.getByRole("textbox").fill("saté salah");
  await dialog.getByRole("button", { name: id["cancelButton"]! }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("button", { name: id["reportButton"]! }).click();
  await expect(dialog.getByRole("textbox")).toHaveValue("saté salah");
  await dialog.getByRole("button", { name: id["copyReportButton"]! }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status")).toHaveText(id["reportCopied"]!);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(
    buildFeedbackReport({
      description: "saté salah",
      appVersion: version,
      rulesetId: aksaraEngineRulesetId,
    }),
  );
});

test("[P-T06] a failed copy keeps the dialog open with a visible error, and copying again works", async ({
  page,
}) => {
  await gotoRoute(page, "#/settings");
  await page.getByRole("button", { name: id["reportButton"]! }).click();
  const dialog = reportDialog(page);
  await dialog.getByRole("textbox").fill("saté salah");
  await page.evaluate(() => {
    navigator.clipboard.writeText = () => Promise.reject(new Error("denied"));
  });
  await dialog.getByRole("button", { name: id["copyReportButton"]! }).click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toHaveText(id["reportCopyFailed"]!);
  await expect(page.getByText(id["reportCopied"]!)).toHaveCount(0);
  await expect(dialog.getByRole("textbox")).toHaveValue("saté salah");

  await page.evaluate(() => {
    delete (navigator.clipboard as { writeText?: unknown }).writeText;
  });
  await dialog.getByRole("button", { name: id["copyReportButton"]! }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status")).toHaveText(id["reportCopied"]!);
});

test.describe("English browser", () => {
  test.use({ locale: "en-US" });

  test("[P-L03] the copied report is still Indonesian", async ({ page }) => {
    await gotoRoute(page, "#/settings");
    await page.getByRole("button", { name: en["reportButton"]! }).click();
    await reportDialog(page, en).getByRole("textbox").fill("wrong");
    await reportDialog(page, en)
      .getByRole("button", { name: en["copyReportButton"]! })
      .click();
    await expect(page.getByRole("status")).toHaveText(en["reportCopied"]!);
    const copied = await page.evaluate(() => navigator.clipboard.readText());
    expect(copied).toContain("Laporan kesalahan");
    expect(copied).toContain("Deskripsi kesalahan:\nwrong");
  });
});

test("[P-L04] English settings and report dialog are accessible", async ({
  page,
}) => {
  await seedLocale(page, "en");
  await gotoRoute(page, "#/settings");
  await expect(
    page.getByRole("heading", { name: en["aboutSectionHeading"]! }),
  ).toBeVisible();
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "en");
  await page.getByRole("button", { name: en["reportButton"]! }).click();
  await expect(reportDialog(page, en)).toBeVisible();
  await expectAccessible(page);
  await expectTouchTargets(page);
});

test("settings page is accessible in Indonesian", async ({ page }) => {
  await gotoRoute(page, "#/settings");
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "id");
});

let solver: Solver;
test.beforeAll(async () => {
  solver = await createSolver();
});

const resetDialog = (page: Page, catalog = id) =>
  page.getByRole("dialog", { name: catalog["resetConfirmTitle"]! });

const freshCard = (itemId: string) => ({
  itemId,
  intervalDays: 0,
  ease: 2.5,
  repetitions: 0,
  dueAt: 0,
  lastReviewedAt: null,
});

async function seedProgress(page: Page): Promise<void> {
  await gotoRoute(page, "#/");
  const { units } = solver.content;
  await writeRows(page, UNIT_COMPLETIONS, [
    { unitId: units[0]!.id, completedAt: 1 },
    { unitId: units[1]!.id, completedAt: 2 },
    { unitId: "u1", completedAt: 3 },
  ]);
  await writeRows(page, SRS_ITEMS, [freshCard("pa"), freshCard("ha")]);
  await writeRows(page, MISTAKE_LOGS, [
    { confusionPair: "da-dha", count: 3, lastAt: 0 },
  ]);
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
}

async function storeCounts(page: Page) {
  return {
    completions: (await readStore(page, UNIT_COMPLETIONS)).length,
    cards: (await readStore(page, SRS_ITEMS)).length,
    mistakes: (await readStore(page, MISTAKE_LOGS)).length,
  };
}

const seededCounts = { completions: 3, cards: 2, mistakes: 1 };
const emptyCounts = { completions: 0, cards: 0, mistakes: 0 };

/** Puts a retry card, reveal state and an active drill in memory, then lands on Settings. */
async function buildSessionMemory(page: Page, catalog = id): Promise<void> {
  await page.getByRole("link", { name: catalog["navReview"]! }).first().click();
  await page
    .getByRole("button", { name: catalog["revealAnswerButton"]! })
    .first()
    .click();
  await page
    .getByRole("button", { name: catalog["gradeAgain"]!, exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("heading", { level: 2, name: catalog["drillHeading"]! }),
  ).toBeVisible();
  await page.getByRole("link", { name: catalog["navLadder"]! }).first().click();
  await page.getByRole("link", { name: catalog["settingsTitle"]! }).click();
}

const openSettings = async (page: Page, catalog = id) => {
  await page.getByRole("link", { name: catalog["settingsTitle"]! }).click();
  await expect(
    page.getByRole("heading", { name: catalog["resetHeading"]! }),
  ).toBeVisible();
};

const openReset = async (page: Page, catalog = id) => {
  await page.getByRole("button", { name: catalog["resetButton"]! }).click();
  await expect(resetDialog(page, catalog)).toBeVisible();
};

for (const locale of ["id", "en"] as const) {
  test(`[P-T07] Cancel, the close button and Escape erase nothing (${locale})`, async ({
    page,
  }) => {
    const catalog = locale === "id" ? id : en;
    await seedLocale(page, locale);
    await seedProgress(page);
    await openSettings(page, catalog);
    await expect(
      page.getByRole("button", { name: catalog["resetButton"]! }),
    ).toBeVisible();

    await openReset(page, catalog);
    const dialog = resetDialog(page, catalog);
    await expect(
      dialog.getByRole("button", { name: catalog["cancelButton"]! }),
    ).toBeFocused();
    await dialog
      .getByRole("button", { name: catalog["cancelButton"]! })
      .click();
    await expect(dialog).toBeHidden();
    expect(await storeCounts(page)).toEqual(seededCounts);

    await openReset(page, catalog);
    await dialog.getByRole("button", { name: catalog["closeButton"]! }).click();
    await expect(dialog).toBeHidden();
    expect(await storeCounts(page)).toEqual(seededCounts);

    await openReset(page, catalog);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    expect(await storeCounts(page)).toEqual(seededCounts);

    await page.getByRole("button", { name: catalog["backButton"]! }).click();
    await expect(ladderRow(page, 1)).toContainText(
      catalog["unitStatusCompleted"]!,
    );
  });
}

for (const locale of ["id", "en"] as const) {
  test(`[P-T07][P-L04] confirming erases everything; Belajar and Ulangi are fresh without a reload, and after one (${locale})`, async ({
    page,
  }) => {
    const catalog = locale === "id" ? id : en;
    await seedLocale(page, locale);
    await seedProgress(page);
    await buildSessionMemory(page, catalog);
    await page.evaluate(() => {
      (window as unknown as { __carakanErase: number }).__carakanErase = 1;
    });
    await openReset(page, catalog);
    await resetDialog(page, catalog)
      .getByRole("button", { name: catalog["resetConfirmButton"]! })
      .click();
    await expect(resetDialog(page, catalog)).toBeHidden();
    await expect(page.getByRole("status")).toHaveText(catalog["resetDone"]!);
    expect(await storeCounts(page)).toEqual(emptyCounts);
    expect(
      await page.evaluate(() => localStorage.getItem("carakan.uiLocale")),
    ).toBe(locale);

    const expectFresh = async () => {
      await expect(ladderRow(page, 1)).toContainText(
        catalog["unitStatusReady"]!,
      );
      for (let n = 2; n <= solver.content.units.length; n++) {
        await expect(ladderRow(page, n)).toContainText(
          catalog["unitStatusLocked"]!,
        );
      }
      await page
        .getByRole("link", { name: catalog["navReview"]! })
        .first()
        .click();
      await expect(page.getByText(catalog["reviewEmpty"]!)).toBeVisible();
      await expect(
        page.getByRole("heading", { level: 2, name: catalog["drillHeading"]! }),
      ).toHaveCount(0);
      await expect(page.locator("#tab-review .card")).toHaveCount(0);
    };

    await page.getByRole("button", { name: catalog["backButton"]! }).click();
    await expectFresh();
    expect(
      await page.evaluate(
        () => (window as unknown as { __carakanErase?: number }).__carakanErase,
      ),
    ).toBe(1);

    await page.reload();
    await page.locator('#app[data-boot="ready"]').waitFor();
    await page
      .getByRole("link", { name: catalog["navLadder"]! })
      .first()
      .click();
    await expectFresh();
    expect(await storeCounts(page)).toEqual(emptyCounts);
    await expect(page.locator("html")).toHaveAttribute("lang", locale);
  });
}

test("[P-T07] a failed erase keeps everything and the confirm button retries", async ({
  page,
}) => {
  await seedProgress(page);
  await openSettings(page);
  await openReset(page);
  const dialog = resetDialog(page);
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.clear;
    (window as unknown as { __clear: unknown }).__clear = original;
    IDBObjectStore.prototype.clear = function (this: IDBObjectStore) {
      if (this.name === "mistakeLogs") {
        throw new DOMException("injected", "UnknownError");
      }
      return original.call(this);
    };
  });
  const confirm = dialog.getByRole("button", {
    name: id["resetConfirmButton"]!,
  });
  await confirm.click();
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toHaveText(id["resetFailed"]!);
  await expect(page.getByRole("status")).toHaveCount(0);
  expect(await storeCounts(page)).toEqual(seededCounts);

  // A second failure must be announced again: the alert is a fresh node.
  await dialog.getByRole("alert").evaluate((el) => {
    el.setAttribute("data-first", "");
  });
  await confirm.click();
  await expect(dialog.getByRole("alert")).toHaveText(id["resetFailed"]!);
  await expect(dialog.getByRole("alert")).not.toHaveAttribute("data-first");
  expect(await storeCounts(page)).toEqual(seededCounts);

  await page.evaluate(() => {
    IDBObjectStore.prototype.clear = (
      window as unknown as { __clear: typeof IDBObjectStore.prototype.clear }
    ).__clear;
  });
  await confirm.click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("status")).toHaveText(id["resetDone"]!);
  expect(await storeCounts(page)).toEqual(emptyCounts);
});

test("[P-T07] the reset works by keyboard", async ({ page }) => {
  await seedProgress(page);
  await openSettings(page);
  const section = page.getByRole("button", { name: id["resetButton"]! });
  for (let i = 0; i < 60; i++) {
    if (await section.evaluate((el) => el === document.activeElement)) break;
    await page.keyboard.press("Tab");
  }
  await expect(section).toBeFocused();
  await page.keyboard.press("Enter");
  const dialog = resetDialog(page);
  await expect(
    dialog.getByRole("button", { name: id["cancelButton"]! }),
  ).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    dialog.getByRole("button", { name: id["resetConfirmButton"]! }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText(id["resetDone"]!);
  await expect(section).toBeFocused();
  expect(await storeCounts(page)).toEqual(emptyCounts);
});

test("[P-T06] the report dialog focuses its heading on open", async ({
  page,
}) => {
  await gotoRoute(page, "#/settings");
  await page.getByRole("button", { name: id["reportButton"]! }).click();
  await expect(
    page.getByRole("dialog").getByRole("heading", { level: 2 }),
  ).toBeFocused();
});

for (const locale of ["id", "en"] as const) {
  test(`[P-T07][P-L04] Settings and the open confirmation are accessible and fit (${locale})`, async ({
    page,
  }) => {
    const catalog = locale === "id" ? id : en;
    await seedLocale(page, locale);
    await gotoRoute(page, "#/settings");
    await page
      .getByRole("button", { name: catalog["resetButton"]! })
      .scrollIntoViewIfNeeded();
    await expectAccessible(page);
    await expectTouchTargets(page);
    await expectNoHorizontalOverflow(page);
    await shoot(page, `reset-${locale}`);
    await openReset(page, catalog);
    await expectAccessible(page);
    await expectTouchTargets(page);
    await expectNoHorizontalOverflow(page);
    await page.screenshot({
      path: `test-results/settings-reset-dialog-${locale}.png`,
    });
  });
}
