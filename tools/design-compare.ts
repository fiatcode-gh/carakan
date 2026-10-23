// Captures the built app next to the archived Buku Poster reference screens so
// the user can review them side by side. Evidence only; the output is not
// committed.
//
//   npm run build && npx vite preview --port 4173 --strictPort   # in another shell
//   npm run design:compare
//
// DESIGN_BASE_URL points at another preview. Writes
// .flow/evidence/<HEAD>/design/{app-<stem>.png, ref-<id>.png, index.html}: the
// eight reference screens (docs/design/buku-poster/screenshots) each paired
// with the app in the same state at 390×844, then app-only captures of the
// screens the reference does not draw.
import {
  chromium,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { SRS_ITEMS, UNIT_COMPLETIONS } from "../src/core/db/schema.ts";
import { RULESET_STORAGE_KEY } from "../src/core/ruleset/ruleset-controller.ts";
import { kajRulesetId, toAksara } from "../src/engine/index.ts";
import {
  advanceToQuestion,
  answerCurrentQuestion,
  id,
  playLesson,
  writeRows,
} from "../tests/e2e/support/lesson.ts";
import { readReviewQuestion } from "../tests/e2e/support/review-quiz.ts";
import { createSolver, type Solver } from "../tests/e2e/support/solver.ts";
import { draw, glyphRuns, strokesOf } from "../tests/e2e/support/trace.ts";

const BASE = process.env["DESIGN_BASE_URL"] ?? "http://localhost:4173/";
const SCREENS_DIR = "docs/design/buku-poster/screenshots";
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const OUT = `.flow/evidence/${head}/design`;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Viewport = { width: number; height: number; scale: number };
const PHONE: Viewport = { width: 390, height: 844, scale: 2 };
const TABLET: Viewport = { width: 800, height: 1280, scale: 1 };
const DESKTOP: Viewport = { width: 1280, height: 800, scale: 1 };

interface Seed {
  completedUnits?: string[];
  srs?: object[];
}

interface Capture {
  /** File stem of the app capture: `app-<stem>.png`. */
  stem: string;
  label: string;
  /** Reference screen id (`<SCREENS_DIR>/<ref>.png`); absent: app only. */
  ref?: string;
  note?: string;
  viewport: Viewport;
  seed?: Seed;
  /** Opened before `prepare`; defaults to `#/`. */
  route?: string;
  /** `page` resizes the viewport to the whole page; `viewport` keeps it. */
  fit: "page" | "viewport";
  prepare?: (page: Page, solver: Solver) => Promise<void>;
}

// ---- page helpers ---------------------------------------------------------

const ready = (page: Page) =>
  page.locator('#app[data-boot="ready"]').waitFor({ timeout: 30_000 });

async function open(
  page: Page,
  route: string,
  seed: Seed | undefined,
): Promise<void> {
  await page.goto(BASE);
  await ready(page);
  if (seed?.completedUnits !== undefined) {
    const at = Date.now() - DAY;
    await writeRows(
      page,
      UNIT_COMPLETIONS,
      seed.completedUnits.map((unitId) => ({ unitId, completedAt: at })),
    );
  }
  if (seed?.srs !== undefined) await writeRows(page, SRS_ITEMS, seed.srs);
  await page.goto(`${BASE}${route}`);
  await page.reload();
  await ready(page);
}

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  await page.evaluate(() =>
    Promise.all(document.getAnimations().map((a) => a.finished)),
  );
  await page.waitForTimeout(250);
}

async function shoot(page: Page, capture: Capture): Promise<void> {
  const { viewport } = capture;
  if (capture.fit === "page") {
    const height = await page.evaluate(
      () => document.documentElement.scrollHeight,
    );
    await page.setViewportSize({
      width: viewport.width,
      height: Math.max(height, viewport.height),
    });
    await page.evaluate(() => window.scrollTo(0, 0));
  }
  await settle(page);
  await page.screenshot({ path: `${OUT}/app-${capture.stem}.png` });
}

const button = (page: Page, key: string) =>
  page.getByRole("button", { name: id[key]!, exact: true });

const tile = (page: Page, entryId: string) =>
  page.locator(`#tab-chart [data-entry="${entryId}"]`);

async function openChartSheet(page: Page, entryId: string): Promise<void> {
  await tile(page, entryId).click();
  await page.getByRole("dialog").waitFor();
}

async function typeLatin(page: Page, text: string): Promise<void> {
  await page.getByLabel(id["inputHintLatin"]!).fill(text);
  await page.getByRole("region", { name: id["outputLabel"]! }).waitFor();
}

