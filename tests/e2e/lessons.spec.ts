import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { Unit } from "../../src/content/unit.ts";
import {
  MISTAKE_LOGS,
  SRS_ITEMS,
  UNIT_COMPLETIONS,
  type MistakeLogRow,
  type SrsItemRow,
  type UnitCompletionRow,
} from "../../src/core/db/schema.ts";
import { kajRulesetId } from "../../src/engine/index.ts";
import {
  generateExercises,
  type Exercise,
} from "../../src/features/lessons/exercise-generator.ts";
import { groupByGlyph } from "../../src/features/lessons/lesson-session.ts";
import {
  splitUnitName,
  unitWatermark,
} from "../../src/features/lessons/unit-display.ts";
import {
  expectAccessible,
  expectNoHorizontalOverflow,
  expectTouchTargets,
  settle,
} from "./support/a11y.ts";
import { gotoRoute } from "./support/app.ts";
import { expect, test } from "./support/fixtures.ts";
import {
  advanceToQuestion,
  answerCurrentQuestion,
  completeLesson,
  continueButton,
  playLesson,
  readQuestion,
  readStore,
  unitButton,
  writeRows,
} from "./support/lesson.ts";
import { createSolver, type Solver } from "./support/solver.ts";

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
  solver = await createSolver(kajRulesetId);
});

const unit = (unitId: string): Unit => {
  const found = solver.content.units.find((u) => u.id === unitId);
  if (found === undefined) throw new Error(`no unit ${unitId}`);
  return found;
};

const first = (): Unit => solver.content.units[0]!;
const wuluSuku = (): Unit => solver.content.units[1]!;

const shoot = (page: Page, name: string) =>
  page.screenshot({ path: `test-results/belajar-${name}.png` });

const pinSeed = async (
  page: Page,
  target: Unit,
  accept: (plan: Exercise[]) => boolean,
): Promise<void> => {
  const pinned = Array.from({ length: 500 }, (_, i) => i / 500).find((r) =>
    accept(
      groupByGlyph(
        generateExercises({
          unit: target,
          taughtGlyphs: new Set(),
          corpus: solver.content.words,
          seed: Math.floor(r * 0x7fffffff),
          glyphInfo: solver.table,
        }),
        target.glyphs,
      ),
    ),
  );
  expect(pinned).toBeDefined();
  await page.addInitScript((value) => {
    Math.random = () => value;
  }, pinned!);
};

async function openLesson(page: Page, unitId: string): Promise<void> {
  await gotoRoute(page, `#/lesson/${unitId}`);
  await expect(page.locator(".lesson")).toBeVisible();
}

const rowButton = (page: Page, n: number) =>
  unitButton(page, solver.content.units[n - 1]!.id);
const tiles = (page: Page) => page.locator(".ladder ul button[data-unit]");

test("[P-B01] the hero is unit 1 and the tiles list units 2-9 in order, numbered and locked", async ({
  page,
}) => {
  await gotoRoute(page, "");
  await expect(
    page.getByRole("heading", { level: 1, name: id["ladderTitle"]! }),
  ).toBeVisible();
  const units = solver.content.units;
  expect(units).toHaveLength(9);

  const hero = page.locator(".hero");
  await expect(hero).toHaveCount(1);
  await expect(hero.locator(".eyebrow")).toHaveText("01 — Kelompok 1");
  await expect(hero.locator("button[data-unit]")).toHaveAttribute(
    "data-unit",
    units[0]!.id,
  );
  await expect(hero.getByRole("button")).toHaveAccessibleName(
    `${id["startLessonButton"]!} ${units[0]!.name}`,
  );

  await expect(hero.getByRole("heading", { level: 2 })).toHaveText(
    splitUnitName(units[0]!.name).tail,
  );
  await expect(
    page.getByRole("heading", { level: 2, name: id["ladderNext"]! }),
  ).toBeVisible();
  const list = tiles(page);
  await expect(list).toHaveCount(units.length - 1);
  for (const [i, u] of units.slice(1).entries()) {
    const tile = list.nth(i);
    await expect(tile).toHaveAttribute("data-unit", u.id);
    await expect(tile).toHaveAttribute("data-status", "locked");
    await expect(tile.locator(".tile__number")).toHaveText(
      String(i + 2).padStart(2, "0"),
    );
    await expect(tile.locator("svg")).toHaveAttribute("data-icon", "lock");
    await expect(tile).toHaveAccessibleName(
      `${i + 2}. ${u.name}, ${id["unitStatusLocked"]!}`,
    );
  }
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "ladder");
});

