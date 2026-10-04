import type { Locator, Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  DB_NAME,
  MISTAKE_LOGS,
  SRS_ITEMS,
  type MistakeLogRow,
  type SrsItemRow,
} from "../../src/core/db/schema.ts";
import { generateExercises } from "../../src/features/lessons/exercise-generator.ts";
import {
  expectAccessible,
  expectNoHorizontalOverflow,
  expectTouchTargets,
} from "./support/a11y.ts";
import { gotoRoute } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";
import {
  createSolver,
  type QuestionPrompt,
  type Solver,
} from "./support/solver.ts";

const messages = (locale: "id" | "en") =>
  JSON.parse(readFileSync(`src/l10n/${locale}.json`, "utf8")) as Record<
    string,
    string
  >;
const id = messages("id");
const en = messages("en");

const NOW = Date.parse("2026-10-04T08:00:00+07:00");
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

let solver: Solver;
test.beforeAll(async () => {
  solver = await createSolver();
});

const settle = (page: Page) =>
  page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );

const shoot = (page: Page, name: string) =>
  page.screenshot({ path: `test-results/ulangi-${name}.png` });

const fresh = (itemId: string, dueAt: number): SrsItemRow => ({
  itemId,
  intervalDays: 0,
  ease: 2.5,
  repetitions: 0,
  dueAt,
  lastReviewedAt: null,
});

const reviewed = (itemId: string, dueAt: number): SrsItemRow => ({
  itemId,
  intervalDays: 1,
  ease: 2.5,
  repetitions: 1,
  dueAt,
  lastReviewedAt: dueAt - DAY,
});

async function writeRows(
  page: Page,
  store: string,
  rows: readonly object[],
): Promise<void> {
  await page.evaluate(
    async ({ name, storeName, values }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(storeName, "readwrite");
        for (const value of values) tx.objectStore(storeName).put(value);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    { name: DB_NAME, storeName: store, values: rows },
  );
}

async function readStore<T>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(
    async ({ name, storeName }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      const rows = await new Promise<unknown[]>((resolve, reject) => {
        const request = db
          .transaction(storeName)
          .objectStore(storeName)
          .getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      db.close();
      return rows;
    },
    { name: DB_NAME, storeName: store },
  ) as Promise<T[]>;
}

/** Starts the app on the review tab at the fixed clock, with rows seeded. */
async function openReview(
  page: Page,
  seed: { srs?: SrsItemRow[]; mistakes?: MistakeLogRow[] } = {},
): Promise<void> {
  await page.clock.install({ time: NOW });
  await gotoRoute(page, "#/review");
  if (seed.srs !== undefined) await writeRows(page, SRS_ITEMS, seed.srs);
  if (seed.mistakes !== undefined) {
    await writeRows(page, MISTAKE_LOGS, seed.mistakes);
  }
  if (seed.srs !== undefined || seed.mistakes !== undefined) {
    await page.reload();
    await page.locator('#app[data-boot="ready"]').waitFor();
  }
}

const cards = (page: Page) => page.locator("#tab-review .card");
const reveal = (scope: Page | Locator, text = id["revealAnswerButton"]!) =>
  scope.getByRole("button", { name: text });
const gradeButton = (scope: Page | Locator, name: string) =>
  scope.getByRole("button", { name, exact: true });
const group = (page: Page, title: string) =>
  page.getByRole("heading", { level: 2, name: title });
const info = (glyphId: string) => solver.table.byId.get(glyphId)!;

/** Reveals the first card then grades it. */
async function revealAndGrade(
  page: Page,
  grade: "gradeAgain" | "gradeHard" | "gradeGood" | "gradeEasy",
): Promise<void> {
  await reveal(cards(page).first()).click();
  await gradeButton(cards(page).first(), id[grade]!).click();
}

test("[P-R01][P-R12] the help button opens the help page with both slips and four grade lines", async ({
  page,
}) => {
  await openReview(page);
  await page.getByRole("link", { name: id["reviewHelpTitle"]! }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/review-help");
  await expect(
    page.getByRole("heading", { level: 1, name: id["reviewHelpTitle"]! }),
  ).toBeVisible();
  const slips = page.locator("main .slip");
  await expect(slips).toHaveCount(2);
  await expect(slips.nth(0).getByRole("heading")).toHaveText(
    id["reviewHelpWhyHeading"]!,
  );
  await expect(slips.nth(0)).toContainText(id["reviewHelpWhyBody"]!);
  await expect(slips.nth(1).getByRole("heading")).toHaveText(
    id["reviewHelpGradeHeading"]!,
  );
  const lines = slips.nth(1).locator("li");
  await expect(lines).toHaveCount(4);
  const expected = [
    id["reviewHelpGradeAgain"]!,
    id["reviewHelpGradeHard"]!,
    id["reviewHelpGradeGood"]!,
    id["reviewHelpGradeEasy"]!,
  ];
  for (const [i, text] of expected.entries()) {
    await expect(lines.nth(i)).toHaveText(text);
    await expect(lines.nth(i).locator(".grade__dot")).toBeVisible();
  }
  const dots = await lines
    .locator(".grade__dot")
    .evaluateAll((els) =>
      els.map((el) => getComputedStyle(el).backgroundColor),
    );
  expect(new Set(dots).size, "one color per grade").toBe(4);
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "help");
});

test("[P-R06] a fresh profile shows the empty state", async ({ page }) => {
  await openReview(page);
  await expect(page.getByText(id["reviewEmpty"]!)).toBeVisible();
  await expect(cards(page)).toHaveCount(0);
  await expect(page.locator("#tab-review .drill")).toHaveCount(0);
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "empty");
});

test("[P-R04][P-R03] fresh and due cards sit under their headers; revealing shows the name and four grades", async ({
  page,
}) => {
  await openReview(page, {
    srs: [reviewed("na", NOW - 3 * HOUR), fresh("ha", NOW - HOUR)],
  });
  const headings = page.locator("#tab-review h2");
  await expect(headings).toHaveText([
    id["reviewGroupDue"]!,
    id["reviewGroupFresh"]!,
  ]);
  await expect(cards(page)).toHaveCount(2);
  await expect(cards(page).nth(0).locator(".aksara")).toHaveText(
    info("na").char,
  );
  await expect(cards(page).nth(1).locator(".aksara")).toHaveText(
    info("ha").char,
  );
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "hidden");

  for (const [i, glyphId] of ["na", "ha"].entries()) {
    const card = cards(page).nth(i);
    await reveal(card).click();
    await expect(card).toContainText(info(glyphId).name);
    for (const key of ["gradeAgain", "gradeHard", "gradeGood", "gradeEasy"]) {
      await expect(gradeButton(card, id[key]!)).toBeVisible();
    }
  }
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shoot(page, "revealed");
});

