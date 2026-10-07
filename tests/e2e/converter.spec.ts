import type { Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { javaneseChar, toAksara, toLatin } from "../../src/engine/index.ts";
import { localizeEngineMessage } from "../../src/features/converter/engine-messages.ts";
import {
  expectAccessible,
  expectNoHorizontalOverflow,
  expectTouchTargets,
  settle,
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
  await expect(
    page.getByRole("status").filter({ hasText: id["copyWarning"]! }),
  ).toHaveText(id["copyWarning"]!);
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
  await expect(
    page.getByRole("status").filter({ hasText: id["copyWarning"]! }),
  ).toHaveText(id["copyWarning"]!);
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
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "latin");
});

function clustersOf(latin: string) {
  const result = toAksara(latin);
  if (result.kind !== "success") throw new Error(`not convertible: ${latin}`);
  return result;
}

/** Taps the centre of a glyph range on the real touch path; never the hit buttons. */
async function tapRange(page: Page, start: number, end: number): Promise<void> {
  const point = await page.locator(".cluster-result .aksara").evaluate(
    (el, [s, e]) => {
      const range = document.createRange();
      range.setStart(el.firstChild!, s!);
      range.setEnd(el.firstChild!, e!);
      const centre = () => {
        const box = range.getClientRects()[0] ?? range.getBoundingClientRect();
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      };
      // Keep the point clear of the sticky bars at the viewport edges.
      window.scrollBy(0, centre().y - window.innerHeight / 2);
      return centre();
    },
    [start, end],
  );
  await page.touchscreen.tap(point.x, point.y);
}

async function tapCluster(
  page: Page,
  latin: string,
  index: number,
): Promise<void> {
  const { start, end } = clustersOf(latin).clusters[index]!.output;
  await tapRange(page, start, end);
}

const hit = (page: Page, index: number) =>
  page.locator(`.cluster-result__hit[data-index="${index}"]`);
const breakdown = (page: Page, catalog = id) =>
  page.getByRole("region", { name: catalog["breakdownTitle"]! });
const echoMarks = (page: Page) => page.locator(".source-echo mark");