test("[P-B01] the note counts the base letters learned: 0 / 20 fresh, 3 / 20 after unit 1", async ({
  page,
}) => {
  await gotoRoute(page, "");
  const note = page.locator(".top-bar__note:visible");
  await expect(note).toHaveText("0 / 20 aksara");
  await writeRows(page, UNIT_COMPLETIONS, [
    { unitId: first().id, completedAt: 1 },
  ]);
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  await expect(note).toHaveText("3 / 20 aksara");
});

test("[P-B01] every Learn card's tape sticks out above its top edge, clear of other cards and of the number, status or title, and its watermark stays cropped", async ({
  page,
}) => {
  await gotoRoute(page, "");
  await settle(page);
  const cards = page.locator(".hero, .tile");
  expect(await cards.count()).toBe(solver.content.units.length);
  const variants = new Set<string>();
  for (const card of await cards.all()) {
    await card.evaluate((el) => el.scrollIntoView({ block: "center" }));
    const tape = card.locator(".tape");
    const box = (await card.boundingBox())!;
    const strip = (await tape.boundingBox())!;
    variants.add(
      `${Math.round(strip.width)}:${Math.round(strip.x - box.x)}:${Math.round(strip.y - box.y)}`,
    );
    // On the top edge only: it starts above the card, inside its sides.
    expect(strip.y).toBeLessThan(box.y);
    expect(strip.y + strip.height).toBeGreaterThan(box.y);
    expect(strip.x).toBeGreaterThanOrEqual(box.x);
    expect(strip.x + strip.width).toBeLessThanOrEqual(box.x + box.width);
    // The part above the card's top edge is painted, not clipped away.
    const painted = await page.evaluate(
      ([x, y]) => document.elementFromPoint(x!, y!)?.classList.contains("tape"),
      [strip.x + strip.width / 2, (strip.y + box.y) / 2],
    );
    expect(painted, (await card.getAttribute("class")) ?? "").toBe(true);
    // It reaches no other card.
    for (const other of await cards.all()) {
      const o = (await other.boundingBox())!;
      if (o.x === box.x && o.y === box.y) continue;
      const overlaps =
        strip.x < o.x + o.width &&
        o.x < strip.x + strip.width &&
        strip.y < o.y + o.height &&
        o.y < strip.y + strip.height;
      expect(overlaps, "tape over another card").toBe(false);
    }
    // The tape covers none of the card's text or icons.
    for (const part of await card
      .locator(
        ".tile__number, .tile__status, .tile__title, .eyebrow, h2, button",
      )
      .all()) {
      const p = (await part.boundingBox())!;
      const overlaps =
        strip.x < p.x + p.width &&
        p.x < strip.x + strip.width &&
        strip.y < p.y + p.height &&
        p.y < strip.y + strip.height;
      expect(overlaps, (await part.getAttribute("class")) ?? "").toBe(false);
    }
    // The watermark is cropped by the card: nothing of it paints outside.
    const visible = await card.locator(".aksara").evaluate((el) => {
      let { left, top, right, bottom } = el.getBoundingClientRect();
      for (let p = el.parentElement; p !== null; p = p.parentElement) {
        if (getComputedStyle(p).overflow !== "visible") {
          const c = p.getBoundingClientRect();
          left = Math.max(left, c.left);
          top = Math.max(top, c.top);
          right = Math.min(right, c.right);
          bottom = Math.min(bottom, c.bottom);
        }
      }
      return { left, top, right, bottom };
    });
    expect(visible.left).toBeGreaterThanOrEqual(box.x);
    expect(visible.right).toBeLessThanOrEqual(box.x + box.width);
    expect(visible.bottom).toBeLessThanOrEqual(box.y + box.height);
  }
  // The tiles do not all wear the same tape.
  expect(variants.size).toBeGreaterThanOrEqual(4);
});

test("[P-B02][P-S07] each tile and the hero show their first glyph as an aria-hidden Jejeg watermark", async ({
  page,
}) => {
  await gotoRoute(page, "");
  for (const [i, u] of solver.content.units.entries()) {
    const expected = unitWatermark(u, solver.table);
    expect(expected).not.toBe("");
    const mark =
      i === 0
        ? page.locator(".hero .aksara")
        : rowButton(page, i + 1).locator(".aksara");
    await expect(mark).toHaveText(expected);
    await expect(mark).toHaveAttribute("aria-hidden", "true");
    await expect(mark).toHaveCSS("font-family", /Jejeg/);
  }
  const ha = solver.table.byId.get("pa")!.char;
  await expect
    .poll(() =>
      page.evaluate((char) => document.fonts.check("32px Jejeg", char), ha),
    )
    .toBe(true);
});

