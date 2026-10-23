import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import {
  DB_NAME,
  MISTAKE_LOGS,
  SRS_ITEMS,
  type MistakeLogRow,
  type SrsItemRow,
} from "../../src/core/db/schema.ts";
import { kajRulesetId } from "../../src/engine/index.ts";
import { generateExercises } from "../../src/features/lessons/exercise-generator.ts";
import {
  expectAccessible,
  expectNoHorizontalOverflow,
  expectTouchTargets,
} from "./support/a11y.ts";
import { gotoRoute, tokenColor } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";
import { playLesson, writeRows } from "./support/lesson.ts";
import { answerReviewQuestion } from "./support/review-quiz.ts";
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
  solver = await createSolver(kajRulesetId);
});

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

const scheduled = (
  itemId: string,
  dueAt: number,
  repetitions: number,
  intervalDays: number,
): SrsItemRow => ({
  itemId,
  intervalDays,
  ease: 2.5,
  repetitions,
  dueAt,
  lastReviewedAt: repetitions === 0 ? null : dueAt - DAY,
});

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

const today = (page: Page) => page.locator("#tab-review .review-today");
const startButton = (page: Page, catalog = id) =>
  today(page).getByRole("button", { name: catalog["reviewStartButton"]! });
const dueCount = (count: number, catalog = id) =>
  catalog["reviewDueCount"]!.replace("{count}", String(count));
const strengthRows = (page: Page) => page.locator("#tab-review .strength-row");
const quizButton = (page: Page, name: string) =>
  page.locator(".quiz").getByRole("button", { name, exact: true });
const info = (glyphId: string) => solver.table.byId.get(glyphId)!;
const reading = (glyphId: string) => info(glyphId).pujl || info(glyphId).name;

const storedCard = async (page: Page, itemId: string) =>
  (await readStore<SrsItemRow>(page, SRS_ITEMS)).find(
    (row) => row.itemId === itemId,
  );

test("[P-R01][P-R12] the help button opens the help page with the why card and the three how-it-works lines", async ({
  page,
}) => {
  await openReview(page);
  await page.getByRole("link", { name: id["reviewHelpTitle"]! }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/review-help");
  await expect(
    page.getByRole("heading", { level: 1, name: id["reviewHelpTitle"]! }),
  ).toBeVisible();
  const cards = page.locator("main .surface:visible");
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0).getByRole("heading")).toHaveText(
    id["reviewHelpWhyHeading"]!,
  );
  await expect(cards.nth(0)).toContainText(id["reviewHelpWhyBody"]!);
  await expect(cards.nth(1).getByRole("heading")).toHaveText(
    id["reviewHelpHowHeading"]!,
  );
  await expect(cards.nth(1).locator("p")).toHaveText([
    id["reviewHelpRight"]!,
    id["reviewHelpWrong"]!,
    id["reviewHelpStrength"]!,
  ]);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "help");
});

test("[P-R06] a fresh profile shows the empty state on the Today card, with no start button", async ({
  page,
}) => {
  await openReview(page);
  await expect(today(page)).toContainText(id["reviewTodayLabel"]!);
  await expect(
    today(page).getByRole("heading", { level: 2, name: id["reviewEmpty"]! }),
  ).toBeVisible();
  await expect(startButton(page)).toHaveCount(0);
  await expect(strengthRows(page)).toHaveCount(0);
  await expect(page.locator("#tab-review .drill")).toHaveCount(0);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "empty");
});

test("[P-R04] three due cards show the count, a fanned stack of their glyphs and the start button", async ({
  page,
}) => {
  await openReview(page, {
    srs: [
      fresh("ha", NOW - 3 * HOUR),
      fresh("na", NOW - 2 * HOUR),
      fresh("ca", NOW - HOUR),
    ],
  });
  await expect(
    today(page).getByRole("heading", { level: 2, name: dueCount(3) }),
  ).toBeVisible();
  await expect(startButton(page)).toBeVisible();
  const stack = today(page).locator('[aria-hidden="true"]:has(.aksara)');
  await expect(stack).toHaveCount(1);
  const glyphs = await stack.locator(".aksara").allTextContents();
  expect(glyphs.map((g) => g.trim()).sort()).toEqual(
    ["ha", "na", "ca"].map((glyphId) => info(glyphId).char).sort(),
  );
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shoot(page, "today");
});