test("[P-R14] a hidden card keeps its name and grade buttons out of the DOM; revealing focuses Again", async ({
  page,
}) => {
  await openReview(page, { srs: [fresh("ha", NOW - HOUR)] });
  const card = cards(page).first();
  await expect(card.locator(".aksara")).toHaveText(info("ha").char);
  await expect(reveal(card)).toBeVisible();
  await expect(card.getByText(info("ha").name, { exact: true })).toHaveCount(0);
  for (const key of ["gradeAgain", "gradeHard", "gradeGood", "gradeEasy"]) {
    await expect(gradeButton(page, id[key]!)).toHaveCount(0);
  }
  await reveal(card).click();
  await expect(reveal(page)).toHaveCount(0);
  await expect(card.getByText(info("ha").name, { exact: true })).toBeVisible();
  for (const key of ["gradeAgain", "gradeHard", "gradeGood", "gradeEasy"]) {
    await expect(gradeButton(card, id[key]!)).toBeVisible();
  }
  await expect(gradeButton(card, id["gradeAgain"]!)).toBeFocused();
});

test("[P-R05][P-R15] again keeps the card as a hidden retry at the end; good removes it", async ({
  page,
}) => {
  await openReview(page, {
    srs: [fresh("ha", NOW - 2 * HOUR), fresh("na", NOW - HOUR)],
  });
  await revealAndGrade(page, "gradeAgain");
  await expect(group(page, id["reviewGroupRetry"]!)).toBeVisible();
  await expect(cards(page)).toHaveCount(2);
  await expect(cards(page).first().locator(".aksara")).toHaveText(
    info("na").char,
  );
  const last = cards(page).last();
  await expect(last.locator(".aksara")).toHaveText(info("ha").char);
  await expect(reveal(last)).toBeVisible();
  await expect(
    last.getByRole("button", { name: id["gradeAgain"]! }),
  ).toHaveCount(0);
  await expect(last.getByText(info("ha").name, { exact: true })).toHaveCount(0);

  await reveal(last).click();
  await gradeButton(last, id["gradeGood"]!).click();
  await expect(cards(page)).toHaveCount(1);
  await expect(cards(page).first().locator(".aksara")).toHaveText(
    info("na").char,
  );
});