/** The lesson's meet card, then the trace pad for its first glyph. */
async function openTrace(page: Page): Promise<void> {
  await button(page, "tryWritingButton").click();
  await page.locator(".trace-pad[data-font-size]").waitFor();
}

/** Traces `pa` once, checks it, then draws its first third unchecked. */
async function traceOnceThenStart(page: Page, solver: Solver): Promise<void> {
  await openTrace(page);
  const runs = await glyphRuns(page, solver.table.byId.get("pa")!.char);
  await draw(page, "mouse", strokesOf(runs));
  await button(page, "traceCheck").click();
  await page.locator('.trace .slot[data-done="true"]').waitFor();
  await draw(
    page,
    "mouse",
    strokesOf(runs.slice(0, Math.ceil(runs.length / 3))),
  );
}

/** Answers the first question right, redrawing the lesson until it is glyph → sound. */
async function glyphQuestionFeedback(
  page: Page,
  solver: Solver,
): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt++) {
    await advanceToQuestion(page, solver);
    if ((await page.locator(".lesson .quiz__sound").count()) === 0) {
      await answerCurrentQuestion(page, solver);
      return;
    }
    await page.reload();
    await ready(page);
  }
  throw new Error("no glyph → sound first question in 10 lessons");
}

/** Starts the review quiz and answers its first question right. */
async function reviewFeedback(page: Page, solver: Solver): Promise<void> {
  await button(page, "reviewStartButton").click();
  const question = await readReviewQuestion(page);
  const index = solver.correctIndex(question.prompt, question.options);
  await page.locator(".quiz .answers button").nth(index).click();
  await page.locator(".quiz .feedback-row").waitFor();
}

// ---- seeds ----------------------------------------------------------------

const now = Date.now();
const reviewSeed: Seed = {
  srs: [
    {
      itemId: "pa",
      intervalDays: 3,
      ease: 2.5,
      repetitions: 2,
      dueAt: now - HOUR,
      lastReviewedAt: now - HOUR - 3 * DAY,
    },
    {
      itemId: "ha",
      intervalDays: 1,
      ease: 2.5,
      repetitions: 1,
      dueAt: now - 30 * MINUTE,
      lastReviewedAt: now - 30 * MINUTE - DAY,
    },
    {
      itemId: "ya",
      intervalDays: 0,
      ease: 2.5,
      repetitions: 0,
      dueAt: now - 20 * MINUTE,
      lastReviewedAt: null,
    },
  ],
};
/** Review quiz needs two stored cards; one is not due. */
const quizSeed: Seed = {
  srs: [
    ...reviewSeed.srs!,
    {
      itemId: "na",
      intervalDays: 8,
      ease: 2.5,
      repetitions: 3,
      dueAt: now + 5 * DAY,
      lastReviewedAt: now - 3 * DAY,
    },
  ],
};

// ---- captures: the eight reference screens, then app-only -----------------

