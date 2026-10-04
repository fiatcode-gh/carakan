import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { Unit } from "../../src/content/unit.ts";
import {
  DB_NAME,
  MISTAKE_LOGS,
  SRS_ITEMS,
  UNIT_COMPLETIONS,
  type MistakeLogRow,
  type SrsItemRow,
  type UnitCompletionRow,
} from "../../src/core/db/schema.ts";
import { generateExercises } from "../../src/features/lessons/exercise-generator.ts";
import { ladderPreview } from "../../src/features/lessons/ladder.ts";
import {
  expectAccessible,
  expectNoHorizontalOverflow,
  expectTouchTargets,
} from "./support/a11y.ts";
import { gotoRoute } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";
import { answerCurrentQuestion } from "./support/lesson.ts";
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

const fmt = (template: string, params: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, name: string) => String(params[name]));

let solver: Solver;
test.beforeAll(async () => {
  solver = await createSolver();
});

const unit = (unitId: string): Unit => {
  const found = solver.content.units.find((u) => u.id === unitId);
  if (found === undefined) throw new Error(`no unit ${unitId}`);
  return found;
};

/** axe reads colors mid-fade otherwise: wait for every entrance animation. */
const settle = (page: Page) =>
  page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );

const shoot = (page: Page, name: string) =>
  page.screenshot({ path: `test-results/belajar-${name}.png` });

interface Question {
  number: number;
  total: number;
  prompt: QuestionPrompt;
  options: string[];
}

async function readQuestion(page: Page): Promise<Question> {
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
  return { number, total, prompt, options: texts };
}

const continueButton = (page: Page) =>
  page.getByRole("button", { name: id["continueButton"]! });

async function walkMeet(page: Page, glyphs: number): Promise<void> {
  for (let i = 0; i < glyphs; i++) {
    await expect(page.locator(".lesson .chip--count")).toHaveText(
      `${i + 1}/${glyphs}`,
    );
    await continueButton(page).click();
  }
}

async function openLesson(page: Page, unitId: string): Promise<void> {
  await gotoRoute(page, `#/lesson/${unitId}`);
  await expect(page.locator(".lesson")).toBeVisible();
}

/** Plays a whole lesson, right answers only, ending on the done view. */
async function completeLesson(page: Page, unitId: string): Promise<void> {
  await openLesson(page, unitId);
  await walkMeet(page, unit(unitId).glyphs.length);
  for (;;) {
    const q = await readQuestion(page);
    const index = solver.correctIndex(q.prompt, q.options);
    await page.locator(".options button").nth(index).click();
    await page.locator(".feedback").waitFor();
    await continueButton(page).click();
    if (q.number === q.total) break;
  }
  await expect(page.locator(".trophy")).toBeVisible();
}

async function readStore<T>(page: Page, store: string): Promise<T[]> {
  return page.evaluate(
    async ({ name, storeName }) => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      return new Promise<unknown[]>((resolve, reject) => {
        const request = db
          .transaction(storeName)
          .objectStore(storeName)
          .getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    },
    { name: DB_NAME, storeName: store },
  ) as Promise<T[]>;
}

const row = (page: Page, n: number) => page.locator(".ladder > li").nth(n - 1);
const rowButton = (page: Page, n: number) =>
  row(page, n).locator("button.unit");

test("[P-B01] the ladder lists the 8 units in order with numbered medallions and names", async ({
  page,
}) => {
  await gotoRoute(page, "");
  await expect(
    page.getByRole("heading", { level: 1, name: id["navLadder"]! }),
  ).toBeVisible();
  const rows = page.locator(".ladder > li");
  await expect(rows).toHaveCount(8);
  expect(solver.content.units).toHaveLength(8);
  for (const [i, u] of solver.content.units.entries()) {
    await expect(row(page, i + 1).locator(".medallion")).toContainText(
      String(i + 1),
    );
    await expect(row(page, i + 1).locator(".unit__name")).toContainText(u.name);
  }
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "ladder");
});

test("[P-B02][P-S07] each unit previews its first five glyphs in Jejeg", async ({
  page,
}) => {
  await gotoRoute(page, "");
  for (const [i, u] of solver.content.units.entries()) {
    const expected = ladderPreview(u, solver.table);
    expect(expected).not.toBe("");
    await expect(row(page, i + 1).locator(".aksara")).toHaveText(expected);
  }
  const ha = solver.table.byId.get("ha")!.char;
  await expect
    .poll(() =>
      page.evaluate((char) => document.fonts.check("32px Jejeg", char), ha),
    )
    .toBe(true);
  await expect(row(page, 1).locator(".aksara")).toHaveCSS(
    "font-family",
    /Jejeg/,
  );
});

