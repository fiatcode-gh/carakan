import type { Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  kajRulesetId,
  murdaFor,
  nglegena,
  nglegenaById,
} from "../../src/engine/index.ts";
import {
  buildChartTabs,
  findChartEntry,
  pasanganString,
  type ChartStrings,
  type ChartTab,
  type ChartTabId,
} from "../../src/features/chart/chart-catalog.ts";
import {
  glyphUnits,
  splitUnitName,
} from "../../src/features/lessons/unit-display.ts";
import { loadView } from "../support/content-files.ts";
import {
  expectAccessible,
  expectNoHorizontalOverflow,
  expectTouchTargets,
  settle,
} from "./support/a11y.ts";
import { gotoRoute, seedLocale } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";
import { inkGaps } from "./support/ink.ts";

type Catalog = Record<string, string>;

const messages = (locale: "id" | "en"): Catalog =>
  JSON.parse(readFileSync(`src/l10n/${locale}.json`, "utf8")) as Catalog;
const id = messages("id");
const en = messages("en");

const fmt = (template: string, params: Record<string, string>) =>
  template.replace(/\{(\w+)\}/g, (_, name: string) => params[name] ?? "");

const stringsFor = (c: Catalog): ChartStrings => ({
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
  pasangan: c["pasanganLabel"]!,
  murdaHint: c["murdaHint"]!,
  writtenAs: (form) => fmt(c["writtenAs"]!, { form }),
  longFormName: (name) => fmt(c["longFormName"]!, { name }),
  pasanganName: (name) => fmt(c["breakdownPasangan"]!, { name }),
});

const content = await loadView(kajRulesetId);
const tabsFor = (c: Catalog): readonly ChartTab[] =>
  buildChartTabs({
    aksara: content.aksara,
    sandhangan: content.sandhangan,
    strings: stringsFor(c),
    ruleset: content.ruleset,
  });
const tabs = tabsFor(id);
const allEntries = tabs.flatMap((t) => t.sections).flatMap((s) => s.entries);

const tabLabelKey: Record<ChartTabId, string> = {
  carakan: "sectionCarakan",
  sandhangan: "chartTabSandhangan",
  pasangan: "pasanganLabel",
};

const shoot = async (page: Page, name: string) => {
  await settle(page);
  await page.waitForTimeout(600);
  await page.screenshot({ path: `test-results/bagan-${name}.png` });
};

const chartTab = (page: Page, tabId: ChartTabId, c: Catalog = id): Locator =>
  page
    .locator("#tab-chart")
    .getByRole("tab", { name: c[tabLabelKey[tabId]]!, exact: true });
const openTab = async (
  page: Page,
  tabId: ChartTabId,
  c: Catalog = id,
): Promise<void> => {
  await chartTab(page, tabId, c).click();
  await expect(chartTab(page, tabId, c)).toHaveAttribute(
    "aria-selected",
    "true",
  );
};

/** Selects the tab the entry lives on, then returns its tile. */
const tile = async (page: Page, entryId: string): Promise<Locator> => {
  await openTab(page, findChartEntry(tabs, entryId)!.tab.id);
  return page.locator(`#tab-chart [data-entry="${entryId}"]`);
};

const sheetName = (
  entryId: string,
  c: Catalog = id,
  ts: readonly ChartTab[] = tabs,
): string => {
  const at = findChartEntry(ts, entryId)!;
  return fmt(c["chartDetailTitle"]!, {
    name: at.entry.name,
    section: at.section.title,
    number: String(at.position).padStart(2, "0"),
    total: String(at.section.entries.length),
  });
};
const sheet = (page: Page, entryId: string, c: Catalog = id): Locator =>
  page.getByRole("dialog", {
    name: sheetName(entryId, c, c === id ? tabs : tabsFor(c)),
    exact: true,
  });
const entryOf = (entryId: string) => findChartEntry(tabs, entryId)!.entry;

/** A CSS colour token resolved to the `rgb(...)` a computed style reports. */
const resolved = (page: Page, token: string): Promise<string> =>
  page.evaluate((name) => {
    const probe = document.createElement("i");
    probe.style.background = `var(${name})`;
    document.body.append(probe);
    const colour = getComputedStyle(probe).backgroundColor;
    probe.remove();
    return colour;
  }, token);

