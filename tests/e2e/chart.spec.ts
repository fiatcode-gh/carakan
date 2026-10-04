import type { Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { loadContent } from "../../src/content/content-repository.ts";
import { murdaFor, nglegenaById } from "../../src/engine/index.ts";
import {
  buildChartSections,
  pasanganString,
  type ChartSection,
  type ChartStrings,
} from "../../src/features/chart/chart-catalog.ts";
import { loadFromPublic } from "../support/content-files.ts";
import {
  expectAccessible,
  expectNoHorizontalOverflow,
  expectTouchTargets,
} from "./support/a11y.ts";
import { gotoRoute, seedLocale } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";

const messages = (locale: "id" | "en") =>
  JSON.parse(readFileSync(`src/l10n/${locale}.json`, "utf8")) as Record<
    string,
    string
  >;
const id = messages("id");
const en = messages("en");

const fmt = (template: string, params: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? "");

const stringsFor = (c: Record<string, string>): ChartStrings => ({
  carakan: c["sectionCarakan"]!,
  sandhanganVowel: c["sectionSandhanganVowel"]!,
  sandhanganClosing: c["sectionSandhanganClosing"]!,
  sandhanganConsonant: c["sectionSandhanganConsonant"]!,
  sandhanganKiller: c["sectionSandhanganKiller"]!,
  murda: c["sectionMurda"]!,
  swara: c["sectionSwara"]!,
  rekan: c["sectionRekan"]!,
  angka: c["sectionAngka"]!,
  pada: c["sectionPada"]!,
  murdaHint: c["murdaHint"]!,
  writtenAs: (form) => fmt(c["writtenAs"]!, { form }),
  longFormName: (name) => fmt(c["longFormName"]!, { name }),
});

const content = await loadContent(loadFromPublic);
const sectionsFor = (c: Record<string, string>): ChartSection[] =>
  buildChartSections({
    aksara: content.aksara,
    sandhangan: content.sandhangan,
    strings: stringsFor(c),
  });
const sections = sectionsFor(id);

/** axe reads colors mid-fade otherwise: wait for every entrance animation. */
const settle = (page: Page) =>
  page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );

const shoot = async (page: Page, name: string) => {
  await settle(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `test-results/bagan-${name}.png` });
};

const tile = (page: Page, entryId: string): Locator =>
  page.locator(`#tab-chart [data-entry="${entryId}"]`);
const sheet = (page: Page, name: string): Locator =>
  page.getByRole("dialog", { name, exact: true });

const entryOf = (entryId: string) => {
  for (const s of sections) {
    const found = s.entries.find((e) => e.id === entryId);
    if (found !== undefined) return found;
  }
  throw new Error(`no chart entry ${entryId}`);
};

const withExamples = [...content.chartExamples.keys()].find(
  (k) => (content.chartExamples.get(k) ?? []).length > 0,
)!;
const withoutExamples = sections
  .flatMap((s) => s.entries)
  .find((e) => !content.chartExamples.has(e.id))!;

test.beforeEach(async ({ page }) => {
  await gotoRoute(page, "#/chart");
});

test("[P-C01] section headings follow the catalog order, with its entry counts", async ({
  page,
}) => {
  const headings = page.locator("#tab-chart main h2");
  await expect(headings).toHaveText(sections.map((s) => s.title));
  const mapped = page.locator("#tab-chart section.section");
  for (const [i, s] of sections.entries()) {
    await expect(mapped.nth(i).locator("[data-entry]")).toHaveCount(
      s.entries.length,
    );
  }
  expect(sections[0]!.entries).toHaveLength(20);
});

test("[P-C02] every tile is a button named for its entry and shows its glyph", async ({
  page,
}) => {
  const all = sections.flatMap((s) => s.entries);
  const tiles = page.locator("#tab-chart [data-entry]");
  await expect(tiles).toHaveCount(all.length);
  const seen = await tiles.evaluateAll((els) =>
    els.map((el) => ({
      tag: el.tagName,
      id: el.getAttribute("data-entry"),
      title: el.getAttribute("title"),
      glyph: el.querySelector(".aksara")?.textContent,
    })),
  );
  expect(seen).toEqual(
    all.map((e) => ({
      tag: "BUTTON",
      id: e.id,
      title: e.name,
      glyph: e.char,
    })),
  );
  await expect(
    page.getByRole("button", { name: entryOf("na").name, exact: true }).first(),
  ).toBeVisible();
});

test("[P-C03] the sheet shows the glyph's name, glyph and subtitle variants", async ({
  page,
}) => {
  const cases = [
    "ka", // carakan with a murda hint
    "angka-3", // written-as form
    "adeg", // pada without a Latin mapping
    "long-a", // long swara form
  ];
  for (const entryId of cases) {
    const entry = entryOf(entryId);
    await tile(page, entryId).click();
    const dialog = sheet(page, entry.name);
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(entry.subtitle, { exact: true }),
    ).toBeVisible();
    await expect(dialog.locator(".frame .aksara")).toHaveText(entry.char);
    await dialog.getByRole("button", { name: id["closeButton"]! }).click();
    await expect(dialog).toBeHidden();
  }
  expect(entryOf("ka").subtitle).toContain(id["murdaHint"]!);
  expect(entryOf("adeg").subtitle).toBe("—");
});