test("[P-B03] on a fresh install only unit 1 is ready", async ({ page }) => {
  await gotoRoute(page, "");
  await expect(rowButton(page, 1)).toContainText(id["unitStatusReady"]!);
  await expect(rowButton(page, 1)).not.toHaveAttribute("aria-disabled", "true");
  for (let n = 2; n <= 8; n++) {
    await expect(rowButton(page, n)).toContainText(id["unitStatusLocked"]!);
    await expect(rowButton(page, n)).toHaveAttribute("aria-disabled", "true");
  }
});

test("[P-B04] a locked row does nothing; a ready row opens its lesson", async ({
  page,
}) => {
  await gotoRoute(page, "");
  // Playwright treats aria-disabled as not actionable; a real tap still lands.
  await rowButton(page, 2).click({ force: true });
  await rowButton(page, 8).click({ force: true });
  expect(new URL(page.url()).hash).toBe("#/");
  await rowButton(page, 1).click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/lesson/u1");
  await expect(page.locator(".lesson")).toBeVisible();
});

test("[P-B06][P-B07] the teacher button opens the teacher page with both cards", async ({
  page,
}) => {
  await gotoRoute(page, "");
  await page.getByRole("link", { name: id["teacherTitle"]! }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/teacher");
  await expect(
    page.getByRole("heading", { level: 1, name: id["teacherTitle"]! }),
  ).toBeVisible();
  const slips = page.locator("main .slip");
  await expect(slips).toHaveCount(2);
  await expect(slips.nth(0).getByRole("heading")).toHaveText(
    id["deviationTitle"]!,
  );
  await expect(slips.nth(0)).toContainText(id["deviationBody"]!);
  await expect(slips.nth(1).getByRole("heading")).toHaveText(
    id["unitOrderHeading"]!,
  );
  const list = slips.nth(1).locator("p");
  await expect(list).toHaveCSS("white-space", "pre-line");
  expect(await list.evaluate((el) => (el as HTMLElement).innerText)).toBe(
    id["unitOrderBody"]!,
  );
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
});

test("[P-B08] the meet phase walks every glyph of unit 1", async ({ page }) => {
  await openLesson(page, "u1");
  await expect(
    page.getByRole("heading", { level: 1, name: id["lessonTitle"]! }),
  ).toBeVisible();
  const u1 = unit("u1");
  for (const [i, glyphId] of u1.glyphs.entries()) {
    const info = solver.table.byId.get(glyphId)!;
    await expect(page.locator(".lesson .chip--count")).toHaveText(
      `${i + 1}/${u1.glyphs.length}`,
    );
    await expect(page.locator(".flashcard .aksara")).toHaveText(info.char);
    await expect(page.locator(".flashcard__name")).toHaveText(info.name);
    await expect(page.locator(".flashcard .chip")).toHaveText(
      `${id["soundLabel"]!} · ${info.pujl}`,
    );
    if (i === 0) {
      await settle(page);
      await expectAccessible(page);
      await expectTouchTargets(page);
      await expectNoHorizontalOverflow(page);
      await shoot(page, "meet");
    }
    await continueButton(page).click();
  }
  await expect(page.locator(".progress")).toBeVisible();
});

test("[P-B11] the question view shows the progress, a prompt card and one button per option", async ({
  page,
}) => {
  await openLesson(page, "u1");
  await walkMeet(page, 5);
  const q = await readQuestion(page);
  expect(q.number).toBe(1);
  expect(q.total).toBe(5);
  await expect(page.locator(".kicker")).toHaveText(
    fmt(id["questionProgress"]!, { number: 1, total: 5 }),
  );
  expect(q.options).toHaveLength(4);
  expect(new Set(q.options).size).toBe(4);
  await expect(page.locator(".options button")).toHaveCount(4);
  // Unit 1 starts with the first question as glyph to sound.
  expect(q.prompt).toHaveProperty("glyph");
  await expect(page.locator(".options")).not.toHaveClass(/options--grid/);
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "question");

  await page
    .locator(".options button")
    .nth(solver.correctIndex(q.prompt, q.options))
    .click();
  await continueButton(page).click();
  const second = await readQuestion(page);
  expect(second.prompt).toHaveProperty("sound");
  await expect(page.locator(".options")).toHaveClass(/options--grid/);
  expect(second.options).toHaveLength(4);
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "question-sound");
});