const stripColour = (page: Page, entryId: string): Promise<string> =>
  page
    .locator(`#tab-chart [data-entry="${entryId}"] .aksara-tile__strip`)
    .evaluate((el) => getComputedStyle(el).backgroundColor);

const withExamples = [...content.chartExamples.keys()].find(
  (k) => (content.chartExamples.get(k) ?? []).length > 0,
)!;
const withoutExamples = allEntries.find(
  (e) => !content.chartExamples.has(e.id),
)!;

test.beforeEach(async ({ page }) => {
  await gotoRoute(page, "#/chart");
});

test("[P-C01] the tabs and their section headings follow the catalog order, with its entry counts", async ({
  page,
}) => {
  const list = page.locator("#tab-chart").getByRole("tablist", {
    name: id["chartTabsLabel"]!,
  });
  await expect(list.getByRole("tab")).toHaveText(
    tabs.map((t) => id[tabLabelKey[t.id]]!),
  );
  expect(tabs.map((t) => t.id)).toEqual(["carakan", "sandhangan", "pasangan"]);
  await expect(chartTab(page, "carakan")).toHaveAttribute(
    "aria-selected",
    "true",
  );

  for (const t of tabs) {
    await openTab(page, t.id);
    await expect(page.locator("#tab-chart main h2")).toHaveText(
      t.sections.map((s) => s.title),
    );
    const sections = page.locator("#tab-chart section.section");
    await expect(sections).toHaveCount(t.sections.length);
    for (const [i, s] of t.sections.entries()) {
      await expect(sections.nth(i).locator("[data-entry]")).toHaveCount(
        s.entries.length,
      );
    }
    // The first section's heading is only a label for the tab's grid.
    const first = page.locator("#tab-chart main h2").first();
    if (t.id === "sandhangan") {
      await expect(first).not.toHaveClass(/visually-hidden/);
    } else {
      await expect(first).toHaveClass(/visually-hidden/);
    }
  }
  expect(tabs[0]!.sections[0]!.entries).toHaveLength(20);
  expect(tabs[2]!.sections[0]!.entries).toHaveLength(20);
});

test("[P-C02] every tile is a button named for its entry and shows its glyph", async ({
  page,
}) => {
  for (const t of tabs) {
    await openTab(page, t.id);
    const entries = t.sections.flatMap((s) => s.entries);
    const tiles = page.locator("#tab-chart [data-entry]");
    await expect(tiles).toHaveCount(entries.length);
    const seen = await tiles.evaluateAll((els) =>
      els.map((el) => ({
        tag: el.tagName,
        id: el.getAttribute("data-entry"),
        title: el.getAttribute("title"),
        glyph: el.querySelector(".aksara")?.textContent,
      })),
    );
    expect(seen).toEqual(
      entries.map((e) => ({
        tag: "BUTTON",
        id: e.id,
        title: e.name,
        glyph: e.char,
      })),
    );
  }
  await openTab(page, "carakan");
  await expect(
    page
      .locator("#tab-chart")
      .getByRole("button", { name: entryOf("na").name, exact: true }),
  ).toBeVisible();
});

test("[P-C02] a tile's label strip follows the unit colour of its glyph (D4)", async ({
  page,
}) => {
  const expected: [ChartTabId, string, string][] = [
    ["carakan", "pa", "--color-coral"],
    ["carakan", "ra", "--color-butter"],
    ["carakan", "da", "--color-periwinkle"],
    ["sandhangan", "wulu", "--color-periwinkle"],
    ["carakan", "angka-1", "--color-neutral"],
  ];
  for (const [tabId, entryId, token] of expected) {
    await openTab(page, tabId);
    expect(await stripColour(page, entryId), entryId).toBe(
      await resolved(page, token),
    );
  }
});