const captures: Capture[] = [
  {
    stem: "01-learn-path",
    ref: "01-learn-path",
    label: "app, fresh profile",
    viewport: PHONE,
    fit: "viewport",
  },
  {
    stem: "02-meet-aksara",
    ref: "02-meet-aksara",
    label: "app, lesson g1, first meet (pa)",
    viewport: PHONE,
    route: "#/lesson/g1",
    fit: "viewport",
  },
  {
    stem: "03-trace",
    ref: "03-trace",
    label: "app, pa traced once (1/3), first third drawn unchecked",
    viewport: PHONE,
    route: "#/lesson/g1",
    fit: "viewport",
    prepare: traceOnceThenStart,
  },
  {
    stem: "04-quiz",
    ref: "04-quiz",
    label: "app, first question (glyph → sound) answered right",
    viewport: PHONE,
    route: "#/lesson/g1",
    fit: "viewport",
    prepare: glyphQuestionFeedback,
  },
  {
    stem: "05-chart",
    ref: "05-chart",
    label: "app, Carakan tab",
    viewport: PHONE,
    route: "#/chart",
    fit: "viewport",
  },
  {
    stem: "06-chart-detail",
    ref: "06-chart-detail",
    label: "app, ha sheet open",
    viewport: PHONE,
    route: "#/chart",
    fit: "viewport",
    prepare: (page) => openChartSheet(page, "ha"),
  },
  {
    stem: "07-converter",
    ref: "07-converter",
    label: "app, aku with the ku cluster selected",
    viewport: PHONE,
    route: "#/converter",
    fit: "viewport",
    prepare: async (page) => {
      await typeLatin(page, "aku");
      // The hit buttons never take pointer events (text selection), so
      // dispatch the click the way a screen reader would activate them.
      await page
        .locator('.cluster-result__hit[data-index="1"]')
        .dispatchEvent("click");
      await page.getByRole("region", { name: id["breakdownTitle"]! }).waitFor();
    },
  },
  {
    stem: "08-review",
    ref: "08-review",
    label: "app, three cards due (pa, ha, ya)",
    viewport: PHONE,
    seed: reviewSeed,
    route: "#/review",
    fit: "viewport",
  },
  {
    stem: "sandhangan",
    label: "Chart, Sandhangan tab",
    viewport: PHONE,
    route: "#/chart",
    fit: "page",
    prepare: async (page) => {
      await page
        .locator("#tab-chart")
        .getByRole("tab", { name: id["chartTabSandhangan"]!, exact: true })
        .click();
    },
  },
  {
    stem: "pasangan",
    label: "Chart, Pasangan tab",
    viewport: PHONE,
    route: "#/chart",
    fit: "page",
    prepare: async (page) => {
      await page
        .locator("#tab-chart")
        .getByRole("tab", { name: id["pasanganLabel"]!, exact: true })
        .click();
    },
  },
  {
    stem: "chart-detail-wulu",
    label: "Chart detail, wulu",
    viewport: PHONE,
    route: "#/chart",
    fit: "viewport",
    prepare: async (page) => {
      await page
        .locator("#tab-chart")
        .getByRole("tab", { name: id["chartTabSandhangan"]!, exact: true })
        .click();
      await openChartSheet(page, "wulu");
    },
  },
  {
    stem: "converter-a2l",
    label: "Converter, Aksara → Latin with output",
    viewport: PHONE,
    route: "#/converter",
    fit: "page",
    prepare: async (page) => {
      await page.getByRole("radio", { name: id["dirAksaraToLatin"]! }).check();
      const result = toAksara("hanacaraka", { ruleset: kajRulesetId });
      if (result.kind !== "success") throw new Error("not convertible");
      await page.getByLabel(id["inputHintAksara"]!).fill(result.output);
      await page.getByRole("region", { name: id["outputLabel"]! }).waitFor();
    },
  },
  {
    stem: "converter-picker",
    label: "Converter, glyph picker open",
    viewport: PHONE,
    route: "#/converter",
    fit: "viewport",
    prepare: async (page) => {
      await page.getByRole("radio", { name: id["dirAksaraToLatin"]! }).check();
      await button(page, "glyphPickerTitle").click();
      await page
        .getByRole("dialog", { name: id["glyphPickerTitle"]! })
        .waitFor();
    },
  },
  {
    stem: "meet-sound-toast",
    label: "Meet, coming-soon toast after the sound button",
    viewport: PHONE,
    route: "#/lesson/g1",
    fit: "viewport",
    prepare: async (page) => {
      await page
        .getByRole("button", {
          name: id["playSound"]!.replace("{reading}", "pa"),
        })
        .click();
      await page
        .getByRole("status")
        .filter({ hasText: id["audioComingSoon"]! })
        .waitFor();
    },
  },
  {
    stem: "lesson-done",
    label: "Lesson g1 done",
    viewport: PHONE,
    route: "#/lesson/g1",
    fit: "viewport",
    prepare: (page, solver) =>
      playLesson(page, solver, "g1", { navigate: false }),
  },
  {
    stem: "review-quiz-feedback",
    label: "Review quiz, first question answered right",
    viewport: PHONE,
    seed: quizSeed,
    route: "#/review",
    fit: "viewport",
    prepare: reviewFeedback,
  },
  {
    stem: "review-empty",
    label: "Review, nothing due",
    viewport: PHONE,
    route: "#/review",
    fit: "viewport",
  },
  {
    stem: "settings",
    label: "Settings",
    viewport: PHONE,
    route: "#/settings",
    fit: "page",
  },
  {
    stem: "settings-reset",
    label: "Settings, reset confirmation",
    viewport: PHONE,
    route: "#/settings",
    fit: "viewport",
    prepare: async (page) => {
      await button(page, "resetButton").click();
      await page
        .getByRole("dialog", { name: id["resetConfirmTitle"]! })
        .waitFor();
    },
  },
  {
    stem: "teacher",
    label: "Teacher",
    viewport: PHONE,
    route: "#/teacher",
    fit: "page",
  },
  {
    stem: "review-help",
    label: "Review help",
    viewport: PHONE,
    route: "#/review-help",
    fit: "page",
  },
  {
    stem: "desktop-ladder",
    label: "Learn path, 1280×800",
    viewport: DESKTOP,
    seed: { completedUnits: ["g1"] },
    fit: "viewport",
  },
  {
    stem: "desktop-chart-detail",
    label: "Chart detail (ha), 1280×800",
    viewport: DESKTOP,
    route: "#/chart",
    fit: "viewport",
    prepare: (page) => openChartSheet(page, "ha"),
  },
  {
    stem: "tablet-converter",
    label: "Converter, 800×1280",
    viewport: TABLET,
    route: "#/converter",
    fit: "viewport",
    prepare: (page) => typeLatin(page, "hanacaraka"),
  },
];

