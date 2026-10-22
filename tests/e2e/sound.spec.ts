import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { kajRulesetId } from "../../src/engine/index.ts";
import { gotoRoute, seedLocale } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";
import { createSolver } from "./support/solver.ts";

const messages = (locale: "id" | "en") =>
  JSON.parse(readFileSync(`src/l10n/${locale}.json`, "utf8")) as Record<
    string,
    string
  >;
const id = messages("id");
const en = messages("en");

const solver = await createSolver(kajRulesetId);
const pa = solver.table.byId.get("pa")!;
const firstUnit = solver.content.units[0]!;

const toast = (page: Page, catalog = id) =>
  page.getByRole("status").filter({ hasText: catalog["audioComingSoon"]! });

const playButton = (page: Page, catalog = id) =>
  page.getByRole("button", {
    name: catalog["playSound"]!.replace("{reading}", pa.pujl),
  });

/** PCM, 8 kHz, mono, 16-bit: 1.5 s of silence. */
function silentWav(): Buffer {
  const rate = 8000;
  const samples = rate * 1.5;
  const data = samples * 2;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + data, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(data, 40);
  return Buffer.concat([header, Buffer.alloc(data)]);
}

test.describe("without a clip", () => {
  test("[P-S11] the meet sound button shows the coming-soon toast", async ({
    page,
  }) => {
    await gotoRoute(page, `#/lesson/${firstUnit.id}`);
    await expect(page.locator(".meet")).toBeVisible();
    const button = playButton(page);
    await expect(button).toHaveAttribute("data-state", "idle");
    await button.click();
    await expect(toast(page)).toBeVisible();
    await expect(button).toHaveAttribute("data-state", "idle");
  });

  test("[P-S11] the trace header sound button shows the toast", async ({
    page,
  }) => {
    await gotoRoute(page, "#/trace/pa");
    await expect(page.locator(".trace")).toBeVisible();
    await playButton(page).click();
    await expect(toast(page)).toBeVisible();
  });

  test("[P-S11] Dengar in the chart detail sheet shows the toast inside the open dialog", async ({
    page,
  }) => {
    await gotoRoute(page, "#/chart");
    await page.locator('#tab-chart [data-entry="ha"]').click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: id["listenButton"]! }).click();
    await expect(dialog.getByRole("status")).toHaveText(id["audioComingSoon"]!);
    await expect(toast(page)).toBeVisible();
  });

  test("[P-S11] Dengar on a converter result shows the toast, in both directions", async ({
    page,
  }) => {
    await gotoRoute(page, "#/converter");
    const latin = page.getByLabel(id["inputHintLatin"]!);
    await latin.fill("aku");
    const listen = page
      .locator("#tab-converter")
      .getByRole("button", { name: id["listenButton"]! });
    await listen.click();
    await expect(toast(page)).toBeVisible();

    await page.getByRole("radio", { name: id["dirAksaraToLatin"]! }).check();
    await page.getByLabel(id["inputHintAksara"]!).fill(pa.char);
    await listen.click();
    await expect(toast(page)).toBeVisible();
  });

  test("[P-S11] English copy: the toast reads Audio is coming soon", async ({
    page,
  }) => {
    await seedLocale(page, "en");
    await gotoRoute(page, "#/trace/pa");
    await playButton(page, en).click();
    await expect(toast(page, en)).toHaveText(en["audioComingSoon"]!);
  });
});

test.describe("with a clip in the manifest", () => {
  test.use({ serviceWorkers: "block" });

  test("[P-S11] the sound button plays the clip with a playing state, then goes idle", async ({
    page,
  }) => {
    await page.route("**/audio/clips.json", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          version: 1,
          clips: { [pa.pujl]: "audio/test-pa.wav" },
        }),
      }),
    );
    await page.route("**/audio/test-pa.wav", (route) =>
      route.fulfill({ contentType: "audio/wav", body: silentWav() }),
    );
    await gotoRoute(page, `#/lesson/${firstUnit.id}`);
    await expect(page.locator(".meet")).toBeVisible();
    const button = playButton(page);
    await button.click();
    await expect(button).toHaveAttribute("data-state", "playing", {
      timeout: 2000,
    });
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(toast(page)).toHaveCount(0);
    await expect(button).toHaveAttribute("data-state", "idle", {
      timeout: 5000,
    });
    await expect(button).not.toHaveAttribute("aria-busy", /.*/);
    await expect(toast(page)).toHaveCount(0);
  });

  test("[P-S11] an invalid clip path degrades to the toast", async ({
    page,
  }) => {
    await page.route("**/audio/clips.json", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          version: 1,
          clips: { [pa.pujl]: "https://example.test/pa.wav" },
        }),
      }),
    );
    await gotoRoute(page, `#/lesson/${firstUnit.id}`);
    await playButton(page).click();
    await expect(toast(page)).toBeVisible();
  });

  test("[P-S11] a clip that fails to load degrades to the toast", async ({
    page,
  }) => {
    await page.route("**/audio/clips.json", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          version: 1,
          clips: { [pa.pujl]: "audio/missing.wav" },
        }),
      }),
    );
    await page.route("**/audio/missing.wav", (route) =>
      route.fulfill({ status: 404, body: "" }),
    );
    await gotoRoute(page, `#/lesson/${firstUnit.id}`);
    await playButton(page).click();
    await expect(toast(page)).toBeVisible();
  });
});