test("[P-B12] feedback shows right and wrong answers; the last question gets feedback too (W05)", async ({
  page,
}) => {
  await openLesson(page, "u1");
  await walkMeet(page, 5);

  // Right answer on the first question.
  let q = await readQuestion(page);
  const right = solver.correctIndex(q.prompt, q.options);
  await page.locator(".options button").nth(right).click();
  const status = page.getByRole("status");
  await expect(status).toHaveText(id["answerCorrect"]!);
  await expect(status).toHaveClass(/feedback--correct/);
  await expect(page.locator(".options button.is-correct")).toHaveCount(1);
  await expect(page.locator(".options button.is-wrong")).toHaveCount(0);
  await expect(page.locator(".options button.is-correct")).toHaveText(
    q.options[right]!,
  );
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "feedback-correct");
  await continueButton(page).click();

  // Wrong answer on the second.
  q = await readQuestion(page);
  const correct = solver.correctIndex(q.prompt, q.options);
  const wrong = (correct + 1) % q.options.length;
  await page.locator(".options button").nth(wrong).click();
  await expect(status).toHaveText(id["answerWrong"]!);
  await expect(status).toHaveClass(/feedback--wrong/);
  await expect(page.locator(".options button.is-wrong")).toHaveCount(1);
  await expect(page.locator(".options button.is-wrong")).toHaveText(
    q.options[wrong]!,
  );
  await expect(page.locator(".options button.is-correct")).toHaveText(
    q.options[correct]!,
  );
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "feedback-wrong");
  await continueButton(page).click();

  // Answer through to the last question: feedback first, done after Continue.
  for (;;) {
    q = await readQuestion(page);
    await page
      .locator(".options button")
      .nth(solver.correctIndex(q.prompt, q.options))
      .click();
    await expect(status).toHaveText(id["answerCorrect"]!);
    if (q.number === q.total) break;
    await continueButton(page).click();
  }
  await expect(page.locator(".trophy")).toHaveCount(0);
  expect(await readStore<UnitCompletionRow>(page, UNIT_COMPLETIONS)).toEqual(
    [],
  );
  await continueButton(page).click();
  await expect(page.locator(".trophy")).toBeVisible();
});

test("[P-B14] the done view reports the score and Back returns to the ladder; the unit is saved and its glyphs queued", async ({
  page,
}) => {
  await completeLesson(page, "u1");
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: fmt(id["lessonDone"]!, { correct: 5, total: 5 }),
    }),
  ).toBeVisible();
  await settle(page);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "done");

  const completions = await readStore<UnitCompletionRow>(
    page,
    UNIT_COMPLETIONS,
  );
  expect(completions.map((r) => r.unitId)).toEqual(["u1"]);
  const queued = await readStore<SrsItemRow>(page, SRS_ITEMS);
  expect(queued.map((r) => r.itemId).sort()).toEqual(
    [...unit("u1").glyphs].sort(),
  );

  await page.locator(".lesson__foot").getByRole("button").click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/");
  await expect(page.locator(".ladder")).toBeVisible();
});

test("[P-B05] after a lesson the ladder shows unit 1 completed and unit 2 ready without a reload", async ({
  page,
}) => {
  await gotoRoute(page, "");
  await rowButton(page, 1).click();
  await expect(page.locator(".lesson")).toBeVisible();
  await walkMeet(page, 5);
  for (;;) {
    const q = await readQuestion(page);
    await page
      .locator(".options button")
      .nth(solver.correctIndex(q.prompt, q.options))
      .click();
    await continueButton(page).click();
    if (q.number === q.total) break;
  }
  await page.locator(".lesson__foot").getByRole("button").click();
  await expect(page.locator(".ladder")).toBeVisible();
  await expect(rowButton(page, 1)).toContainText(id["unitStatusCompleted"]!);
  await expect(rowButton(page, 2)).toContainText(id["unitStatusReady"]!);
  await expect(rowButton(page, 2)).not.toHaveAttribute("aria-disabled", "true");
  await expect(rowButton(page, 3)).toHaveAttribute("aria-disabled", "true");
  // A completed unit can be replayed.
  await rowButton(page, 1).click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/lesson/u1");
});

test("[P-B13] a wrong answer that picks the confusion-pair partner is logged once", async ({
  page,
}) => {
  const u1Glyphs = new Set(unit("u1").glyphs);
  const u2 = unit("u2");
  const partnerOf = (glyphId: string) => (glyphId === "wulu" ? "suku" : "wulu");
  // Pin the lesson seed to one whose plan puts the partner among the options.
  const pinned = Array.from({ length: 500 }, (_, i) => i / 500).find((r) =>
    generateExercises({
      unit: u2,
      taughtGlyphs: u1Glyphs,
      corpus: solver.content.words,
      seed: Math.floor(r * 0x7fffffff),
      glyphInfo: solver.table,
    }).some((e) => {
      if (e.kind === "wordReading") return false;
      const partner = solver.table.byId.get(partnerOf(e.glyphId))!;
      return e.options.includes(
        e.kind === "glyphToSound" ? partner.pujl : partner.char,
      );
    }),
  );
  expect(pinned).toBeDefined();
  await page.addInitScript((value) => {
    Math.random = () => value;
  }, pinned!);

  await completeLesson(page, "u1");
  await openLesson(page, "u2");
  await walkMeet(page, 2);

  let logged = false;
  for (;;) {
    const q = await readQuestion(page);
    const targets = solver
      .targetIds(q.prompt)
      .filter((t) => t === "wulu" || t === "suku");
    const partnerIndex =
      targets
        .map((t) => solver.optionFor(partnerOf(t), q.prompt, q.options))
        .find((i) => i >= 0) ?? -1;
    if (!logged && partnerIndex >= 0) {
      await page.locator(".options button").nth(partnerIndex).click();
      await expect(page.getByRole("status")).toHaveText(id["answerWrong"]!);
      logged = true;
    } else {
      await page
        .locator(".options button")
        .nth(solver.correctIndex(q.prompt, q.options))
        .click();
      await expect(page.getByRole("status")).toHaveText(id["answerCorrect"]!);
    }
    if (q.number === q.total) break;
    await continueButton(page).click();
  }
  expect(logged).toBe(true);
  const rows = await readStore<MistakeLogRow>(page, MISTAKE_LOGS);
  expect(rows.map((r) => [r.confusionPair, r.count])).toEqual([
    ["suku-wulu", 1],
  ]);
});

