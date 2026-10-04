import type { Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { javaneseChar, toAksara, toLatin } from "../../src/engine/index.ts";
import { localizeEngineMessage } from "../../src/features/converter/engine-messages.ts";
import {
  expectAccessible,
  expectNoHorizontalOverflow,
  expectTouchTargets,
} from "./support/a11y.ts";
import { gotoRoute } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";

const messages = (locale: "id" | "en") =>
  JSON.parse(readFileSync(`src/l10n/${locale}.json`, "utf8")) as Record<
    string,
    string
  >;
const id = messages("id");
const en = messages("en");

const fmt = (template: string, params: Record<string, string> = {}) =>
  template.replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? "");

/** The localized text the UI must show for a raw engine message. */
function shown(catalog: Record<string, string>, engineText: string): string {
  const { key, params } = localizeEngineMessage(engineText);
  return fmt(catalog[key]!, params);
}

const successOutput = (latin: string): string => {
  const result = toAksara(latin);
  if (result.kind !== "success") throw new Error(`not convertible: ${latin}`);
  return result.output;
};

/** axe reads colors mid-fade otherwise: wait for every entrance animation. */
const settle = (page: Page) =>
  page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );

const shoot = (page: Page, name: string) =>
  page.screenshot({ path: `test-results/ubah-${name}.png` });

const latinInput = (page: Page, catalog = id) =>
  page.getByLabel(catalog["inputHintLatin"]!);
const aksaraInput = (page: Page, catalog = id) =>
  page.getByLabel(catalog["inputHintAksara"]!);
const picker = (page: Page, catalog = id) =>
  page.getByRole("dialog", { name: catalog["glyphPickerTitle"]! });

async function openAksara(page: Page, catalog = id): Promise<void> {
  await gotoRoute(page, "#/converter");
  await page.getByRole("radio", { name: catalog["dirAksaraToLatin"]! }).check();
  await aksaraInput(page, catalog).waitFor();
}

async function pickGlyph(page: Page, label: string): Promise<void> {
  await page.getByRole("button", { name: id["glyphPickerTitle"]! }).click();
  const sheet = picker(page);
  await sheet.getByRole("button", { name: label, exact: true }).click();
  await expect(sheet).toBeHidden();
}

const outputOf = (page: Page): Locator =>
  page.getByRole("region", { name: id["outputLabel"]! });

test("[P-U01] the info button opens settings", async ({ page }) => {
  await gotoRoute(page, "#/converter");
  await page.getByRole("link", { name: id["aboutTitle"]! }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: id["settingsTitle"]! }),
  ).toBeVisible();
});

test("[P-U03] typing shows the engine output; clearing shows nothing", async ({
  page,
}) => {
  await gotoRoute(page, "#/converter");
  await latinInput(page).fill("hanacaraka");
  await expect(outputOf(page).locator(".aksara")).toHaveText(
    successOutput("hanacaraka"),
  );
  await latinInput(page).fill("");
  await expect(outputOf(page)).toHaveCount(0);
});

test("[P-U02] switching direction clears input and output", async ({
  page,
}) => {
  await gotoRoute(page, "#/converter");
  await latinInput(page).fill("hanacaraka");
  await expect(outputOf(page)).toBeVisible();
  await page.getByRole("radio", { name: id["dirAksaraToLatin"]! }).check();
  await expect(aksaraInput(page)).toHaveValue("");
  await expect(outputOf(page)).toHaveCount(0);
  await page.getByRole("radio", { name: id["dirLatinToAksara"]! }).check();
  await expect(latinInput(page)).toHaveValue("");
  await expect(outputOf(page)).toHaveCount(0);
});

test("[P-U04] an ambiguous word shows two chips; choosing one shows it", async ({
  page,
}) => {
  await gotoRoute(page, "#/converter");
  await latinInput(page).fill("prelu");
  const result = toAksara("prelu");
  if (result.kind !== "ambiguous") throw new Error("prelu must be ambiguous");
  const card = page.getByRole("region", { name: id["ambiguousTitle"]! });
  const chips = card.getByRole("button");
  await expect(chips).toHaveCount(2);
  await expect(card.getByRole("button", { pressed: true })).toHaveCount(0);
  await settle(page);
  await shoot(page, "ambiguous");
  await chips.nth(1).click();
  await expect(outputOf(page).locator(".aksara")).toHaveText(
    result.candidates[1]!.output,
  );
  await expect(card).toHaveCount(0);
});