test("[P-R07] opening Ulangi re-queries: a persisted retry and a newly due card appear", async ({
  page,
}) => {
  await openReview(page, {
    srs: [fresh("ha", NOW - HOUR), fresh("ca", NOW + 5 * MINUTE)],
  });
  await expect(cards(page)).toHaveCount(1);
  await revealAndGrade(page, "gradeAgain");
  await page.getByRole("link", { name: id["navLadder"]! }).click();
  await expect(page.locator(".ladder")).toBeVisible();
  await page.clock.fastForward("10:00");
  await page.getByRole("link", { name: id["navReview"]! }).click();
  await expect(cards(page)).toHaveCount(2);
  const texts = await cards(page).locator(".aksara").allTextContents();
  expect(texts).toContain(info("ca").char);
  expect(texts).toContain(info("ha").char);
  await expect(group(page, id["reviewGroupRetry"]!)).toBeVisible();
  await expect(group(page, id["reviewGroupFresh"]!)).toBeVisible();
});

test("[P-R07] resuming the page re-queries without a tab switch", async ({
  page,
}) => {
  await openReview(page, {
    srs: [fresh("ha", NOW - HOUR), fresh("ca", NOW + 30 * MINUTE)],
  });
  await expect(cards(page)).toHaveCount(1);
  await page.clock.fastForward("30:00");
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(cards(page)).toHaveCount(2);
});

test("[P-R07] a card graded good comes back as due the next day", async ({
  page,
}) => {
  await openReview(page, { srs: [fresh("ha", NOW - HOUR)] });
  await revealAndGrade(page, "gradeGood");
  await expect(page.getByText(id["reviewEmpty"]!)).toBeVisible();
  await page.clock.fastForward("24:00:00");
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  await expect(group(page, id["reviewGroupDue"]!)).toBeVisible();
  await expect(cards(page)).toHaveCount(1);
});

interface Drill {
  prompt: QuestionPrompt;
  options: string[];
}

async function readDrill(page: Page, n: number): Promise<Drill> {
  const article = page.locator("#tab-review .drill").nth(n);
  const sound = article.locator(".drill__prompt--sound");
  const prompt: QuestionPrompt =
    (await sound.count()) > 0
      ? { sound: ((await sound.textContent()) ?? "").trim() }
      : {
          glyph: (
            (await article.locator(".drill__prompt .aksara").textContent()) ??
            ""
          ).trim(),
        };
  const options = (
    await article.locator(".options button").allTextContents()
  ).map((s) => s.trim());
  return { prompt, options };
}

const daDha: MistakeLogRow = {
  confusionPair: "da-dha",
  count: 2,
  lastAt: NOW,
};

test("[P-R09] a stored da-dha mistake count shows the drill with da and dha questions", async ({
  page,
}) => {
  await openReview(page, { mistakes: [daDha] });
  await expect(
    page.getByRole("heading", { level: 2, name: id["drillHeading"]! }),
  ).toBeVisible();
  const drills = page.locator("#tab-review .drill");
  // Two glyphs, and v1 content has only 2 readable da/dha words: no readings.
  await expect(drills).toHaveCount(2);
  const targets: string[][] = [];
  for (const n of [0, 1]) {
    const d = await readDrill(page, n);
    targets.push(solver.targetIds(d.prompt));
    expect(solver.optionFor("da", d.prompt, d.options)).toBeGreaterThanOrEqual(
      0,
    );
    expect(solver.optionFor("dha", d.prompt, d.options)).toBeGreaterThanOrEqual(
      0,
    );
  }
  expect(targets.flat().sort()).toEqual(["da", "dha"]);
  await expect(page.getByText(id["reviewEmpty"]!)).toBeVisible();
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
});

test("[P-R10] a right drill answer lowers the stored count, a wrong one raises it, and both show feedback", async ({
  page,
}) => {
  await openReview(page, { mistakes: [daDha] });
  const count = async () =>
    (await readStore<MistakeLogRow>(page, MISTAKE_LOGS))[0]?.count;

  const first = await readDrill(page, 0);
  const rightIndex = solver.correctIndex(first.prompt, first.options);
  const firstArticle = page.locator("#tab-review .drill").nth(0);
  await firstArticle.locator(".options button").nth(rightIndex).click();
  await expect(firstArticle.getByRole("status")).toHaveText(
    id["answerCorrect"]!,
  );
  await expect(firstArticle.locator(".options button.is-correct")).toHaveText(
    first.options[rightIndex]!,
  );
  await expect(firstArticle.locator(".options button.is-wrong")).toHaveCount(0);
  await expect(
    firstArticle.locator(".options button:not([disabled])"),
  ).toHaveCount(0);
  await expect.poll(count).toBe(1);

  const second = await readDrill(page, 1);
  const secondRight = solver.correctIndex(second.prompt, second.options);
  const wrong = (secondRight + 1) % second.options.length;
  const secondArticle = page.locator("#tab-review .drill").nth(1);
  await secondArticle.locator(".options button").nth(wrong).click();
  await expect(secondArticle.getByRole("status")).toHaveText(
    id["answerWrong"]!,
  );
  await expect(secondArticle.locator(".options button.is-wrong")).toHaveText(
    second.options[wrong]!,
  );
  await expect(secondArticle.locator(".options button.is-correct")).toHaveText(
    second.options[secondRight]!,
  );
  await expect.poll(count).toBe(2);
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "drill-feedback");
});