test("[P-B15] meet to question transitions animate, and not under reduced motion", async ({
  page,
}) => {
  const running = () =>
    page.evaluate(
      () =>
        document.getAnimations().filter((a) => a.playState === "running")
          .length,
    );
  await openLesson(page, "u1");
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await continueButton(page).click();
  expect(await running(), "animation after a transition").toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  for (let i = 0; i < 4; i++) await continueButton(page).click();
  await page.locator(".progress").waitFor();
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  expect(await running(), "animation under reduced motion").toBe(0);
});

test("[P-B16] a locked or unknown lesson deep link lands on the ladder", async ({
  page,
}) => {
  await gotoRoute(page, "#/lesson/u3");
  await expect.poll(() => new URL(page.url()).hash).toBe("#/");
  await expect(page.locator(".ladder")).toBeVisible();
  await gotoRoute(page, "#/lesson/nope");
  await expect.poll(() => new URL(page.url()).hash).toBe("#/");
  await expect(page.locator(".ladder")).toBeVisible();
});

test.describe("English interface", () => {
  test.use({ locale: "en-US" });

  test("[P-L03][P-L04] chrome is English and unit names stay Indonesian", async ({
    page,
  }) => {
    await gotoRoute(page, "");
    await expect(
      page.getByRole("heading", { level: 1, name: en["navLadder"]! }),
    ).toBeVisible();
    await expect(rowButton(page, 1)).toContainText(en["unitStatusReady"]!);
    await expect(rowButton(page, 2)).toContainText(en["unitStatusLocked"]!);
    for (const [i, u] of solver.content.units.entries()) {
      await expect(row(page, i + 1).locator(".unit__name")).toContainText(
        u.name,
      );
    }
    await settle(page);
    await expectAccessible(page);

    await page.getByRole("link", { name: en["teacherTitle"]! }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: en["deviationTitle"]! }),
    ).toBeVisible();
    await page.goBack();

    await rowButton(page, 1).click();
    const info = solver.table.byId.get("ha")!;
    await expect(page.locator(".flashcard .chip")).toHaveText(
      `${en["soundLabel"]!} · ${info.pujl}`,
    );
    await expect(page.locator(".flashcard__name")).toHaveText(info.name);
    await expect(
      continueButton(page).or(
        page.getByRole("button", { name: en["continueButton"]! }),
      ),
    ).toBeVisible();
    await page.getByRole("button", { name: en["continueButton"]! }).click();
    await settle(page);
    await expectAccessible(page);
  });
});

test("[P-A11Y] focus stays in the lesson after every step instead of falling to the body", async ({
  page,
}) => {
  const body = () =>
    page.evaluate(() => document.activeElement === document.body);
  const proceed = page.getByRole("button", { name: id["continueButton"]! });
  await gotoRoute(page, "#/lesson/u1");
  const glyphs = unit("u1").glyphs.length;

  // Each meet card puts focus on Continue.
  for (let i = 0; i < glyphs; i++) {
    await expect(page.locator(".lesson .chip--count")).toHaveText(
      `${i + 1}/${glyphs}`,
    );
    if (i > 0) await expect(proceed).toBeFocused();
    await proceed.click();
  }

  // A new question focuses its first option; an answer focuses the feedback.
  await expect(page.locator(".options button").first()).toBeFocused();
  await answerCurrentQuestion(page, solver);
  await expect(page.locator(".feedback")).toBeFocused();
  expect(await body()).toBe(false);
  await proceed.click();
  await expect(page.locator(".options button").first()).toBeFocused();

  // Finish the lesson: the done heading takes focus.
  for (;;) {
    const q = await answerCurrentQuestion(page, solver);
    await proceed.click();
    if (q.number === q.total) break;
  }
  await expect(page.locator(".done__title")).toBeFocused();
});