test("[P-B03] on a fresh install only unit 1 is ready", async ({ page }) => {
  await gotoRoute(page, "");
  await expect(rowButton(page, 1)).toHaveAttribute("data-status", "ready");
  await expect(rowButton(page, 1)).not.toHaveAttribute("aria-disabled", "true");
  for (let n = 2; n <= solver.content.units.length; n++) {
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
  await rowButton(page, solver.content.units.length).click({ force: true });
  expect(new URL(page.url()).hash).toBe("#/");
  await rowButton(page, 1).click();
  await expect
    .poll(() => new URL(page.url()).hash)
    .toBe(`#/lesson/${first().id}`);
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
  const slips = page.locator("main .surface:visible");
  await expect(slips).toHaveCount(2);
  await expect(slips.nth(0).getByRole("heading")).toHaveText(
    id["deviationTitle"]!,
  );
  await expect(slips.nth(0)).toContainText(
    id["deviationBody"]!.replace("{ruleset}", id["rulesetNameKaj"]!),
  );
  await expect(slips.nth(1).getByRole("heading")).toHaveText(
    id["unitOrderHeading"]!,
  );
  const list = slips.nth(1).locator("p");
  await expect(list).toHaveCSS("white-space", "pre-line");
  expect(await list.evaluate((el) => (el as HTMLElement).innerText)).toBe(
    id["unitOrderBody"]!,
  );
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
});

test("[P-B08] the first meet card shows glyph one with its counter, name, sound and a write button", async ({
  page,
}) => {
  await openLesson(page, first().id);
  await expect(
    page.getByRole("heading", { level: 1, name: first().name }),
  ).toBeVisible();
  const firstUnit = first();
  const info = solver.table.byId.get(firstUnit.glyphs[0]!)!;
  await expect(page.locator(".meet__head .eyebrow")).toHaveText(
    fmt(id["meetEyebrow"]!, {
      unit: splitUnitName(firstUnit.name).head ?? firstUnit.name,
    }),
  );
  await expect(page.locator(".meet .visually-hidden")).toHaveText(
    fmt(id["meetProgressLabel"]!, {
      number: 1,
      total: firstUnit.glyphs.length,
    }),
  );
  await expect(page.locator(".meet__glyph .aksara")).toHaveText(info.char);
  await expect(page.locator(".meet__glyph")).toHaveAccessibleName(
    fmt(id["aksaraName"]!, { reading: info.pujl }),
  );
  await expect(page.locator(".meet__foot .eyebrow")).toHaveText(
    id["readingLabel"]!,
  );
  await expect(page.locator(".meet__foot .reading")).toHaveText(info.pujl);
  await expect(
    page.getByRole("button", { name: id["tryWritingButton"]! }),
  ).toBeVisible();
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "meet");
});