test("[P-C04] a nglegena detail lists sound, pasangan and murda", async ({
  page,
}) => {
  const na = entryOf("na");
  await tile(page, "na").click();
  const dialog = sheet(page, na.name);
  const rows = dialog.locator("dl.rows");
  const base = nglegenaById("na")!;
  await expect(rows.locator("dt")).toHaveText([
    id["soundLabel"]!,
    id["pasanganLabel"]!,
    id["murdaLabel"]!,
  ]);
  await expect(rows.locator("dd")).toHaveText([
    `${base.latinPujl} (JGST ${base.latinJgst})`,
    pasanganString("na"),
    murdaFor("na")!.aksara.char,
  ]);
  await shoot(page, "nglegena-na");
});

test("[P-C04] a nglegena without a murda form has no murda row", async ({
  page,
}) => {
  await tile(page, "wa").click();
  const dialog = sheet(page, entryOf("wa").name);
  await expect(dialog.locator("dl.rows dt")).toHaveText([
    id["soundLabel"]!,
    id["pasanganLabel"]!,
  ]);
});

test("[P-C05] a sandhangan shows its localized function", async ({ page }) => {
  const wulu = content.sandhangan.find((s) => s.id === "wulu")!;
  await tile(page, "wulu").click();
  const dialog = sheet(page, wulu.name);
  await expect(dialog.locator("dl.rows dt")).toHaveText([id["functionLabel"]!]);
  await expect(dialog.locator("dl.rows dd")).toHaveText(
    id["functionVowelChanging"]!,
  );
  await expect(dialog.getByText("vowelChanging")).toHaveCount(0);
  await shoot(page, "sandhangan-wulu");
});

test("[P-C06] example words show the reading and aksara, never the gloss", async ({
  page,
}) => {
  const entry = entryOf(withExamples);
  const words = content.chartExamples.get(withExamples)!;
  await tile(page, withExamples).click();
  const dialog = sheet(page, entry.name);
  await expect(
    dialog.getByRole("heading", { level: 3, name: id["exampleWordsHeading"]! }),
  ).toBeVisible();
  const items = dialog.locator("ul.words li");
  await expect(items).toHaveCount(words.length);
  for (const [i, w] of words.entries()) {
    await expect(items.nth(i).locator(".reading")).toHaveText(w.display);
    await expect(items.nth(i).locator(".aksara")).toHaveText(w.aksara);
    await expect(dialog.getByText(w.gloss, { exact: true })).toHaveCount(0);
  }
});

test("[P-C06] a glyph without examples has no examples heading", async ({
  page,
}) => {
  await tile(page, withoutExamples.id).click();
  const dialog = sheet(page, withoutExamples.name);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(id["exampleWordsHeading"]!)).toHaveCount(0);
});

test("[P-C03] the sheet closes on Escape and the close button, and returns focus to the tile", async ({
  page,
}) => {
  const ka = entryOf("ka");
  await tile(page, "ka").focus();
  await page.keyboard.press("Enter");
  await expect(sheet(page, ka.name)).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet(page, ka.name)).toBeHidden();
  await expect(tile(page, "ka")).toBeFocused();

  await tile(page, "ka").click();
  await sheet(page, ka.name)
    .getByRole("button", { name: id["closeButton"]! })
    .click();
  await expect(sheet(page, ka.name)).toBeHidden();
  await expect(tile(page, "ka")).toBeFocused();
});

test("[P-C03] every tile opens its own glyph's detail", async ({ page }) => {
  for (const entryId of ["ha", "wulu", "naMurda", "fa", "angka-0"]) {
    await tile(page, entryId).click();
    await expect(page.getByRole("dialog").locator(".frame .aksara")).toHaveText(
      entryOf(entryId).char,
    );
    await page.keyboard.press("Escape");
  }
});

test("chart and sheet pass axe, touch targets and fit the viewport", async ({
  page,
}) => {
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "chart");

  await tile(page, "ka").click();
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
});

test("[P-L04] English section headings and row labels", async ({ page }) => {
  await seedLocale(page, "en");
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  const english = sectionsFor(en);
  await expect(page.locator("#tab-chart main h2")).toHaveText(
    english.map((s) => s.title),
  );
  await tile(page, "na").click();
  const dialog = sheet(page, "na");
  await expect(dialog.locator("dl.rows dt")).toHaveText([
    en["soundLabel"]!,
    en["pasanganLabel"]!,
    en["murdaLabel"]!,
  ]);
  await page.keyboard.press("Escape");
  await tile(page, "wulu").click();
  await expect(sheet(page, "wulu (i)").locator("dl.rows dd")).toHaveText(
    en["functionVowelChanging"]!,
  );
});