test("[P-U05] [P-U09] an unknown character shows the localized message, never the engine text, and marks it", async ({
  page,
}) => {
  await gotoRoute(page, "#/converter");
  await latinInput(page).fill("qa");
  const alert = page.getByRole("alert");
  await expect(alert).toContainText(id["errorTitle"]!);
  await expect(alert).toContainText(shown(id, 'Unknown character "q"'));
  await expect(alert).not.toContainText("Unknown character");
  await expect(alert.locator("mark")).toHaveText("q");
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "error-id");
});

test.describe("English UI", () => {
  test.use({ locale: "en-US" });

  test("[P-L04] [P-U09] the same input shows the English message", async ({
    page,
  }) => {
    await gotoRoute(page, "#/converter");
    await latinInput(page, en).fill("qa");
    const alert = page.getByRole("alert");
    await expect(alert).toContainText(en["errorTitle"]!);
    await expect(alert).toContainText(shown(en, 'Unknown character "q"'));
    await expect(alert.locator("mark")).toHaveText("q");
    await settle(page);
    await expectAccessible(page);
    await shoot(page, "error-en");
  });

  test("[P-L04] [P-U09] an ambiguity reason is shown in English as the chip card title", async ({
    page,
  }) => {
    await gotoRoute(page, "#/converter");
    await latinInput(page, en).fill("prelu");
    await expect(
      page.getByRole("region", { name: en["ambiguousTitle"]! }),
    ).toBeVisible();
  });
});

test("[P-U09] the Indonesian UI keeps every Latin error out of English", async ({
  page,
}) => {
  await gotoRoute(page, "#/converter");
  await latinInput(page).fill("stra");
  const result = toAksara("stra");
  if (result.kind !== "error") throw new Error("stra must be an error");
  await expect(page.getByRole("alert")).toContainText(
    shown(id, result.message),
  );
  await expect(page.getByRole("alert")).not.toContainText(result.message);
});

test("[P-U09] aksara panel: a lone vowel sign shows the localized message", async ({
  page,
}) => {
  await openAksara(page);
  await aksaraInput(page).fill(javaneseChar("JAVANESE VOWEL SIGN WULU"));
  const alert = page.getByRole("alert");
  await expect(alert).toContainText(id["errorTitle"]!);
  await expect(alert).toContainText(id["engineErrorSandhanganWithoutBase"]!);
  await expect(alert).not.toContainText("Sandhangan without");
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "aksara-error");
});

test("[P-U06] [W01] copy writes the output, shows the tofu toast, keeps the output", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await gotoRoute(page, "#/converter");
  await latinInput(page).fill("hanacaraka");
  const output = successOutput("hanacaraka");
  await page.getByRole("button", { name: id["copyButton"]! }).click();
  await expect(page.getByRole("status")).toHaveText(id["copyWarning"]!);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    output,
  );
  await expect(outputOf(page).locator(".aksara")).toHaveText(output);
  await settle(page);
  await shoot(page, "copied");
});

test("[P-U06] aksara panel copy writes the Latin text", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await openAksara(page);
  await aksaraInput(page).fill(successOutput("hana"));
  await page.getByRole("button", { name: id["copyButton"]! }).click();
  await expect(page.getByRole("status")).toHaveText(id["copyWarning"]!);
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
    "hana",
  );
});

test("[P-U07] picker inserts ha then na; the scheme toggle changes the output", async ({
  page,
}) => {
  await openAksara(page);
  await pickGlyph(page, "ha");
  await pickGlyph(page, "na");
  await expect(aksaraInput(page)).toHaveValue(successOutput("hana"));
  await expect(outputOf(page)).toContainText("hana");
  await pickGlyph(page, "ta murda");
  const aksara = await aksaraInput(page).inputValue();
  const latin = (scheme: "pujl" | "jgst") => {
    const result = toLatin(aksara, { scheme });
    if (result.kind !== "success") throw new Error("not convertible");
    return result.output;
  };
  expect(latin("pujl")).not.toBe(latin("jgst"));
  await expect(outputOf(page).locator(".latin")).toHaveText(latin("pujl"));
  const group = page.getByRole("radiogroup", { name: id["schemeLabel"]! });
  await expect(group.getByRole("radio", { name: "PUJL" })).toBeChecked();
  await group.getByRole("radio", { name: "JGST" }).check();
  await expect(group.getByRole("radio", { name: "JGST" })).toBeChecked();
  await expect(outputOf(page).locator(".latin")).toHaveText(latin("jgst"));
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "aksara-output");
});