test("[P-B19] unit 1 goes glyph by glyph: meet, trace, that glyph's question, next glyph, then done", async ({
  page,
}) => {
  await openLesson(page, first().id);
  const glyphs = first().glyphs;
  for (const [i, glyphId] of glyphs.entries()) {
    const info = solver.table.byId.get(glyphId)!;
    await expect(page.locator(".meet .visually-hidden")).toHaveText(
      fmt(id["meetProgressLabel"]!, { number: i + 1, total: glyphs.length }),
    );
    const chips = await page
      .locator(".meet-progress .chip")
      .evaluateAll((els: HTMLElement[]) =>
        els.map((el) => ({
          state: el.dataset["state"],
          mark: el.querySelector("svg") !== null,
          lifted: getComputedStyle(el).boxShadow !== "none",
          dashed: getComputedStyle(el).borderStyle === "dashed",
        })),
      );
    // Each state differs by more than colour: a check, a shadow, a dashed frame.
    expect(chips).toEqual(
      glyphs.map((_, p) =>
        p < i
          ? { state: "done", mark: true, lifted: false, dashed: false }
          : p === i
            ? { state: "current", mark: false, lifted: true, dashed: false }
            : { state: "upcoming", mark: false, lifted: false, dashed: true },
      ),
    );
    await expect(page.locator(".meet__glyph .aksara")).toHaveText(info.char);
    await page.getByRole("button", { name: id["tryWritingButton"]! }).click();

    await expect(page.locator(".lesson .trace")).toBeVisible();
    await expect(page.locator(".trace__reading")).toHaveText(info.pujl);
    if (i === 0) {
      await expectAccessible(page);
      await shoot(page, "trace");
    }
    await page.getByRole("button", { name: id["traceSkip"]! }).click();

    const q = await readQuestion(page);
    expect(q.number).toBe(i + 1);
    expect(solver.targetIds(q.prompt)).toContain(glyphId);
    await page
      .locator(".answers button")
      .nth(solver.correctIndex(q.prompt, q.options))
      .click();
    await continueButton(page).click();
  }
  await expect(page.locator(".lesson-done")).toBeVisible();
  expect(
    (await readStore<UnitCompletionRow>(page, UNIT_COMPLETIONS)).map(
      (r) => r.unitId,
    ),
  ).toEqual([first().id]);
  expect(
    (await readStore<SrsItemRow>(page, SRS_ITEMS)).map((r) => r.itemId).sort(),
  ).toEqual([...glyphs].sort());
});

test("[P-B19] wulu and suku are not base letters: no trace screen, a question after each meet", async ({
  page,
}) => {
  await seedOldCompletions(page, [first().id]);
  await openLesson(page, wuluSuku().id);
  const glyphs = wuluSuku().glyphs;
  for (const [i, glyphId] of glyphs.entries()) {
    const info = solver.table.byId.get(glyphId)!;
    await expect(page.locator(".meet .visually-hidden")).toHaveText(
      fmt(id["meetProgressLabel"]!, { number: i + 1, total: glyphs.length }),
    );
    await expect(page.locator(".meet__glyph .aksara")).toHaveText(info.char);
    await expect(
      page.getByRole("button", { name: id["tryWritingButton"]! }),
    ).toHaveCount(0);
    await continueButton(page).click();
    const q = await readQuestion(page);
    expect(q.number).toBe(i + 1);
    await expect(page.locator(".trace")).toHaveCount(0);
    expect(solver.targetIds(q.prompt)).toContain(glyphId);
    await page
      .locator(".answers button")
      .nth(solver.correctIndex(q.prompt, q.options))
      .click();
    await continueButton(page).click();
  }
  await expect(page.locator(".lesson-done")).toBeVisible();
});

test("[P-B11] the question view shows the progress, a prompt card and one button per option", async ({
  page,
}) => {
  // Pin the seed so the first glyph is asked glyph to sound and the second
  // sound to glyph; the kind of each follows the shuffled position.
  await pinSeed(
    page,
    first(),
    (plan) =>
      plan[0]?.kind === "glyphToSound" && plan[1]?.kind === "soundToGlyph",
  );
  await openLesson(page, first().id);
  const n = first().glyphs.length;
  await advanceToQuestion(page, solver);
  const q = await readQuestion(page);
  expect(q.number).toBe(1);
  expect(q.total).toBe(n);
  await expect(page.getByRole("progressbar")).toHaveAccessibleName(
    fmt(id["questionProgress"]!, { number: 1, total: n }),
  );
  // A confusion partner is forced in even when untaught (decision 10).
  expect(q.options.length).toBeGreaterThanOrEqual(3);
  expect(q.options.length).toBeLessThanOrEqual(4);
  expect(new Set(q.options).size).toBe(q.options.length);
  await expect(page.locator(".answers button")).toHaveCount(q.options.length);
  expect(q.prompt).toHaveProperty("glyph");
  await expect(page.locator(".quiz__eyebrow")).toHaveText(
    fmt(id["questionEyebrowGlyphToSound"]!, { number: 1 }),
  );
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "question");

  await page
    .locator(".answers button")
    .nth(solver.correctIndex(q.prompt, q.options))
    .click();
  await continueButton(page).click();
  await advanceToQuestion(page, solver);
  const second = await readQuestion(page);
  expect(second.prompt).toHaveProperty("sound");
  await expect(page.locator(".quiz__eyebrow")).toHaveText(
    fmt(id["questionEyebrowSoundToGlyph"]!, { number: 2 }),
  );
  expect(second.options.length).toBeGreaterThanOrEqual(3);
  expect(second.options.length).toBeLessThanOrEqual(4);
  expect(new Set(second.options).size).toBe(second.options.length);
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "question-sound");
});

