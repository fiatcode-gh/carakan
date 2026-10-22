import { expect, type Page } from "@playwright/test";
import type { QuestionPrompt, Solver } from "./solver.ts";

export interface ReviewQuestion {
  prompt: QuestionPrompt;
  options: string[];
}

/** Reads the open review question; the quiz is a pushed page, so `.quiz` is unique. */
export async function readReviewQuestion(page: Page): Promise<ReviewQuestion> {
  const quiz = page.locator(".quiz");
  const options = quiz.locator(".answers button:not([disabled])");
  await options.first().waitFor();
  const glyph = (
    (await quiz.locator(".quiz__prompt .aksara").textContent()) ?? ""
  ).trim();
  const texts = (await options.allTextContents()).map((s) => s.trim());
  return { prompt: { glyph }, options: texts };
}

/** Answers the open review question and waits for its feedback. */
export async function answerReviewQuestion(
  page: Page,
  solver: Solver,
  how: "right" | "wrong",
): Promise<ReviewQuestion> {
  const question = await readReviewQuestion(page);
  const right = solver.correctIndex(question.prompt, question.options);
  const index = how === "right" ? right : (right + 1) % question.options.length;
  await page.locator(".quiz .answers button").nth(index).click();
  await expect(page.locator(".quiz .feedback-row")).toBeVisible();
  return question;
}
