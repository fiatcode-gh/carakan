import type { Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { loadContent } from "../../src/content/content-repository.ts";
import { GlyphInfoTable } from "../../src/content/glyph-info-table.ts";
import { SRS_ITEMS, UNIT_COMPLETIONS } from "../../src/core/db/schema.ts";
import { RULESET_STORAGE_KEY } from "../../src/core/ruleset/ruleset-controller.ts";
import {
  kajRulesetId,
  pedomanRulesetId,
  rulesetById,
  toAksara,
} from "../../src/engine/index.ts";
import {
  buildFeedbackReport,
  FEEDBACK_RULE_SOURCES,
} from "../../src/features/settings/feedback-report.ts";
import { loadFromPublic } from "../support/content-files.ts";
import { expectAccessible } from "./support/a11y.ts";
import { gotoRoute } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";
import { readStore, writeRows } from "./support/lesson.ts";

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

const kajContent = await loadContent(loadFromPublic, kajRulesetId);
const kajGlyphs = GlyphInfoTable.build(kajContent);
const kajUnitIds = kajContent.units.map((u) => u.id);
const eighthUnitIds = kajUnitIds.slice(0, 8);

test.use({ ruleset: null, permissions: ["clipboard-read", "clipboard-write"] });

const radio = (page: Page, name: string) => page.getByRole("radio", { name });
const storedRuleset = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), RULESET_STORAGE_KEY);
const outputOf = (page: Page): Locator =>
  page.getByRole("region", { name: id["outputLabel"]! });

async function openSettings(page: Page): Promise<void> {
  await tab(page, "navLadder").click();
  await page.getByRole("link", { name: id["settingsTitle"]! }).first().click();
  await expect(
    page.getByRole("heading", { name: id["settingsTitle"]!, level: 1 }),
  ).toBeVisible();
}

const goBack = (page: Page) =>
  page.getByRole("button", { name: id["backButton"]! }).click();

const tab = (page: Page, key: string) =>
  page.getByRole("link", { name: id[key]! }).first();

/** Tiles of one chart section, by the section's heading. */
const sectionTiles = (page: Page, title: string): Locator =>
  page
    .locator("#tab-chart section.section")
    .filter({ has: page.getByRole("heading", { level: 2, name: title }) })
    .locator("[data-entry]");

async function ambiguousChips(page: Page): Promise<string[]> {
  const card = page.getByRole("region", {
    name: id["ambiguousTitleVowelPair"]!,
  });
  await expect(card).toBeVisible();
  return (
    await card.getByRole("button").locator(".aksara").allTextContents()
  ).map((s) => s.trim());
}

const candidatesOf = (rulesetId: typeof pedomanRulesetId): string[] => {
  const result = toAksara("sinau", { ruleset: rulesetId });
  if (result.kind !== "ambiguous") throw new Error("sinau must be ambiguous");
  return result.candidates.map((c) => c.output);
};

test("[P-T08] a fresh install opens on Pedoman 2002", async ({ page }) => {
  await gotoRoute(page, "#/settings");
  await expect(radio(page, id["rulesetNamePedoman"]!)).toBeChecked();
  await expect(radio(page, id["rulesetNameKaj"]!)).not.toBeChecked();
  const main = page.getByRole("main");
  await expect(main).toContainText(pedomanRulesetId);
  await expect(main).toContainText(id["ruleSourceBodyPedoman"]!);
  expect(await storedRuleset(page)).toBeNull();
  await expectAccessible(page);

  await goBack(page);
  await tab(page, "navConverter").click();
  await page.getByLabel(id["inputHintLatin"]!).fill("sinau");
  expect(await ambiguousChips(page)).toEqual(candidatesOf(pedomanRulesetId));
});

test("[P-T08] [P-U11] [P-C08] [P-B18] switching applies at once and survives a reload", async ({
  page,
}) => {
  await gotoRoute(page, "#/");
  await writeRows(
    page,
    UNIT_COMPLETIONS,
    eighthUnitIds.map((unitId, i) => ({ unitId, completedAt: i + 1 })),
  );
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();

  await openSettings(page);
  await radio(page, id["rulesetNameKaj"]!).check();
  expect(await storedRuleset(page)).toBe(kajRulesetId);
  await goBack(page);

  await tab(page, "navConverter").click();
  await page.getByLabel(id["inputHintLatin"]!).fill("sinau");
  const kaj = toAksara("sinau", { ruleset: kajRulesetId });
  if (kaj.kind !== "success") throw new Error("sinau is unambiguous in KAJ");
  await expect(outputOf(page).locator(".aksara")).toHaveText(kaj.output);

  await tab(page, "navChart").click();
  const kajMurda = rulesetById(kajRulesetId).murda.length;
  expect(kajMurda).toBe(11);
  await expect(sectionTiles(page, id["sectionMurda"]!)).toHaveCount(kajMurda);

  await tab(page, "navLadder").click();
  await page.locator(".ladder > li button.unit").nth(8).click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/lesson/u8");

  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  await page.goto("/#/settings");
  await expect(radio(page, id["rulesetNameKaj"]!)).toBeChecked();

  await radio(page, id["rulesetNamePedoman"]!).check();
  expect(await storedRuleset(page)).toBe(pedomanRulesetId);
  await goBack(page);

  await tab(page, "navChart").click();
  await expect(sectionTiles(page, id["sectionMurda"]!)).toHaveCount(7);
  const rekan = await sectionTiles(page, id["sectionRekan"]!).evaluateAll(
    (els) => els.map((el) => el.getAttribute("data-entry")),
  );
  expect(rekan).toEqual(["kha", "dza", "fa", "za", "gha"]);
  await expect(page.locator('#tab-chart [data-entry="long-a"]')).toHaveCount(0);

  await tab(page, "navLadder").click();
  await page.locator(".ladder > li button.unit").nth(8).click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/lesson/u8p");
});