test("[P-B11] a three-option question lays its answers out in 3 columns, a four-option one in 2", async ({
  page,
}) => {
  await openLesson(page, first().id);
  let seen = 0;
  await playLesson(page, solver, first().id, {
    navigate: false,
    onQuestion: async (p, question) => {
      const tiles = p.locator(".lesson .answers button");
      await expect(tiles).toHaveCount(question.options.length);
      const columns = new Set(
        await tiles.evaluateAll((els) =>
          els.map((el) => Math.round(el.getBoundingClientRect().x)),
        ),
      );
      expect(columns.size).toBe(question.options.length === 3 ? 3 : 2);
      seen += 1;
      await tiles
        .nth(solver.correctIndex(question.prompt, question.options))
        .click();
      await expect(p.locator(".lesson").getByRole("status")).toBeVisible();
    },
  });
  expect(seen).toBe(first().glyphs.length);
});

test("[P-B12] the feedback row carries the stamp and a hand explanation quoting the glyph's reading", async ({
  page,
}) => {
  await openLesson(page, first().id);
  await advanceToQuestion(page, solver);
  const q = await readQuestion(page);
  const target = solver.table.byId.get(solver.targetIds(q.prompt)[0]!)!;
  await page
    .locator(".answers button")
    .nth(solver.correctIndex(q.prompt, q.options))
    .click();
  const row = page.locator(".lesson .feedback-row");
  await expect(row.locator(".stamp")).toHaveText(id["answerCorrect"]!);
  await expect(row.locator(".hand")).toHaveText(
    fmt(id["feedbackGlyphReads"]!, {
      aksara: target.char,
      reading: target.pujl,
    }),
  );
  await expect(row.locator(".hand .reading")).toHaveText(target.pujl);
  await continueButton(page).click();

  await advanceToQuestion(page, solver);
  const second = await readQuestion(page);
  const correct = solver.correctIndex(second.prompt, second.options);
  await page
    .locator(".answers button")
    .nth((correct + 1) % second.options.length)
    .click();
  await expect(row.locator(".stamp")).toHaveText(id["answerWrong"]!);
  await expect(row.locator(".hand .reading")).toHaveText(
    solver.table.byId.get(solver.targetIds(second.prompt)[0]!)!.pujl,
  );
});

test("[P-B21] the pa meet card shows its shape note", async ({ page }) => {
  await openLesson(page, first().id);
  await expect(page.locator(".meet__note")).toHaveText("Kait dan kaki.");
});

test("[P-B21] the wulu meet card shows no note row", async ({ page }) => {
  await seedOldCompletions(page, [first().id]);
  await openLesson(page, wuluSuku().id);
  await expect(page.locator(".meet")).toBeVisible();
  await expect(page.locator(".meet__note")).toHaveCount(0);
});

test("[P-B12] feedback shows right and wrong answers; the last question gets feedback too (W05)", async ({
  page,
}) => {
  await openLesson(page, first().id);
  await advanceToQuestion(page, solver);

  // Right answer on the first question.
  let q = await readQuestion(page);
  const right = solver.correctIndex(q.prompt, q.options);
  await page.locator(".answers button").nth(right).click();
  const status = page.locator(".lesson .feedback-row .stamp");
  await expect(status).toHaveText(id["answerCorrect"]!);
  await expect(page.locator(".answers button.is-correct")).toHaveCount(1);
  await expect(page.locator(".answers button.is-wrong")).toHaveCount(0);
  await expect(page.locator(".answers button.is-correct")).toHaveText(
    q.options[right]!,
  );
  await expectAccessible(page);
  await expectTouchTargets(page);
  await shoot(page, "feedback-correct");
  await continueButton(page).click();

  // Wrong answer on the second.
  await advanceToQuestion(page, solver);
  q = await readQuestion(page);
  const correct = solver.correctIndex(q.prompt, q.options);
  const wrong = (correct + 1) % q.options.length;
  await page.locator(".answers button").nth(wrong).click();
  await expect(status).toHaveText(id["answerWrong"]!);
  await expect(page.locator(".answers button.is-wrong")).toHaveCount(1);
  await expect(page.locator(".answers button.is-wrong")).toHaveText(
    q.options[wrong]!,
  );
  await expect(page.locator(".answers button.is-correct")).toHaveText(
    q.options[correct]!,
  );
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "feedback-wrong");
  await continueButton(page).click();

  // Answer through to the last question: feedback first, done after Continue.
  for (;;) {
    await advanceToQuestion(page, solver);
    q = await readQuestion(page);
    await page
      .locator(".answers button")
      .nth(solver.correctIndex(q.prompt, q.options))
      .click();
    await expect(status).toHaveText(id["answerCorrect"]!);
    if (q.number === q.total) break;
    await continueButton(page).click();
  }
  await expect(page.locator(".lesson-done")).toHaveCount(0);
  expect(await readStore<UnitCompletionRow>(page, UNIT_COMPLETIONS)).toEqual(
    [],
  );
  await continueButton(page).click();
  await expect(page.locator(".lesson-done")).toBeVisible();
});