test("[P-R17] the quiz grades a right answer good and a wrong one again, asks the missed card again, then shows the result", async ({
  page,
}) => {
  await openReview(page, {
    srs: [
      fresh("ha", NOW - 3 * HOUR),
      fresh("na", NOW - 2 * HOUR),
      fresh("ca", NOW - HOUR),
    ],
  });
  await startButton(page).click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/review/quiz");
  await expect(page.locator(".quiz__prompt .aksara")).toHaveText(
    info("ha").char,
  );
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "quiz");

  await answerReviewQuestion(page, solver, "right");
  await expect
    .poll(async () => (await storedCard(page, "ha"))?.repetitions)
    .toBe(1);
  const ha = (await storedCard(page, "ha"))!;
  expect(ha.dueAt).toBeGreaterThanOrEqual(NOW + DAY);
  expect(ha.dueAt).toBeLessThan(NOW + DAY + HOUR);
  await quizButton(page, id["continueButton"]!).click();

  const second = await answerReviewQuestion(page, solver, "wrong");
  expect(solver.targetIds(second.prompt)).toEqual(["na"]);
  await expect
    .poll(async () => (await storedCard(page, "na"))?.lastReviewedAt)
    .not.toBeNull();
  const na = (await storedCard(page, "na"))!;
  expect(na.repetitions).toBe(0);
  expect(na.dueAt).toBeGreaterThanOrEqual(NOW + 10 * MINUTE);
  expect(na.dueAt).toBeLessThan(NOW + 10 * MINUTE + HOUR);
  await quizButton(page, id["continueButton"]!).click();

  await answerReviewQuestion(page, solver, "right");
  await quizButton(page, id["continueButton"]!).click();

  const again = await answerReviewQuestion(page, solver, "right");
  expect(again.prompt).toEqual(second.prompt);
  await quizButton(page, id["continueButton"]!).click();

  await expect(
    page.locator(".quiz-done").getByRole("heading", {
      name: id["lessonDone"]!.replace("{correct}", "3").replace("{total}", "4"),
    }),
  ).toBeVisible();
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "quiz-done");

  await page.locator(".quiz-done .bar").getByRole("button").click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/review");
  await expect(
    today(page).getByRole("heading", { level: 2, name: id["reviewEmpty"]! }),
  ).toBeVisible();
});

test("[P-R05] a card missed in the quiz stays in the due count as a retry after the quiz is closed", async ({
  page,
}) => {
  await openReview(page, {
    srs: [
      fresh("ha", NOW - 3 * HOUR),
      fresh("na", NOW - 2 * HOUR),
      fresh("ca", NOW - HOUR),
    ],
  });
  await startButton(page).click();
  await answerReviewQuestion(page, solver, "right");
  await quizButton(page, id["continueButton"]!).click();
  await answerReviewQuestion(page, solver, "wrong");
  await expect
    .poll(async () => (await storedCard(page, "na"))?.lastReviewedAt)
    .not.toBeNull();
  await quizButton(page, id["closeButton"]!).click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/review");
  // na is stored as due in ten minutes: only the retry set lists it now.
  expect((await storedCard(page, "na"))!.dueAt).toBeGreaterThan(NOW);
  await expect(
    today(page).getByRole("heading", { level: 2, name: dueCount(2) }),
  ).toBeVisible();
  const stack = today(page).locator('[aria-hidden="true"]:has(.aksara)');
  const glyphs = await stack.locator(".aksara").allTextContents();
  expect(glyphs.map((g) => g.trim()).sort()).toEqual(
    ["na", "ca"].map((glyphId) => info(glyphId).char).sort(),
  );
});