test("[P-C02] the legend names the unit colours of the current tab, in ladder order", async ({
  page,
}) => {
  const units = glyphUnits(content.units);
  const legendFor = (tab: ChartTab): string[] => {
    const used = new Map<number, string>();
    for (const e of tab.sections.flatMap((s) => s.entries)) {
      const gu = units.get(e.id);
      if (gu !== undefined) {
        used.set(gu.index, splitUnitName(gu.unit.name).head ?? gu.unit.name);
      }
    }
    return [...used.entries()].sort((a, b) => a[0] - b[0]).map(([, n]) => n);
  };
  for (const t of tabs) {
    await openTab(page, t.id);
    const legend = page
      .locator("#tab-chart")
      .getByRole("list", { name: id["chartLegendLabel"]! });
    await expect(legend.getByRole("listitem")).toHaveText(legendFor(t));
  }
  await openTab(page, "carakan");
  const carakan = legendFor(tabs[0]!);
  expect(carakan.slice(0, 5)).toEqual([
    "Kelompok 1",
    "Kelompok 2",
    "Kelompok 3",
    "Kelompok 4",
    "Kelompok 5",
  ]);
  expect(carakan).toHaveLength(6);
  expect(carakan[5]).toBe("Sayap lanjutan");
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
    await (await tile(page, entryId)).click();
    const dialog = sheet(page, entryId);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".subtitle")).toHaveText(entry.subtitle);
    await expect(dialog.locator(".glyph-box .aksara")).toHaveText(entry.char);
    await dialog.getByRole("button", { name: id["closeButton"]! }).click();
    await expect(dialog).toBeHidden();
  }
  expect(entryOf("ka").subtitle).toContain(id["murdaHint"]!);
  expect(entryOf("adeg").subtitle).toBe("—");
});

test("[P-C03] the sheet title counts the entry within its section", async ({
  page,
}) => {
  await (await tile(page, "angka-3")).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toHaveAccessibleName(
    fmt(id["chartDetailTitle"]!, {
      name: entryOf("angka-3").name,
      section: id["sectionAngka"]!,
      number: "04",
      total: "10",
    }),
  );
});

test("[P-C03] the head reads the entry out, with the glyph as a named image", async ({
  page,
}) => {
  await (await tile(page, "ha")).click();
  const dialog = sheet(page, "ha");
  await expect(dialog.locator(".head .eyebrow")).toHaveText(
    id["readingLabel"]!,
  );
  await expect(dialog.locator(".head__reading")).toHaveText("ha");
  await expect(
    dialog.getByRole("img", {
      name: fmt(id["aksaraName"]!, { reading: "ha" }),
    }),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  // Angka and pada have no PUJL reading, so their name stands in.
  await (await tile(page, "angka-3")).click();
  const angka = entryOf("angka-3");
  expect(angka.reading).toBeNull();
  await expect(sheet(page, "angka-3").locator(".head__reading")).toHaveText(
    angka.name,
  );
});

test("[P-B21] the ha detail shows its Indonesian shape note as the hand note; wulu and angka-1 show none", async ({
  page,
}) => {
  await (await tile(page, "ha")).click();
  await expect(sheet(page, "ha").locator(".head .shape-note")).toHaveText(
    "ha adalah pa dengan satu kaki tambahan.",
  );
  await page.keyboard.press("Escape");
  for (const noteless of ["angka-1", "pasangan-ha"]) {
    await (await tile(page, noteless)).click();
    await expect(sheet(page, noteless).locator(".shape-note")).toHaveCount(0);
    await page.keyboard.press("Escape");
  }
  await (await tile(page, "wulu")).click();
  await expect(sheet(page, "wulu").locator(".shape-note")).toHaveCount(0);
});

test("[P-C04] a nglegena detail lists pasangan and murda boxes", async ({
  page,
}) => {
  await (await tile(page, "na")).click();
  const dialog = sheet(page, "na");
  const boxes = dialog.locator(".box");
  await expect(boxes.locator(".box__label")).toHaveText([
    id["pasanganLabel"]!,
    id["murdaLabel"]!,
    id["practiceLabel"]!,
  ]);
  await expect(boxes.locator(".aksara")).toHaveText([
    pasanganString("na"),
    murdaFor("na")!.aksara.char,
  ]);
  await shoot(page, "nglegena-na");
});

test("[P-C04] a nglegena without a murda form has no murda box", async ({
  page,
}) => {
  await (await tile(page, "wa")).click();
  await expect(sheet(page, "wa").locator(".box__label")).toHaveText([
    id["pasanganLabel"]!,
    id["practiceLabel"]!,
  ]);
});

test("[P-C05] a sandhangan shows its localized function", async ({ page }) => {
  await (await tile(page, "wulu")).click();
  const dialog = sheet(page, "wulu");
  await expect(dialog.locator(".box__label")).toHaveText([
    id["functionLabel"]!,
  ]);
  await expect(dialog.locator(".box__value")).toHaveText(
    id["functionVowelChanging"]!,
  );
  await expect(dialog.getByText("vowelChanging")).toHaveCount(0);
  await shoot(page, "sandhangan-wulu");
});

test("[P-C05] a murda, swara or angka entry has no boxes", async ({ page }) => {
  for (const entryId of ["naMurda", "a", "angka-0"]) {
    await (await tile(page, entryId)).click();
    await expect(sheet(page, entryId)).toBeVisible();
    await expect(sheet(page, entryId).locator(".box")).toHaveCount(0);
    await page.keyboard.press("Escape");
  }
});

test("[P-C06] example words show the reading and aksara, never the gloss", async ({
  page,
}) => {
  const words = content.chartExamples.get(withExamples)!;
  await (await tile(page, withExamples)).click();
  const dialog = sheet(page, withExamples);
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
  await (await tile(page, withoutExamples.id)).click();
  const dialog = sheet(page, withoutExamples.id);
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText(id["exampleWordsHeading"]!)).toHaveCount(0);
});