test("[P-B14] the done view reports the score and Back returns to the ladder; the unit is saved and its glyphs queued", async ({
  page,
}) => {
  await completeLesson(page, solver, first().id);
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: fmt(id["lessonDone"]!, {
        correct: first().glyphs.length,
        total: first().glyphs.length,
      }),
    }),
  ).toBeVisible();
  await expectAccessible(page);
  await expectTouchTargets(page);
  await expectNoHorizontalOverflow(page);
  await shoot(page, "done");

  const completions = await readStore<UnitCompletionRow>(
    page,
    UNIT_COMPLETIONS,
  );
  expect(completions.map((r) => r.unitId)).toEqual([first().id]);
  const queued = await readStore<SrsItemRow>(page, SRS_ITEMS);
  expect(queued.map((r) => r.itemId).sort()).toEqual(
    [...first().glyphs].sort(),
  );

  await page.locator(".lesson-done .bar").getByRole("button").click();
  await expect.poll(() => new URL(page.url()).hash).toBe("#/");
  await expect(page.locator(".ladder")).toBeVisible();
});

test("[P-B05] after a lesson the ladder shows unit 1 completed and unit 2 ready without a reload", async ({
  page,
}) => {
  await gotoRoute(page, "");
  await rowButton(page, 1).click();
  await expect(page.locator(".lesson")).toBeVisible();
  await playLesson(page, solver, first().id, { navigate: false });
  await page.locator(".lesson-done .bar").getByRole("button").click();
  await expect(page.locator(".ladder")).toBeVisible();
  await expect(rowButton(page, 1)).toContainText(id["unitStatusCompleted"]!);
  await expect(rowButton(page, 2)).toHaveAttribute("data-status", "ready");
  await expect(rowButton(page, 2)).not.toHaveAttribute("aria-disabled", "true");
  await expect(rowButton(page, 3)).toHaveAttribute("aria-disabled", "true");
  await expect(page.locator(".top-bar__note:visible")).toHaveText(
    "3 / 20 aksara",
  );
  const done = page.locator(".ladder section").filter({
    has: page.getByRole("heading", { level: 2, name: id["ladderDone"]! }),
  });
  await expect(done.locator("button[data-unit]")).toHaveCount(1);
  await expect(done.locator("svg").first()).toHaveAttribute(
    "data-icon",
    "circle-check",
  );
  // A completed unit can be replayed.
  await rowButton(page, 1).click();
  await expect
    .poll(() => new URL(page.url()).hash)
    .toBe(`#/lesson/${first().id}`);
});