test("[P-R18] strength rows follow the ladder order with 3, 2 and 1 filled segments, and list a card that is not due", async ({
  page,
}) => {
  await openReview(page, {
    srs: [
      scheduled("ya", NOW - HOUR, 0, 0),
      scheduled("pa", NOW - HOUR, 2, 3),
      scheduled("ha", NOW - HOUR, 1, 1),
      scheduled("na", NOW + 3 * DAY, 4, 30),
    ],
  });
  await expect(
    page.getByRole("heading", { level: 2, name: id["strengthHeading"]! }),
  ).toBeVisible();
  const rows = strengthRows(page);
  await expect(rows).toHaveCount(4);
  const expected = [
    ["pa", 3, id["strengthStrong"]!],
    ["ha", 2, id["strengthFair"]!],
    ["ya", 1, id["strengthNew"]!],
    ["na", 4, id["strengthStrong"]!],
  ] as const;
  const sage = await tokenColor(page, "--color-sage");
  for (const [i, [glyphId, filled, label]] of expected.entries()) {
    const row = rows.nth(i);
    await expect(
      row.getByRole("img", {
        name: id["aksaraName"]!.replace("{reading}", reading(glyphId)),
      }),
    ).toBeVisible();
    await expect(row).toContainText(reading(glyphId));
    await expect(row).toContainText(label);
    await expect(row).toContainText(
      id["strengthSegments"]!.replace("{filled}", String(filled)),
    );
    const segments = await row
      .locator(".strength-bar > *")
      .evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).backgroundColor),
      );
    expect(segments).toHaveLength(4);
    expect(segments.filter((c) => c === sage)).toHaveLength(filled);
    expect(segments.slice(0, filled).every((c) => c === sage)).toBe(true);
  }
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await shoot(page, "strength");
});

test("[P-R07] opening Ulangi re-queries: a persisted retry and a newly due card appear", async ({
  page,
}) => {
  await openReview(page, {
    srs: [fresh("ha", NOW - HOUR), fresh("ca", NOW + 5 * MINUTE)],
  });
  await expect(
    today(page).getByRole("heading", { level: 2, name: dueCount(1) }),
  ).toBeVisible();
  await startButton(page).click();
  await answerReviewQuestion(page, solver, "wrong");
  await quizButton(page, id["closeButton"]!).click();
  await page.getByRole("link", { name: id["navLadder"]! }).click();
  await expect(page.locator(".ladder")).toBeVisible();
  await page.clock.fastForward("10:00");
  await page.getByRole("link", { name: id["navReview"]! }).click();
  await expect(
    today(page).getByRole("heading", { level: 2, name: dueCount(2) }),
  ).toBeVisible();
});

test("[P-R07] resuming the page re-queries without a tab switch", async ({
  page,
}) => {
  await openReview(page, {
    srs: [fresh("ha", NOW - HOUR), fresh("ca", NOW + 30 * MINUTE)],
  });
  await expect(
    today(page).getByRole("heading", { level: 2, name: dueCount(1) }),
  ).toBeVisible();
  await page.clock.fastForward("30:00");
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(
    today(page).getByRole("heading", { level: 2, name: dueCount(2) }),
  ).toBeVisible();
});

test("[P-R07] a card graded good in the quiz comes back as due the next day", async ({
  page,
}) => {
  // A card needs a second stored card to be asked against.
  await openReview(page, {
    srs: [fresh("ha", NOW - HOUR), fresh("ca", NOW + 7 * DAY)],
  });
  await startButton(page).click();
  await answerReviewQuestion(page, solver, "right");
  await quizButton(page, id["continueButton"]!).click();
  await page.locator(".quiz-done .bar").getByRole("button").click();
  await expect(
    today(page).getByRole("heading", { level: 2, name: id["reviewEmpty"]! }),
  ).toBeVisible();
  await page.clock.fastForward("24:00:00");
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  await expect(
    today(page).getByRole("heading", { level: 2, name: dueCount(1) }),
  ).toBeVisible();
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
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "drill-feedback");
});

