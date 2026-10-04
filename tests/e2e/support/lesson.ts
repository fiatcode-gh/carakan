import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { DB_NAME } from "../../../src/core/db/schema.ts";
import { gotoRoute } from "./app.ts";
import type { QuestionPrompt, Solver } from "./solver.ts";

export const id = JSON.parse(
  readFileSync("src/l10n/id.json", "utf8"),
) as Record<string, string>;

const continueButton = (page: Page, messages: Record<string, string> = id) =>
  page.getByRole("button", { name: messages["continueButton"]! });

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

/** Walks the meet-the-glyphs cards of a lesson, one Continue each. */
export async function walkMeet(
  page: Page,
  glyphs: number,
  messages: Record<string, string> = id,
): Promise<void> {
  for (let i = 0; i < glyphs; i++) {
    await expect(page.locator(".lesson .chip--count")).toHaveText(
      `${i + 1}/${glyphs}`,
    );
    await continueButton(page, messages).click();
  }
}

/** Answers questions until one is shown; returns after answering it right. */
export async function answerCurrentQuestion(
  page: Page,
  solver: Solver,
): Promise<Question> {
  const q = await readQuestion(page);
  const index = solver.correctIndex(q.prompt, q.options);
  await page.locator(".options button").nth(index).click();
  await page.locator(".feedback").waitFor();
  return q;
}

/** Plays a whole lesson, right answers only, ending on the done view. */
export async function completeLesson(
  page: Page,
  solver: Solver,
  unitId: string,
  messages: Record<string, string> = id,
): Promise<void> {
  await gotoRoute(page, `#/lesson/${unitId}`);
  await expect(page.locator(".lesson")).toBeVisible();
  const unit = solver.content.units.find((u) => u.id === unitId);
  if (unit === undefined) throw new Error(`no unit ${unitId}`);
  await walkMeet(page, unit.glyphs.length, messages);
  for (;;) {
    const q = await answerCurrentQuestion(page, solver);
    await continueButton(page, messages).click();
    if (q.number === q.total) break;
  }
  await expect(page.locator(".trophy")).toBeVisible();
}

export const ladderRow = (page: Page, n: number) =>
  page
    .locator(".ladder > li")
    .nth(n - 1)
    .locator("button.unit");

export async function readStore<T>(page: Page, store: string): Promise<T[]> {
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
