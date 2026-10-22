import { expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { DB_NAME } from "../../../src/core/db/schema.ts";
import { gotoRoute } from "./app.ts";
import type { QuestionPrompt, Solver } from "./solver.ts";

export const id = JSON.parse(
  readFileSync("src/l10n/id.json", "utf8"),
) as Record<string, string>;

export const continueButton = (
  page: Page,
  messages: Record<string, string> = id,
) => page.getByRole("button", { name: messages["continueButton"]! });

export interface Question {
  number: number;
  total: number;
  prompt: QuestionPrompt;
  options: string[];
}

/** Reads the open question; scoped to `.lesson` (hidden tabs stay mounted). */
export async function readQuestion(page: Page): Promise<Question> {
  const lesson = page.locator(".lesson");
  const options = lesson.locator(".options button:not([disabled])");
  await options.first().waitFor();
  const bar = lesson.getByRole("progressbar");
  const number = Number(await bar.getAttribute("aria-valuenow"));
  const total = Number(await bar.getAttribute("aria-valuemax"));
  const sound = lesson.locator(".prompt__sound");
  const prompt: QuestionPrompt =
    (await sound.count()) > 0
      ? { sound: ((await sound.textContent()) ?? "").trim() }
      : {
          glyph: (
            (await lesson.locator(".flashcard .aksara").textContent()) ?? ""
          ).trim(),
        };
  const texts = (await options.allTextContents()).map((s) => s.trim());
  return { number, total, prompt, options: texts };
}

/** Answers questions until one is shown; returns after answering it right. */
export async function answerCurrentQuestion(
  page: Page,
  solver: Solver,
): Promise<Question> {
  const q = await readQuestion(page);
  const index = solver.correctIndex(q.prompt, q.options);
  await page.locator(".lesson .options button").nth(index).click();
  await page.locator(".lesson .feedback").waitFor();
  return q;
}

type LessonView = "meet" | "trace" | "question" | "feedback" | "done";

const viewSelectors: Record<LessonView, string> = {
  meet: ".lesson .chip--count",
  trace: ".lesson .trace",
  question: ".lesson .options button:not([disabled])",
  feedback: ".lesson .feedback",
  done: ".lesson .trophy",
};

/** Waits for a lesson view to be on screen and says which one it is. */
async function currentView(page: Page): Promise<LessonView> {
  const views = Object.keys(viewSelectors) as LessonView[];
  const any = views
    .map((v) => page.locator(viewSelectors[v]))
    .reduce((a, b) => a.or(b));
  await any.first().waitFor();
  for (const view of [
    "done",
    "feedback",
    "trace",
    "question",
    "meet",
  ] as const) {
    if (await page.locator(viewSelectors[view]).first().isVisible())
      return view;
  }
  throw new Error("no lesson view is visible");
}

interface PlayOptions {
  messages?: Record<string, string>;
  /** Answers a question; defaults to the right answer. Must pick an option. */
  onQuestion?: (page: Page, question: Question) => Promise<void>;
  /** Open `#/lesson/<unitId>` first; false when the lesson is already open. */
  navigate?: boolean;
}

/**
 * Steps through whatever the lesson shows until `stop` is on screen: meet →
 * its primary button, trace → Skip, question → answered, feedback → Continue.
 */
async function playUntil(
  page: Page,
  solver: Solver,
  stop: "question" | "done",
  { messages = id, onQuestion }: PlayOptions,
): Promise<void> {
  for (;;) {
    const view = await currentView(page);
    if (view === stop) return;
    // Every step re-creates `.lesson`; the old one must be gone before the
    // next look, or a slow step (the completion write) is acted on twice.
    const step = await page.locator(".lesson").first().elementHandle();
    if (view === "meet") {
      await page.locator(".lesson__foot button").click();
    } else if (view === "trace") {
      await page.getByRole("button", { name: messages["traceSkip"]! }).click();
    } else if (view === "question") {
      if (onQuestion === undefined) {
        await answerCurrentQuestion(page, solver);
      } else {
        await onQuestion(page, await readQuestion(page));
        await page.locator(".lesson .feedback").waitFor();
      }
      continue;
    } else if (view === "feedback") {
      await continueButton(page, messages).click();
    }
    await page.waitForFunction((el) => !el?.isConnected, step);
  }
}

/** Meets (and skips tracing) glyphs until the first question is on screen. */
export async function advanceToQuestion(
  page: Page,
  solver: Solver,
  messages: Record<string, string> = id,
): Promise<void> {
  await playUntil(page, solver, "question", { messages });
}

/** Plays a whole lesson, right answers only, ending on the done view. */
export async function playLesson(
  page: Page,
  solver: Solver,
  unitId: string,
  options: PlayOptions = {},
): Promise<void> {
  if (options.navigate !== false) {
    await gotoRoute(page, `#/lesson/${unitId}`);
  }
  await expect(page.locator(".lesson")).toBeVisible();
  await playUntil(page, solver, "done", options);
  await expect(page.locator(".trophy")).toBeVisible();
}

/** Plays a whole lesson, right answers only, ending on the done view. */
export async function completeLesson(
  page: Page,
  solver: Solver,
  unitId: string,
  messages: Record<string, string> = id,
): Promise<void> {
  await playLesson(page, solver, unitId, { messages });
}

export const unitButton = (page: Page, unitId: string) =>
  page.locator(`button[data-unit="${unitId}"][data-status]`);

export async function writeRows(
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
