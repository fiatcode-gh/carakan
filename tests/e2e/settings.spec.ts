import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { aksaraEngineRulesetId } from "../../src/engine/index.ts";
import { buildFeedbackReport } from "../../src/features/settings/feedback-report.ts";
import { expectAccessible, expectTouchTargets } from "./support/a11y.ts";
import { gotoRoute, seedLocale } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";

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

/** axe reads colors mid-fade otherwise: wait for every entrance animation. */
const settle = (page: Page) =>
  page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );

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

test("[P-T06] the report keeps its text, copies the Indonesian report and confirms", async ({
  page,
}) => {
  await gotoRoute(page, "#/settings");
  await page.getByRole("button", { name: id["reportButton"]! }).click();
  const dialog = reportDialog(page);
  await expect(dialog).toBeVisible();
  await settle(page);
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
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "en");
  await page.getByRole("button", { name: en["reportButton"]! }).click();
  await expect(reportDialog(page, en)).toBeVisible();
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
});

test("settings page is accessible in Indonesian", async ({ page }) => {
  await gotoRoute(page, "#/settings");
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "id");
});