test("[P-B13] a wrong answer that picks the confusion-pair partner is logged once", async ({
  page,
}) => {
  const firstGlyphs = new Set(first().glyphs);
  const wuluSukuUnit = wuluSuku();
  const partnerOf = (glyphId: string) => (glyphId === "wulu" ? "suku" : "wulu");
  // Pin the lesson seed to one whose plan puts the partner among the aksara
  // options. Sound options cannot log: a partner's sound ("u") resolves to
  // the swara entry before it reaches the sandhangan one.
  const pinned = Array.from({ length: 500 }, (_, i) => i / 500).find((r) =>
    generateExercises({
      unit: wuluSukuUnit,
      taughtGlyphs: firstGlyphs,
      corpus: solver.content.words,
      seed: Math.floor(r * 0x7fffffff),
      glyphInfo: solver.table,
    }).some((e) => {
      if (e.kind !== "soundToGlyph") return false;
      const partner = solver.table.byId.get(partnerOf(e.glyphId))!;
      return e.options.includes(partner.char);
    }),
  );
  expect(pinned).toBeDefined();
  await page.addInitScript((value) => {
    Math.random = () => value;
  }, pinned!);

  await completeLesson(page, solver, first().id);

  let logged = false;
  const lessonOptions = (p: Page) => p.locator(".lesson .answers button");
  const lessonStatus = (p: Page) => p.locator(".lesson .feedback-row .stamp");
  await playLesson(page, solver, wuluSuku().id, {
    onQuestion: async (p, q) => {
      const targets = solver
        .targetIds(q.prompt)
        .filter((t) => t === "wulu" || t === "suku");
      const partnerIndex =
        targets
          .map((t) => solver.optionFor(partnerOf(t), q.prompt, q.options))
          .find((i) => i >= 0) ?? -1;
      if (!logged && "sound" in q.prompt && partnerIndex >= 0) {
        await lessonOptions(p).nth(partnerIndex).click();
        await expect(lessonStatus(p)).toHaveText(id["answerWrong"]!);
        logged = true;
      } else {
        await lessonOptions(p)
          .nth(solver.correctIndex(q.prompt, q.options))
          .click();
        await expect(lessonStatus(p)).toHaveText(id["answerCorrect"]!);
      }
    },
  });
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
  await openLesson(page, first().id);
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  await page.locator(".meet .bar__action--primary").click();
  await page.locator(".lesson .trace").waitFor();
  expect(await running(), "animation after a transition").toBeGreaterThan(0);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await advanceToQuestion(page, solver);
  await page.locator(".quiz").waitFor();
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  expect(await running(), "animation under reduced motion").toBe(0);
});

test("[P-B16] a locked or unknown lesson deep link lands on the ladder", async ({
  page,
}) => {
  await gotoRoute(page, `#/lesson/${solver.content.units[2]!.id}`);
  await expect.poll(() => new URL(page.url()).hash).toBe("#/");
  await expect(page.locator(".ladder")).toBeVisible();
  // A retired row id from before the shape regrouping.
  await gotoRoute(page, "#/lesson/u1");
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
      page.getByRole("heading", { level: 1, name: en["ladderTitle"]! }),
    ).toBeVisible();
    await expect(rowButton(page, 1)).toHaveAttribute("data-status", "ready");
    await expect(rowButton(page, 2)).toContainText(en["unitStatusLocked"]!);
    for (const [i, u] of solver.content.units.entries()) {
      await expect(rowButton(page, i + 1)).toContainText(u.name);
    }
    await expectAccessible(page);

    await page.getByRole("link", { name: en["teacherTitle"]! }).click();
    await expect(
      page.getByRole("heading", { level: 2, name: en["deviationTitle"]! }),
    ).toBeVisible();
    await page.goBack();

    await rowButton(page, 1).click();
    const info = solver.table.byId.get(first().glyphs[0]!)!;
    await expect(page.locator(".meet .eyebrow").first()).toHaveText(
      fmt(en["meetEyebrow"]!, {
        unit: splitUnitName(first().name).head ?? first().name,
      }),
    );
    await expect(page.locator(".meet__note")).toHaveText("Hook and leg.");
    await expect(page.locator(".meet__foot .reading")).toHaveText(info.pujl);
    await expect(
      page.getByRole("button", { name: en["tryWritingButton"]! }),
    ).toBeVisible();
    await page.getByRole("button", { name: en["tryWritingButton"]! }).click();
    await expect(
      page.getByRole("button", { name: en["traceSkip"]! }),
    ).toBeVisible();
    await expectAccessible(page);
  });
});

test("[P-A11Y] focus stays in the lesson after every step instead of falling to the body", async ({
  page,
}) => {
  const body = () =>
    page.evaluate(() => document.activeElement === document.body);
  const tryWriting = page.getByRole("button", {
    name: id["tryWritingButton"]!,
  });
  const checkTrace = page.getByRole("button", { name: id["traceCheck"]! });
  const skipTrace = page.getByRole("button", { name: id["traceSkip"]! });
  await gotoRoute(page, `#/lesson/${first().id}`);

  // The first meet card is focused by the page; "Coba tulis" opens the trace
  // screen, whose primary action takes focus.
  await expect(tryWriting).toBeVisible();
  await tryWriting.click();
  await expect(page.locator(".lesson .trace")).toBeVisible();
  await expect(checkTrace).toBeFocused();
  await skipTrace.click();

  // A new question focuses its first option; an answer focuses the feedback.
  await expect(page.locator(".answers button").first()).toBeFocused();
  await answerCurrentQuestion(page, solver);
  await expect(page.locator(".feedback-row")).toBeFocused();
  expect(await body()).toBe(false);
  await continueButton(page).click();

  // The next glyph's meet card puts focus on its button.
  await expect(tryWriting).toBeFocused();
  await playLesson(page, solver, first().id, { navigate: false });

  // Finish the lesson: the done heading takes focus.
  await expect(page.locator(".lesson-done__title")).toBeFocused();
});