test("[P-C03] the sheet closes on Escape and the close button, and returns focus to the tile", async ({
  page,
}) => {
  const ka = await tile(page, "ka");
  await ka.focus();
  await page.keyboard.press("Enter");
  await expect(sheet(page, "ka")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(sheet(page, "ka")).toBeHidden();
  await expect(ka).toBeFocused();

  await ka.click();
  await sheet(page, "ka")
    .getByRole("button", { name: id["closeButton"]! })
    .click();
  await expect(sheet(page, "ka")).toBeHidden();
  await expect(ka).toBeFocused();
});

test("[P-C03] every tile opens its own glyph's detail", async ({ page }) => {
  for (const entryId of ["ha", "wulu", "naMurda", "fa", "angka-0"]) {
    await (await tile(page, entryId)).click();
    await expect(
      page.getByRole("dialog").locator(".glyph-box .aksara"),
    ).toHaveText(entryOf(entryId).char);
    await page.keyboard.press("Escape");
  }
});

test("[P-C09] the Pasangan tab shows 20 tiles, each opening its own detail with the base letter", async ({
  page,
}) => {
  await openTab(page, "pasangan");
  const tiles = page.locator("#tab-chart [data-entry]");
  await expect(tiles).toHaveCount(20);
  await shoot(page, "pasangan");

  for (const [i, letter] of nglegena.entries()) {
    const entryId = `pasangan-${letter.id}`;
    await expect(tiles.nth(i)).toHaveAttribute("data-entry", entryId);
    await tiles.nth(i).click();
    const dialog = sheet(page, entryId);
    await expect(dialog).toBeVisible();
    await expect(dialog.locator(".glyph-box .aksara")).toHaveText(
      pasanganString(letter.id),
    );
    await expect(dialog.locator(".head__reading")).toHaveText(letter.latinPujl);
    await expect(dialog.locator(".box__label")).toHaveText([
      id["baseLetterLabel"]!,
    ]);
    await expect(dialog.locator(".box .aksara")).toHaveText(
      nglegenaById(letter.id)!.char,
    );
    if (i === 0) await shoot(page, "pasangan-ha");
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  }
});

test("[P-S07] the sheet's big reading follows the whole-string font rule", async ({
  page,
}) => {
  const family = (locator: Locator) =>
    locator.evaluate((el) =>
      getComputedStyle(el).fontFamily.replaceAll('"', ""),
    );

  await (await tile(page, "ha")).click();
  expect(
    await family(sheet(page, "ha").locator(".head__reading .reading")),
  ).toMatch(/^Bricolage Grotesque/);
  await page.keyboard.press("Escape");

  // The KAJ murda reading carries a code point Bricolage lacks (U+1E33), so the
  // whole string falls back to MPLUS, big reading and subtitle alike.
  await (await tile(page, "kaMurda")).click();
  const dialog = sheet(page, "kaMurda");
  const big = dialog.locator(".head__reading .reading");
  const subtitle = dialog.locator(".subtitle .reading");
  await expect(big).toContainText("\u1e33");
  await expect(subtitle).toContainText("\u1e33");
  expect(await family(big)).toMatch(/^MPLUS Rounded 1c/);
  expect(await family(subtitle)).toMatch(/^MPLUS Rounded 1c/);
});

test("[P-C01] the tabs work by keyboard: arrows move focus and select", async ({
  page,
}) => {
  await chartTab(page, "carakan").focus();
  await page.keyboard.press("ArrowRight");
  await expect(chartTab(page, "sandhangan")).toBeFocused();
  await expect(chartTab(page, "sandhangan")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.locator('#tab-chart [data-entry="wulu"]')).toBeVisible();
  await page.keyboard.press("End");
  await expect(chartTab(page, "pasangan")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(chartTab(page, "carakan")).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await expect(chartTab(page, "pasangan")).toBeFocused();
  await page.keyboard.press("Home");
  await expect(chartTab(page, "carakan")).toBeFocused();
  await expect(chartTab(page, "carakan")).toHaveAttribute("tabindex", "0");
  await expect(chartTab(page, "sandhangan")).toHaveAttribute("tabindex", "-1");
  const panel = page
    .locator("#tab-chart")
    .getByRole("tabpanel", { name: id["sectionCarakan"]! });
  await expect(panel).toBeVisible();
});

test("[P-S03] the selected chart tab survives a tab switch", async ({
  page,
}) => {
  await openTab(page, "pasangan");
  const nav = page.getByRole("navigation", { name: id["mainNavLabel"]! });
  await nav.getByRole("link", { name: id["navConverter"]! }).click();
  await expect(page.locator("#tab-chart")).toBeHidden();
  await nav.getByRole("link", { name: id["navChart"]! }).click();
  await expect(chartTab(page, "pasangan")).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(
    page.locator('#tab-chart [data-entry="pasangan-ha"]'),
  ).toBeVisible();
});

test("chart and sheet pass axe, touch targets and fit the viewport", async ({
  page,
}) => {
  for (const t of tabs) {
    await openTab(page, t.id);
    await expectAccessible(page);
    await expectTouchTargets(page);
    await expectNoHorizontalOverflow(page);
  }
  await openTab(page, "carakan");
  await shoot(page, "chart");

  await (await tile(page, "ka")).click();
  await expectAccessible(page);
  await expectTouchTargets(page);
  await page.keyboard.press("Escape");

  await (await tile(page, "pasangan-ha")).click();
  await expectAccessible(page);
  await expectTouchTargets(page);
});

test("[P-L04] English tabs, section headings and box labels", async ({
  page,
}) => {
  await seedLocale(page, "en");
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  const english = tabsFor(en);
  await expect(
    page
      .locator("#tab-chart")
      .getByRole("tablist", { name: en["chartTabsLabel"]! })
      .getByRole("tab"),
  ).toHaveText(english.map((t) => en[tabLabelKey[t.id]]!));
  await expect(page.locator("#tab-chart main h2")).toHaveText(
    english[0]!.sections.map((s) => s.title),
  );
  await page.locator('#tab-chart [data-entry="na"]').click();
  const dialog = page.getByRole("dialog", {
    name: sheetName("na", en, english),
    exact: true,
  });
  await expect(dialog.locator(".box__label")).toHaveText([
    en["pasanganLabel"]!,
    en["murdaLabel"]!,
    en["practiceLabel"]!,
  ]);
  await expect(dialog.locator(".head .eyebrow")).toHaveText(
    en["readingLabel"]!,
  );
  await page.keyboard.press("Escape");
  await chartTab(page, "sandhangan", en).click();
  await page.locator('#tab-chart [data-entry="wulu"]').click();
  await expect(
    page
      .getByRole("dialog", {
        name: sheetName("wulu", en, english),
        exact: true,
      })
      .locator(".box__value"),
  ).toHaveText(en["functionVowelChanging"]!);
});

test("[P-B21] the English ha detail shows the English shape note", async ({
  page,
}) => {
  await seedLocale(page, "en");
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  await page.locator('#tab-chart [data-entry="ha"]').click();
  await expect(
    page
      .getByRole("dialog", {
        name: sheetName("ha", en, tabsFor(en)),
        exact: true,
      })
      .locator(".head .shape-note"),
  ).toHaveText("ha is pa with one more leg.");
});

for (const width of [360, 390]) {
  test.describe(`at ${width}px wide`, () => {
    test.use({ viewport: { width, height: 755 } });

    test("[P-C02] no label strip is cut short, on any tab", async ({
      page,
    }) => {
      for (const t of tabs) {
        await openTab(page, t.id);
        await settle(page);
        const cut = await page
          .locator("#tab-chart .aksara-tile__strip")
          .evaluateAll((strips) =>
            strips
              .filter((strip) =>
                [strip, ...strip.querySelectorAll(".reading")].some(
                  (el) => el.scrollWidth > el.clientWidth,
                ),
              )
              .map((strip) => strip.textContent),
          );
        expect(cut, `${t.id} strips with clipped text`).toEqual([]);
      }
    });

    test("[P-C02] the tiles of one row are as tall as each other, with their strips level", async ({
      page,
    }) => {
      await openTab(page, "sandhangan");
      await settle(page);
      const rows = await page.locator("#tab-chart .grid").evaluateAll((grids) =>
        grids.map((grid) => {
          const byTop = new Map<number, string[]>();
          for (const tile of grid.querySelectorAll(".aksara-tile")) {
            const box = tile.getBoundingClientRect();
            const strip = tile
              .querySelector(".aksara-tile__strip")!
              .getBoundingClientRect();
            const row = Math.round(box.top);
            byTop.set(row, [
              ...(byTop.get(row) ?? []),
              `${Math.round(box.height)}/${Math.round(strip.top - box.top)}`,
            ]);
          }
          return [...byTop.values()];
        }),
      );
      for (const row of rows.flat()) {
        expect(new Set(row).size, row.join(" ")).toBe(1);
      }
    });
  });
}

test("[P-C09] a pasangan label shows the base syllable; the tile is still named in full", async ({
  page,
}) => {
  await openTab(page, "pasangan");
  for (const letter of nglegena) {
    const base = content.aksara.find((a) => a.id === letter.id)!.name;
    const entry = page.locator(
      `#tab-chart [data-entry="pasangan-${letter.id}"]`,
    );
    await expect(entry.locator(".aksara-tile__strip")).toHaveText(base);
    await expect(entry).toHaveAccessibleName(
      fmt(id["breakdownPasangan"]!, { name: base }),
    );
  }
});

test("[P-C02] no tile's marks run into the label strip or off the top of the tile, on any tab", async ({
  page,
}) => {
  const tight: string[] = [];
  for (const t of tabs) {
    await openTab(page, t.id);
    await settle(page);
    const tiles = page.locator("#tab-chart [data-entry]");
    // Some ids repeat across sections, so walk the tiles by position.
    for (let at = 0; at < (await tiles.count()); at += 1) {
      const tile = tiles.nth(at);
      const gaps = await inkGaps(page, tile.locator(".aksara-tile__glyph"));
      const name = `${t.id}/${await tile.getAttribute("data-entry")}`;
      if (gaps === null) tight.push(`${name} (nothing drawn)`);
      else if (gaps.bottom < 4 || gaps.top < 2) {
        tight.push(`${name} (above ${gaps.top}px, below ${gaps.bottom}px)`);
      }
    }
  }
  expect(tight, "tiles with less than 2px above or 4px below the ink").toEqual(
    [],
  );
});