test("[P-R11] a mistake made in a lesson surfaces the drill without a reload", async ({
  page,
}) => {
  const units = solver.content.units;
  const firstGlyphs = new Set(units[0]!.glyphs);
  const wuluSuku = units[1]!;
  // Pin the lesson seed to one whose plan puts the partner among the aksara
  // options. Sound options cannot log: a partner's sound ("u") resolves to
  // the swara entry before it reaches the sandhangan one.
  const pinned = Array.from({ length: 500 }, (_, i) => i / 500).find((r) =>
    generateExercises({
      unit: wuluSuku,
      taughtGlyphs: firstGlyphs,
      corpus: solver.content.words,
      seed: Math.floor(r * 0x7fffffff),
      glyphInfo: solver.table,
    }).some((e) => {
      if (e.kind !== "soundToGlyph" || e.glyphId !== "wulu") return false;
      return e.options.includes(info("suku").char);
    }),
  );
  expect(pinned).toBeDefined();
  await page.addInitScript((value) => {
    Math.random = () => value;
  }, pinned!);
  await page.clock.install({ time: NOW });
  await gotoRoute(page, "#/review");
  await expect(page.getByText(id["reviewEmpty"]!)).toBeVisible();

  const play = async (unitId: string, wrongOnWulu: boolean) => {
    await page.evaluate((hash) => {
      location.hash = hash;
    }, `#/lesson/${unitId}`);
    let logged = false;
    await playLesson(page, solver, unitId, {
      navigate: false,
      onQuestion: async (p, { prompt, options }) => {
        const sukuIndex = solver.targetIds(prompt).includes("wulu")
          ? solver.optionFor("suku", prompt, options)
          : -1;
        let index = solver.correctIndex(prompt, options);
        if (wrongOnWulu && !logged && "sound" in prompt && sukuIndex >= 0) {
          index = sukuIndex;
          logged = true;
        }
        await p.locator(".lesson .answers button").nth(index).click();
        await expect(p.locator(".lesson").getByRole("status")).toBeVisible();
      },
    });
    if (wrongOnWulu) expect(logged).toBe(true);
  };

  // The done view and the top bar both carry a "Kembali" button; click the
  // done view's own button once it is shown, as lessons.spec.ts does.
  const backFromDone = async () => {
    await expect(page.locator(".lesson-done")).toBeVisible();
    await page.locator(".lesson-done .bar").getByRole("button").click();
  };

  await play(units[0]!.id, false);
  await backFromDone();
  await play(units[1]!.id, true);
  await backFromDone();
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

  test("[P-L04] the Today card, the strength rows and the help are English", async ({
    page,
  }) => {
    // A card needs a second stored card to be asked against.
    await openReview(page, {
      srs: [fresh("ha", NOW - HOUR), fresh("ca", NOW + 7 * DAY)],
    });
    await expect(
      page.getByRole("heading", { level: 1, name: en["reviewTitle"]! }),
    ).toBeVisible();
    await expect(today(page)).toContainText(en["reviewTodayLabel"]!);
    await expect(
      today(page).getByRole("heading", { level: 2, name: dueCount(1, en) }),
    ).toBeVisible();
    await expect(startButton(page, en)).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: en["strengthHeading"]! }),
    ).toBeVisible();
    await expect(strengthRows(page).first()).toContainText(en["strengthNew"]!);
    await expect(strengthRows(page).first()).toContainText(
      en["strengthSegments"]!.replace("{filled}", "1"),
    );
    await expectAccessible(page);

    await startButton(page, en).click();
    await expect(
      page.locator(".quiz").getByRole("button", { name: en["closeButton"]! }),
    ).toBeVisible();
    await expectAccessible(page);

    await gotoRoute(page, "#/review-help");
    await expect(page.locator("main .surface:visible").nth(1)).toContainText(
      en["reviewHelpRight"]!,
    );
  });
});