test.describe("progress carries across rulesets", () => {
  test.use({ ruleset: kajRulesetId });

  const card = (itemId: string) => ({
    itemId,
    intervalDays: 0,
    ease: 2.5,
    repetitions: 0,
    dueAt: 0,
    lastReviewedAt: null,
  });

  test("[P-B18] [P-R16] the ladder and review follow the active ruleset's letters", async ({
    page,
  }) => {
    await gotoRoute(page, "#/");
    await writeRows(
      page,
      UNIT_COMPLETIONS,
      kajUnitIds.map((unitId, i) => ({ unitId, completedAt: i + 1 })),
    );
    await writeRows(page, SRS_ITEMS, [card("caMurda"), card("ka")]);
    await page.reload();
    await page.locator('#app[data-boot="ready"]').waitFor();

    const cards = page.locator("#tab-review .card .aksara");
    const caMurda = kajGlyphs.byId.get("caMurda")!.char;
    const ka = kajGlyphs.byId.get("ka")!.char;

    await tab(page, "navReview").click();
    await expect(cards).toHaveCount(2);
    await expect(cards.filter({ hasText: caMurda })).toHaveCount(1);

    await openSettings(page);
    await radio(page, id["rulesetNamePedoman"]!).check();
    await goBack(page);

    await tab(page, "navLadder").click();
    await expect(page.locator(".ladder > li button.unit").nth(8)).toContainText(
      id["unitStatusCompleted"]!,
    );
    await expect
      .poll(async () =>
        (await readStore<{ unitId: string }>(page, UNIT_COMPLETIONS)).map(
          (r) => r.unitId,
        ),
      )
      .toContain("u8p");

    await tab(page, "navReview").click();
    await expect(cards).toHaveCount(1);
    await expect(cards.filter({ hasText: ka })).toHaveCount(1);
    expect(await readStore(page, SRS_ITEMS)).toHaveLength(2);

    await openSettings(page);
    await radio(page, id["rulesetNameKaj"]!).check();
    await goBack(page);
    await tab(page, "navReview").click();
    await expect(cards).toHaveCount(2);
    await expect(cards.filter({ hasText: caMurda })).toHaveCount(1);
  });
});

test("[P-T08] a ruleset that cannot be stored is not applied", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
  });
  await gotoRoute(page, "#/settings");
  await radio(page, id["rulesetNameKaj"]!).click();
  await expect(radio(page, id["rulesetNamePedoman"]!)).toBeChecked();
  await expect(radio(page, id["rulesetNameKaj"]!)).not.toBeChecked();
  await goBack(page);
  await tab(page, "navConverter").click();
  await page.getByLabel(id["inputHintLatin"]!).fill("sinau");
  expect(await ambiguousChips(page)).toEqual(candidatesOf(pedomanRulesetId));
});

test("[P-T05] [P-T06] About and the report name the active ruleset", async ({
  page,
}) => {
  await gotoRoute(page, "#/settings");
  await page.getByRole("button", { name: id["reportButton"]! }).click();
  const dialog = page.getByRole("dialog", { name: id["reportButton"]! });
  await dialog.getByRole("textbox").fill("saté salah");
  await dialog.getByRole("button", { name: id["copyReportButton"]! }).click();
  await expect(page.getByRole("status")).toHaveText(id["reportCopied"]!);
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(
    buildFeedbackReport({
      description: "saté salah",
      appVersion: version,
      rulesetId: pedomanRulesetId,
      sources: FEEDBACK_RULE_SOURCES[pedomanRulesetId],
    }),
  );

  await gotoRoute(page, "#/teacher");
  await expect(page.locator("main .slip").nth(0)).toContainText(
    id["deviationBody"]!.replace("{ruleset}", id["rulesetNamePedoman"]!),
  );
});

test.describe("English browser", () => {
  test.use({ locale: "en-US" });

  test("[P-L04] the ruleset choice renders in English", async ({ page }) => {
    await gotoRoute(page, "#/settings");
    await expect(
      page.getByRole("group", { name: en["rulesetSettingHeading"]! }),
    ).toBeVisible();
    await expect(radio(page, en["rulesetNamePedoman"]!)).toBeChecked();
    await expect(radio(page, en["rulesetNameKaj"]!)).toBeVisible();
  });
});