test("[P-U08] the picker inserts at the caret", async ({ page }) => {
  await openAksara(page);
  await pickGlyph(page, "ha");
  await pickGlyph(page, "na");
  await page.keyboard.press("ArrowLeft");
  await pickGlyph(page, "ca");
  await expect(aksaraInput(page)).toHaveValue(successOutput("hacana"));
  // The caret lands after the inserted glyph, so the next one follows it.
  await pickGlyph(page, "ra");
  await expect(aksaraInput(page)).toHaveValue(successOutput("hacarana"));
});

test("[P-U08] [W11] [W12] [W13] the picker is a modal sheet with stacked section headings and display names", async ({
  page,
}) => {
  await openAksara(page);
  await page.getByRole("button", { name: id["glyphPickerTitle"]! }).click();
  const sheet = picker(page);
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("tablist")).toHaveCount(0);
  const headings = sheet.getByRole("heading", { level: 3 });
  await expect(headings).toHaveText([
    id["sectionCarakan"]!,
    id["sectionSwara"]!,
    id["sectionMurda"]!,
    id["sectionAngka"]!,
    id["sectionPada"]!,
  ]);
  await expect(
    sheet.getByRole("button", { name: "ha", exact: true }),
  ).toBeVisible();
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "picker");
  for (const name of [
    id["sectionSwara"]!,
    id["sectionMurda"]!,
    id["sectionAngka"]!,
    id["sectionPada"]!,
  ]) {
    const heading = sheet.getByRole("heading", { level: 3, name, exact: true });
    await heading.scrollIntoViewIfNeeded();
    await expect(heading).toBeVisible();
  }
  const pada = sheet.getByRole("button", {
    name: "pada adeg-adeg",
    exact: true,
  });
  await pada.scrollIntoViewIfNeeded();
  await expect(pada).toBeVisible();
  await shoot(page, "picker-pada");
  await sheet.getByRole("button", { name: id["closeButton"]! }).click();
  await expect(sheet).toBeHidden();
});

test("[P-U08] a Pada entry inserts into the aksara input", async ({ page }) => {
  await openAksara(page);
  await page.getByRole("button", { name: id["glyphPickerTitle"]! }).click();
  const sheet = picker(page);
  await sheet
    .getByRole("button", { name: "pada adeg-adeg", exact: true })
    .click();
  await expect(sheet).toBeHidden();
  await expect(aksaraInput(page)).not.toHaveValue("");
});

test("[P-S03] the input and output survive switching to Bagan and back", async ({
  page,
}) => {
  await gotoRoute(page, "#/converter");
  await latinInput(page).fill("hanacaraka");
  const nav = page.getByRole("navigation", { name: id["mainNavLabel"]! });
  await nav.getByRole("link", { name: id["navChart"]! }).click();
  await expect(
    page.getByRole("heading", { level: 1, name: id["chartTitle"]! }),
  ).toBeVisible();
  await nav.getByRole("link", { name: id["navConverter"]! }).click();
  await expect(latinInput(page)).toHaveValue("hanacaraka");
  await expect(outputOf(page).locator(".aksara")).toHaveText(
    successOutput("hanacaraka"),
  );
});

test.describe("English UI picker", () => {
  test.use({ locale: "en-US" });

  test("[P-L04] long forms use the English name pattern", async ({ page }) => {
    await openAksara(page, en);
    await page.getByRole("button", { name: en["glyphPickerTitle"]! }).click();
    const sheet = picker(page, en);
    await expect(
      sheet.getByRole("button", { name: "long a", exact: true }),
    ).toBeVisible();
  });
});

test("[P-U03] the Latin panel at 360 px has no horizontal overflow", async ({
  page,
}) => {
  await gotoRoute(page, "#/converter");
  await latinInput(page).fill("hanacaraka");
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "latin");
});