test.describe("[P-U10] tap an aksara to see where it came from", () => {
  test("tapping a cluster selects it, marks its letters and lists its parts", async ({
    page,
  }) => {
    await gotoRoute(page, "#/converter");
    await latinInput(page).fill("kita");
    await tapCluster(page, "kita", 0);
    await expect(echoMarks(page)).toHaveText(["ki"]);
    await expect(hit(page, 0)).toHaveAttribute("aria-pressed", "true");
    await expect(breakdown(page)).toContainText("ka");
    await expect(breakdown(page)).toContainText("wulu (i)");
    await expect(breakdown(page)).toContainText(
      fmt(id["breakdownReading"]!, { reading: "ki" }),
    );
    await expect(page.locator(".cluster-status")).toContainText("ki");
    await settle(page);
    await page.screenshot({ path: "test-results/ubah-cluster-selected.png" });
    await breakdown(page).screenshot({
      path: "test-results/ubah-cluster-breakdown.png",
    });
    await tapCluster(page, "kita", 1);
    await expect(echoMarks(page)).toHaveText(["ta"]);
    await expect(hit(page, 0)).toHaveAttribute("aria-pressed", "false");
  });

  test("the hit buttons never take pointer events, so text selection still works", async ({
    page,
  }) => {
    await gotoRoute(page, "#/converter");
    await latinInput(page).fill("kita kita");
    const { clusters } = clustersOf("kita kita");
    const box = await page.locator(".cluster-result .aksara").evaluate(
      (el, [s, e]) => {
        const range = document.createRange();
        range.setStart(el.firstChild!, s!);
        range.setEnd(el.firstChild!, e!);
        window.scrollBy(
          0,
          range.getBoundingClientRect().y - window.innerHeight / 2,
        );
        const r = range.getBoundingClientRect();
        const first = document.createRange();
        first.setStart(el.firstChild!, s!);
        first.setEnd(el.firstChild!, s! + 1);
        const centre = first.getBoundingClientRect();
        const hitAtCentre = document
          .elementFromPoint(
            centre.x + centre.width / 2,
            centre.y + centre.height / 2,
          )
          ?.closest(".cluster-result__hit");
        return {
          x: r.x,
          y: r.y + r.height / 2,
          width: r.width,
          hitAtCentre: hitAtCentre !== null && hitAtCentre !== undefined,
        };
      },
      [clusters[0]!.output.start, clusters.at(-1)!.output.end],
    );
    expect(box.hitAtCentre).toBe(false);
    await page.mouse.move(box.x + 1, box.y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width - 1, box.y, { steps: 8 });
    await page.mouse.up();
    expect(
      await page.evaluate(() => window.getSelection()?.toString().length ?? 0),
    ).toBeGreaterThan(0);
    await expect(
      page.locator('.cluster-result__hit[aria-pressed="true"]'),
    ).toHaveCount(0);
  });

  test("a pasangan cluster marks both source runs and names the pasangan", async ({
    page,
  }) => {
    await gotoRoute(page, "#/converter");
    await latinInput(page).fill("bapak lunga");
    await tapCluster(page, "bapak lunga", 2);
    await expect(echoMarks(page)).toHaveText(["k", "lu"]);
    await expect(breakdown(page)).toContainText(
      fmt(id["breakdownPasangan"]!, { name: "la" }),
    );
  });

  test("a part opens the chart detail sheet and the selection stays", async ({
    page,
  }) => {
    await gotoRoute(page, "#/converter");
    await latinInput(page).fill("kita");
    await tapCluster(page, "kita", 0);
    await breakdown(page)
      .getByRole("button", {
        name: fmt(id["breakdownOpenChart"]!, { name: "wulu (i)" }),
      })
      .click();
    const dialog = page.getByRole("dialog", { name: "wulu (i)" });
    await expect(dialog).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog).toHaveCount(0);
    await expect(hit(page, 0)).toHaveAttribute("aria-pressed", "true");
  });

  test("editing the input clears the selection", async ({ page }) => {
    await gotoRoute(page, "#/converter");
    await latinInput(page).fill("kita");
    await tapCluster(page, "kita", 0);
    await expect(breakdown(page)).toBeVisible();
    await latinInput(page).fill("kitab");
    await expect(echoMarks(page)).toHaveCount(0);
    await expect(breakdown(page)).toHaveCount(0);
    await expect(
      page.locator('.cluster-result__hit[aria-pressed="true"]'),
    ).toHaveCount(0);
  });

  test("the keyboard selects through the hit buttons", async ({ page }) => {
    await gotoRoute(page, "#/converter");
    await latinInput(page).fill("kita");
    const label = (reading: string) => fmt(id["clusterLabel"]!, { reading });
    const ta = page.getByRole("button", { name: label("ta"), exact: true });
    await ta.focus();
    await page.keyboard.press("Enter");
    await expect(ta).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".cluster-status")).toContainText("ta");
    const ki = page.getByRole("button", { name: label("ki"), exact: true });
    await ki.focus();
    await page.keyboard.press("Space");
    await expect(ki).toHaveAttribute("aria-pressed", "true");
    await expect(ta).toHaveAttribute("aria-pressed", "false");
    await expect(page.locator(".cluster-status")).toContainText("ki");
  });

  test("a mixed sentence is accessible; the narrow digit is tappable", async ({
    page,
  }) => {
    const latin = "Ibu lunga, bapak 1945.";
    await gotoRoute(page, "#/converter");
    await latinInput(page).fill(latin);
    const { clusters } = clustersOf(latin);
    const first = clusters.findIndex((c) =>
      c.sources.some((s) => latin.slice(s.start, s.end) === "1"),
    );
    expect(first).toBeGreaterThanOrEqual(0);
    await tapCluster(page, latin, first);
    await expectAccessible(page);
    await expectTouchTargets(page);
    await expectNoHorizontalOverflow(page);
    const four = clusters.findIndex((c) =>
      c.sources.some((s) => latin.slice(s.start, s.end) === "4"),
    );
    await tapCluster(page, latin, four);
    await expect(hit(page, four)).toHaveAttribute(
      "aria-label",
      fmt(id["clusterLabel"]!, { reading: "4" }),
    );
    await expect(hit(page, four)).toHaveAttribute("aria-pressed", "true");
  });

  test("the rendered aksara is pixel-identical to the plain text node", async ({
    page,
  }) => {
    for (const latin of [
      "bapak lunga",
      "klapa",
      "bapak lombok",
      "Ibu lunga, bapak 1945.",
    ]) {
      // A same-hash goto would keep the tampered DOM.
      await page.goto("about:blank");
      await gotoRoute(page, "#/converter");
      await latinInput(page).fill(latin);
      const aksara = outputOf(page).locator(".aksara");
      await expect(aksara).toHaveText(clustersOf(latin).output);
      expect(
        await aksara.evaluate((el) => [
          el.childNodes.length,
          el.firstChild?.nodeType,
          (el.firstChild as Text).data,
        ]),
      ).toEqual([1, 3, clustersOf(latin).output]);
      await page.evaluate(() =>
        (document.activeElement as HTMLElement)?.blur(),
      );
      await settle(page);
      const wrapped = await aksara.screenshot();
      await aksara.evaluate((el) => {
        const wrapper = el.closest(".cluster-result")!;
        wrapper.replaceWith(el);
      });
      const plain = await outputOf(page).locator(".aksara").screenshot();
      expect(wrapped.equals(plain), `pixels differ for ${latin}`).toBe(true);
    }
  });

  test("copy after a selection writes the whole output", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await gotoRoute(page, "#/converter");
    await latinInput(page).fill("kita");
    await tapCluster(page, "kita", 0);
    await page.getByRole("button", { name: id["copyButton"]! }).click();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      clustersOf("kita").output,
    );
  });

  test("an ambiguous word has no hit buttons until a chip is chosen", async ({
    page,
  }) => {
    await gotoRoute(page, "#/converter");
    await latinInput(page).fill("prelu");
    const result = toAksara("prelu");
    if (result.kind !== "ambiguous") throw new Error("prelu must be ambiguous");
    const card = page.getByRole("region", { name: id["ambiguousTitle"]! });
    await expect(card.locator(".cluster-result__hit")).toHaveCount(0);
    await card.getByRole("button").nth(1).click();
    await expect(page.locator(".cluster-result__hit")).toHaveCount(
      result.candidates[1]!.clusters.length,
    );
    const { start, end } = result.candidates[1]!.clusters[0]!.output;
    await tapRange(page, start, end);
    await expect(breakdown(page)).toBeVisible();
  });

  test.describe("English UI", () => {
    test.use({ locale: "en-US" });

    test("the reading line and hint are in English", async ({ page }) => {
      await gotoRoute(page, "#/converter");
      await latinInput(page, en).fill("kita");
      await expect(page.getByText(en["clusterHint"]!)).toBeVisible();
      await tapCluster(page, "kita", 0);
      await expect(breakdown(page, en)).toContainText(
        fmt(en["breakdownReading"]!, { reading: "ki" }),
      );
    });
  });
});