test("[P-S10] a storage read that fails after boot shows the storage error with a retry, on the ladder and in a lesson", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const real = IDBObjectStore.prototype.getAllKeys;
    IDBObjectStore.prototype.getAllKeys = function (...args) {
      if ((window as { __failReads?: boolean }).__failReads) {
        throw new DOMException("closed", "InvalidStateError");
      }
      return real.apply(this, args);
    };
    (window as { __failReads?: boolean }).__failReads = true;
  });
  const heal = () =>
    page.evaluate(() => {
      (window as { __failReads?: boolean }).__failReads = false;
    });
  const alert = page.getByRole("alert");
  const retry = page.getByRole("button", { name: id["retryButton"]! });

  await gotoRoute(page, "#/");
  await expect(alert).toHaveText(new RegExp(id["storageErrorTitle"]!));
  await heal();
  await retry.click();
  await expect(page.locator(".ladder")).toBeVisible();

  await page.evaluate(() => {
    (window as { __failReads?: boolean }).__failReads = true;
  });
  await gotoRoute(page, `#/lesson/${first().id}`);
  await expect(alert).toHaveText(new RegExp(id["storageErrorTitle"]!));
  await heal();
  await retry.click();
  await expect(page.locator(".lesson")).toBeVisible();
  await expect(alert).toHaveCount(0);
});

const ladderStatuses = async (page: Page): Promise<string[]> => {
  const byUnit = new Map<string, string>();
  const all = page.locator("button[data-unit][data-status]");
  for (let i = 0; i < (await all.count()); i++) {
    byUnit.set(
      (await all.nth(i).getAttribute("data-unit")) ?? "",
      (await all.nth(i).getAttribute("data-status")) ?? "?",
    );
  }
  return solver.content.units.map((u) => byUnit.get(u.id) ?? "missing");
};

async function seedOldCompletions(page: Page, ids: string[]): Promise<void> {
  await gotoRoute(page, "");
  await writeRows(
    page,
    UNIT_COMPLETIONS,
    ids.map((unitId) => ({ unitId, completedAt: 1 })),
  );
  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
}

const storedIds = async (page: Page) =>
  (await readStore<UnitCompletionRow>(page, UNIT_COMPLETIONS))
    .map((r) => r.unitId)
    .sort();

test("[P-B17] old completions u1 and u2 keep wulu/suku completed and map no letter group", async ({
  page,
}) => {
  await seedOldCompletions(page, ["u1", "u2"]);
  await expect
    .poll(() => ladderStatuses(page))
    .toEqual([
      "ready",
      "completed",
      "ready",
      ...Array<string>(6).fill("locked"),
    ]);
  expect(await storedIds(page)).toEqual(["u1", "u2"]);
});

test("[P-B17] old completions u1-u4 complete the shape groups they fully cover, once", async ({
  page,
}) => {
  await seedOldCompletions(page, ["u1", "u2", "u3", "u4"]);
  const expected = [
    "completed",
    "completed",
    "ready",
    "completed",
    "completed",
    "ready",
    "locked",
    "locked",
    "locked",
  ];
  await expect.poll(() => ladderStatuses(page)).toEqual(expected);
  expect(await storedIds(page)).toEqual([
    "g1",
    "g3",
    "g4",
    "u1",
    "u2",
    "u3",
    "u4",
  ]);
  const before = await readStore<UnitCompletionRow>(page, UNIT_COMPLETIONS);

  await page.reload();
  await page.locator('#app[data-boot="ready"]').waitFor();
  await expect.poll(() => ladderStatuses(page)).toEqual(expected);
  expect(await readStore<UnitCompletionRow>(page, UNIT_COMPLETIONS)).toEqual(
    before,
  );

  await gotoRoute(page, "#/lesson/g5");
  await expect(page.locator(".lesson")).toBeVisible();
  await gotoRoute(page, "#/lesson/u6");
  await expect(page).toHaveURL(/#\/$/);
});