/** Views this script does not capture, and why. */
const notCaptured: ReadonlyArray<readonly [string, string]> = [
  [
    "update banner",
    "needs a waiting service worker; its proof is tests/e2e/update.spec.ts",
  ],
  [
    "loading, load-error and storage-error views",
    "transient; their proof is tests/e2e/shell.spec.ts",
  ],
];

// ---- run ------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });
const solver = await createSolver(kajRulesetId);
const browser = await chromium.launch();

async function withContext<T>(
  viewport: Viewport,
  run: (context: BrowserContext) => Promise<T>,
): Promise<T> {
  const options: BrowserContextOptions = {
    baseURL: BASE,
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.scale,
    isMobile: viewport === PHONE,
    hasTouch: viewport === PHONE,
    locale: "id-ID",
    reducedMotion: "reduce",
    permissions: ["clipboard-read", "clipboard-write"],
  };
  const context = await browser.newContext(options);
  // The e2e default fixture: KAJ I, so the reference states hold.
  await context.addInitScript(
    ([key, value]) => {
      try {
        if (localStorage.getItem(key) === null)
          localStorage.setItem(key, value);
      } catch {
        // storage blocked: the app falls back to its default
      }
    },
    [RULESET_STORAGE_KEY, kajRulesetId] as const,
  );
  try {
    return await run(context);
  } finally {
    await context.close();
  }
}

for (const capture of captures) {
  // A fresh context per capture: every capture starts from its own seed.
  await withContext(capture.viewport, async (context) => {
    const page = await context.newPage();
    await open(page, capture.route ?? "#/", capture.seed);
    await capture.prepare?.(page, solver);
    await shoot(page, capture);
  });
  console.log(`app-${capture.stem}.png`);
}
await browser.close();

// ---- evidence page ----------------------------------------------------------

const titles = new Map(
  (
    JSON.parse(
      readFileSync("docs/design/buku-poster/screens.json", "utf8"),
    ) as { png: string; title: string }[]
  ).map((s) => [s.png.replace(/^screenshots\/|\.png$/g, ""), s.title]),
);

for (const refId of titles.keys()) {
  copyFileSync(`${SCREENS_DIR}/${refId}.png`, `${OUT}/ref-${refId}.png`);
}

const escape = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const figure = (file: string, caption: string, width: number): string =>
  `<figure><figcaption>${escape(caption)}</figcaption><img src="${file}" width="${width}" alt="${escape(caption)}"></figure>`;

const widthOf = (viewport: Viewport): number =>
  viewport === PHONE ? 390 : viewport === TABLET ? 400 : 640;

const pairs = captures
  .filter((c) => c.ref !== undefined)
  .map((c) => {
    const refId = c.ref!;
    const note = c.note === undefined ? "" : `<p>${escape(c.note)}</p>`;
    return `<section><h2>${escape(refId)}: ${escape(titles.get(refId)!)}</h2>${note}<div class="row">${figure(`ref-${refId}.png`, "reference", 390)}${figure(`app-${c.stem}.png`, c.label, widthOf(c.viewport))}</div></section>`;
  });

const appOnly = captures
  .filter((c) => c.ref === undefined)
  .map((c) => figure(`app-${c.stem}.png`, c.label, widthOf(c.viewport)));

const skipped = notCaptured
  .map(([name, why]) => `<li><code>${escape(name)}</code>: ${escape(why)}</li>`)
  .join("");

writeFileSync(
  `${OUT}/index.html`,
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Carakan: Buku Poster reference vs app (${head.slice(0, 7)})</title>
<style>
body{font:16px/1.4 system-ui,sans-serif;margin:24px;background:#fafafa;color:#222}
.row{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}
figure{margin:0}figcaption{font-weight:600;margin-bottom:6px}
img{border:1px solid #ccc;background:#fff;height:auto}
section{margin-bottom:48px}
</style></head><body>
<h1>Buku Poster reference vs app</h1>
<p>Head <code>${head}</code>, app at ${escape(BASE)}, 390×844 at device scale 2 unless the caption says otherwise. Same state, not a pixel match.</p>
${pairs.join("\n")}
<section><h2>Not in the reference</h2><div class="row">${appOnly.join("")}</div></section>
<h2>Not captured</h2><ul>${skipped}</ul>
</body></html>
`,
);
console.log(`${OUT}/index.html`);