test("[P-R11] a mistake made in a lesson surfaces the drill without a reload", async ({
  page,
}) => {
  const u1Glyphs = new Set(
    solver.content.units.find((u) => u.id === "u1")!.glyphs,
  );
  const u2 = solver.content.units.find((u) => u.id === "u2")!;
  // Pin the lesson seed to one whose plan puts the partner among the options.
  const pinned = Array.from({ length: 500 }, (_, i) => i / 500).find((r) =>
    generateExercises({
      unit: u2,
      taughtGlyphs: u1Glyphs,
      corpus: solver.content.words,
      seed: Math.floor(r * 0x7fffffff),
      glyphInfo: solver.table,
    }).some((e) => {
      if (e.kind === "wordReading" || e.glyphId !== "wulu") return false;
      const suku = info("suku");
      return e.options.includes(
        e.kind === "glyphToSound" ? suku.pujl : suku.char,
      );
    }),
  );
  expect(pinned).toBeDefined();
  await page.addInitScript((value) => {
    Math.random = () => value;
  }, pinned!);
  await page.clock.install({ time: NOW });
  await gotoRoute(page, "#/review");
  await expect(page.getByText(id["reviewEmpty"]!)).toBeVisible();

  const play = async (unitId: string, glyphs: number, wrongOnWulu: boolean) => {
    await page.evaluate((hash) => {
      location.hash = hash;
    }, `#/lesson/${unitId}`);
    await expect(page.locator(".lesson")).toBeVisible();
    for (let i = 0; i < glyphs; i++) {
      await page.getByRole("button", { name: id["continueButton"]! }).click();
    }
    let done = false;
    let logged = false;
    while (!done) {
      const options = page.locator(".options button:not([disabled])");
      await options.first().waitFor();
      const bar = page.getByRole("progressbar");
      const number = Number(await bar.getAttribute("aria-valuenow"));
      const total = Number(await bar.getAttribute("aria-valuemax"));
      const sound = page.locator(".prompt__sound");
      const prompt: QuestionPrompt =
        (await sound.count()) > 0
          ? { sound: ((await sound.textContent()) ?? "").trim() }
          : {
              glyph: (
                (await page.locator(".flashcard .aksara").textContent()) ?? ""
              ).trim(),
            };
      const texts = (await options.allTextContents()).map((s) => s.trim());
      const sukuIndex = solver.targetIds(prompt).includes("wulu")
        ? solver.optionFor("suku", prompt, texts)
        : -1;
      let index = solver.correctIndex(prompt, texts);
      if (wrongOnWulu && !logged && sukuIndex >= 0) {
        index = sukuIndex;
        logged = true;
      }
      await options.nth(index).click();
      await expect(page.getByRole("status")).toBeVisible();
      done = number === total;
      await page.getByRole("button", { name: id["continueButton"]! }).click();
    }
    if (wrongOnWulu) expect(logged).toBe(true);
  };

  await play("u1", 5, false);
  await page.getByRole("button", { name: id["backButton"]! }).click();
  await play("u2", 2, true);
  await page.getByRole("button", { name: id["backButton"]! }).click();
  await page.getByRole("link", { name: id["navReview"]! }).click();
  await expect(
    page.getByRole("heading", { level: 2, name: id["drillHeading"]! }),
  ).toBeVisible();
  const rows = await readStore<MistakeLogRow>(page, MISTAKE_LOGS);
  expect(rows.map((r) => r.confusionPair)).toEqual(["suku-wulu"]);
  const drill = await readDrill(page, 0);
  const targets = solver.targetIds(drill.prompt);
  expect(targets.some((t) => t === "suku" || t === "wulu")).toBe(true);
});

test.describe("English interface", () => {
  test.use({ locale: "en-US" });

  test("[P-L04] the reveal button and the grade buttons are English", async ({
    page,
  }) => {
    await openReview(page, { srs: [fresh("ha", NOW - HOUR)] });
    await expect(
      page.getByRole("heading", { level: 1, name: en["reviewTitle"]! }),
    ).toBeVisible();
    await expect(group(page, en["reviewGroupFresh"]!)).toBeVisible();
    await reveal(page, en["revealAnswerButton"]!).click();
    for (const key of ["gradeAgain", "gradeHard", "gradeGood", "gradeEasy"]) {
      await expect(gradeButton(page, en[key]!)).toBeVisible();
    }
    await settle(page);
    await expectAccessible(page);
  });
});
