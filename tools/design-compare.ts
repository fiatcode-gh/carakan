// Captures the built app next to the approved prototype screens so the user
// can review them side by side. Evidence only; the output is not committed.
//
//   npm run build && npx vite preview --port 4173 --strictPort   # in another shell
//   npm run design:compare
//
// Writes .flow/evidence/<HEAD>/design/{app-<id>.png, approved-<id>.png, index.html}.
import {
  chromium,
  type BrowserContext,
  type BrowserContextOptions,
  type Page,
} from "@playwright/test";
import { execFileSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import {
  DB_NAME,
  MISTAKE_LOGS,
  SRS_ITEMS,
  UNIT_COMPLETIONS,
} from "../src/core/db/schema.ts";
import { toAksara } from "../src/engine/index.ts";
import { createSolver, type Solver } from "../tests/e2e/support/solver.ts";

const BASE = process.env["DESIGN_BASE_URL"] ?? "http://localhost:4173/";
const SCREENS_DIR = "docs/design/screens";
const head = execFileSync("git", ["rev-parse", "HEAD"], {
  encoding: "utf8",
}).trim();
const OUT = `.flow/evidence/${head}/design`;

const id = JSON.parse(readFileSync("src/l10n/id.json", "utf8")) as Record<
  string,
  string
>;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

type Viewport = { width: number; height: number; scale: number };
const PHONE: Viewport = { width: 360, height: 740, scale: 2 };
const TABLET: Viewport = { width: 800, height: 1280, scale: 1 };
const DESKTOP: Viewport = { width: 1280, height: 800, scale: 1 };

interface Seed {
  completedUnits?: string[];
  srs?: object[];
  mistakes?: object[];
}

interface Capture {
  /** File stem of the app capture: `app-<stem>.png`. */
  stem: string;
  label: string;
  /** `page` resizes the viewport to the whole page; `viewport` keeps it. */
  fit: "page" | "viewport";
  prepare: (page: Page, solver: Solver) => Promise<void>;
}

interface Screen {
  /** Prototype screen id (`docs/design/screens/<id>.png`). */
  id: string;
  viewport: Viewport;
  seed?: Seed;
  /** Opened before `prepare`; defaults to `#/`. */
  route: string;
  captures: Capture[];
  note?: string;
}

const noop = async (): Promise<void> => {};

// ---- page helpers ---------------------------------------------------------

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

const ready = (page: Page) =>
  page.locator('#app[data-boot="ready"]').waitFor({ timeout: 30_000 });

async function open(page: Page, route: string, seed?: Seed): Promise<void> {
  await page.goto(BASE);
  await ready(page);
  if (seed !== undefined) {
    const now = Date.now();
    if (seed.completedUnits !== undefined) {
      await writeRows(
        page,
        UNIT_COMPLETIONS,
        seed.completedUnits.map((unitId) => ({
          unitId,
          completedAt: now - DAY,
        })),
      );
    }
    if (seed.srs !== undefined) await writeRows(page, SRS_ITEMS, seed.srs);
    if (seed.mistakes !== undefined) {
      await writeRows(page, MISTAKE_LOGS, seed.mistakes);
    }
  }
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

async function shoot(
  page: Page,
  capture: Capture,
  viewport: Viewport,
): Promise<void> {
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
  if (capture.fit === "page") {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
  }
}

const button = (page: Page, name: string) =>
  page.getByRole("button", { name, exact: true });

async function meetAll(page: Page, glyphs: number): Promise<void> {
  for (let i = 0; i < glyphs; i++) {
    await button(page, id["continueButton"]!).click();
  }
}

/** Reads the current question the way a learner sees it. */
async function readQuestion(page: Page) {
  const options = page.locator(".options button:not([disabled])");
  await options.first().waitFor();
  const sound = page.locator(".prompt__sound");
  const prompt =
    (await sound.count()) > 0
      ? { sound: ((await sound.textContent()) ?? "").trim() }
      : {
          glyph: (
            (await page.locator(".flashcard .aksara").textContent()) ?? ""
          ).trim(),
        };
  const texts = (await options.allTextContents()).map((s) => s.trim());
  return { prompt, texts };
}

async function answer(
  page: Page,
  solver: Solver,
  correct: boolean,
): Promise<void> {
  const { prompt, texts } = await readQuestion(page);
  const right = solver.correctIndex(prompt, texts);
  const index = correct ? right : (right + 1) % texts.length;
  await page.locator(".options button").nth(index).click();
  await page.locator(".feedback").waitFor();
}

async function startLesson(page: Page, solver: Solver): Promise<void> {
  const unit = solver.content.units.find((u) => u.id === "g1")!;
  await meetAll(page, unit.glyphs.length);
}

const tile = (page: Page, entryId: string) =>
  page.locator(`#tab-chart [data-entry="${entryId}"]`);

async function openChartSheet(page: Page, entryId: string): Promise<void> {
  await tile(page, entryId).click();
  await page.getByRole("dialog").waitFor();
}

async function typeLatin(page: Page): Promise<void> {
  await page.getByLabel(id["inputHintLatin"]!).fill("hanacaraka");
  await page.locator(".result").first().waitFor();
}

// ---- seeds ----------------------------------------------------------------

const now = Date.now();
const fresh = (itemId: string, dueAt: number): object => ({
  itemId,
  intervalDays: 0,
  ease: 2.5,
  repetitions: 0,
  dueAt,
  lastReviewedAt: null,
});
const reviewed = (itemId: string, dueAt: number): object => ({
  itemId,
  intervalDays: 1,
  ease: 2.5,
  repetitions: 1,
  dueAt,
  lastReviewedAt: dueAt - DAY,
});
/** Stored dueAt − lastReviewedAt ≤ 30 min counts as a retry. */
const retry = (itemId: string, dueAt: number): object => ({
  itemId,
  intervalDays: 0,
  ease: 2.3,
  repetitions: 0,
  dueAt,
  lastReviewedAt: dueAt - 10 * MINUTE,
});

const reviewSeed: Seed = {
  srs: [
    reviewed("na", now - 3 * HOUR),
    reviewed("ka", now - 2 * HOUR),
    retry("ca", now - HOUR),
    fresh("ha", now - 30 * MINUTE),
    fresh("ra", now - 20 * MINUTE),
  ],
  mistakes: [{ confusionPair: "da-dha", count: 3, lastAt: now - HOUR }],
};

// ---- screens: prototype id → app route and state ---------------------------

const screens: Screen[] = [
  {
    id: "ladder",
    viewport: PHONE,
    route: "#/",
    seed: { completedUnits: ["g1"] },
    note: "Unit 1 completed, unit 2 ready, the rest locked.",
    captures: [{ stem: "ladder", label: "app", fit: "page", prepare: noop }],
  },
  {
    id: "teacher",
    viewport: PHONE,
    route: "#/teacher",
    captures: [{ stem: "teacher", label: "app", fit: "page", prepare: noop }],
  },
  {
    id: "lesson-meet",
    viewport: PHONE,
    route: "#/lesson/g1",
    captures: [
      { stem: "lesson-meet", label: "app", fit: "viewport", prepare: noop },
    ],
  },
  {
    id: "lesson-q-glyph",
    viewport: PHONE,
    route: "#/lesson/g1",
    note: "Lesson g1 advanced to its first glyph→sound question.",
    captures: [
      {
        stem: "lesson-q-glyph",
        label: "app",
        fit: "viewport",
        prepare: startLesson,
      },
    ],
  },
  {
    id: "lesson-q-sound",
    viewport: PHONE,
    route: "#/lesson/g1",
    note: "Second question of lesson g1 (sound→glyph) after one right answer.",
    captures: [
      {
        stem: "lesson-q-sound",
        label: "app",
        fit: "viewport",
        prepare: async (page, solver) => {
          await startLesson(page, solver);
          await answer(page, solver, true);
          await button(page, id["continueButton"]!).click();
        },
      },
    ],
  },
  {
    id: "lesson-feedback",
    viewport: PHONE,
    route: "#/lesson/g1",
    note: "The prototype stacks both states on one page; the app shows one at a time.",
    captures: [
      {
        stem: "lesson-feedback-correct",
        label: "app, right answer",
        fit: "viewport",
        prepare: async (page, solver) => {
          await startLesson(page, solver);
          await answer(page, solver, true);
        },
      },
      {
        stem: "lesson-feedback-wrong",
        label: "app, wrong answer",
        fit: "viewport",
        prepare: async (page, solver) => {
          await startLesson(page, solver);
          await answer(page, solver, false);
        },
      },
    ],
  },
  {
    id: "lesson-done",
    viewport: PHONE,
    route: "#/lesson/g1",
    captures: [
      {
        stem: "lesson-done",
        label: "app",
        fit: "viewport",
        prepare: async (page, solver) => {
          await startLesson(page, solver);
          for (;;) {
            await answer(page, solver, true);
            await button(page, id["continueButton"]!).click();
            await page
              .locator(".trophy, .options button:not([disabled])")
              .first()
              .waitFor();
            if ((await page.locator(".trophy").count()) > 0) break;
          }
        },
      },
    ],
  },
  {
    id: "chart",
    viewport: PHONE,
    route: "#/chart",
    captures: [{ stem: "chart", label: "app", fit: "page", prepare: noop }],
  },
  {
    id: "chart-detail",
    viewport: PHONE,
    route: "#/chart",
    note: "Detail of na.",
    captures: [
      {
        stem: "chart-detail",
        label: "app",
        fit: "viewport",
        prepare: (page) => openChartSheet(page, "na"),
      },
    ],
  },
  {
    id: "chart-detail-sandhangan",
    viewport: PHONE,
    route: "#/chart",
    note: "Detail of wulu.",
    captures: [
      {
        stem: "chart-detail-sandhangan",
        label: "app",
        fit: "viewport",
        prepare: (page) => openChartSheet(page, "wulu"),
      },
    ],
  },
  {
    id: "review",
    viewport: PHONE,
    route: "#/review",
    seed: reviewSeed,
    note: "The prototype predates W14, which hides the answer until the learner reveals the card. The first capture reveals every card, as the prototype showed them; the second is the approved W14 hidden state.",
    captures: [
      {
        stem: "review",
        label: "app, every card revealed",
        fit: "page",
        prepare: async (page) => {
          const drill = page.locator("#tab-review .drill").first();
          await drill.locator(".options button, button").first().click();
          const reveal = page.getByRole("button", {
            name: id["revealAnswerButton"]!,
          });
          while ((await reveal.count()) > 0) {
            await reveal.first().dispatchEvent("click");
            await page.waitForTimeout(100);
          }
        },
      },
      {
        stem: "review-hidden",
        label: "app, hidden (approved W14 change)",
        fit: "page",
        prepare: noop,
      },
    ],
  },
  {
    id: "review-empty",
    viewport: PHONE,
    route: "#/review",
    captures: [
      { stem: "review-empty", label: "app", fit: "viewport", prepare: noop },
    ],
  },
  {
    id: "review-help",
    viewport: PHONE,
    route: "#/review-help",
    captures: [
      { stem: "review-help", label: "app", fit: "page", prepare: noop },
    ],
  },
  {
    id: "converter-l2a",
    viewport: PHONE,
    route: "#/converter",
    note: "Input hanacaraka.",
    captures: [
      {
        stem: "converter-l2a",
        label: "app",
        fit: "page",
        prepare: typeLatin,
      },
    ],
  },
  {
    id: "converter-l2a-copied",
    viewport: PHONE,
    route: "#/converter",
    captures: [
      {
        stem: "converter-l2a-copied",
        label: "app",
        fit: "viewport",
        prepare: async (page) => {
          await typeLatin(page);
          await button(page, id["copyButton"]!).click();
          await page.locator(".toast").waitFor();
        },
      },
    ],
  },
  {
    id: "converter-a2l",
    viewport: PHONE,
    route: "#/converter",
    note: "Aksara to Latin with the glyph picker open.",
    captures: [
      {
        stem: "converter-a2l",
        label: "app",
        fit: "viewport",
        prepare: async (page) => {
          await page
            .getByRole("radio", { name: id["dirAksaraToLatin"]! })
            .check();
          const result = toAksara("hanacaraka");
          if (result.kind !== "success") throw new Error("not convertible");
          await page.getByLabel(id["inputHintAksara"]!).fill(result.output);
          await button(page, id["glyphPickerTitle"]!).click();
          await page
            .getByRole("dialog", { name: id["glyphPickerTitle"]! })
            .waitFor();
        },
      },
    ],
  },
  {
    id: "settings",
    viewport: PHONE,
    route: "#/settings",
    captures: [{ stem: "settings", label: "app", fit: "page", prepare: noop }],
  },
  {
    id: "settings-report",
    viewport: PHONE,
    route: "#/settings",
    captures: [
      {
        stem: "settings-report",
        label: "app",
        fit: "viewport",
        prepare: async (page) => {
          await button(page, id["reportButton"]!).click();
          await page
            .getByRole("dialog", { name: id["reportButton"]! })
            .waitFor();
        },
      },
    ],
  },
  {
    id: "tablet-converter-l2a",
    viewport: TABLET,
    route: "#/converter",
    captures: [
      {
        stem: "tablet-converter-l2a",
        label: "app, 800×1280",
        fit: "viewport",
        prepare: typeLatin,
      },
    ],
  },
  {
    id: "desktop-ladder",
    viewport: DESKTOP,
    route: "#/",
    seed: { completedUnits: ["g1"] },
    captures: [
      {
        stem: "desktop-ladder",
        label: "app, 1280×800",
        fit: "viewport",
        prepare: noop,
      },
    ],
  },
  {
    id: "desktop-chart-detail",
    viewport: DESKTOP,
    route: "#/chart",
    captures: [
      {
        stem: "desktop-chart-detail",
        label: "app, 1280×800",
        fit: "viewport",
        prepare: (page) => openChartSheet(page, "na"),
      },
    ],
  },
];

/** Prototype screens this script does not recapture, and why. */
const notCaptured: ReadonlyArray<readonly [string, string]> = [
  [
    "states",
    "loading, load-error, update and storage-error views are transient; their proofs are tests/e2e/shell.spec.ts and tests/e2e/update.spec.ts",
  ],
  [
    "focus-ladder",
    "the keyboard focus ring is asserted by tests/e2e/a11y.spec.ts",
  ],
  ["icon-maskable", "shown with the app icon below"],
  ["icon-maskable-guide", "shown with the app icon below"],
];

// ---- run ------------------------------------------------------------------

mkdirSync(OUT, { recursive: true });
const solver = await createSolver();
const browser = await chromium.launch();

async function withContext<T>(
  viewport: Viewport,
  run: (context: BrowserContext) => Promise<T>,
): Promise<T> {
  const options: BrowserContextOptions = {
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.scale,
    isMobile: viewport === PHONE,
    hasTouch: viewport === PHONE,
    locale: "id-ID",
    reducedMotion: "reduce",
    permissions: ["clipboard-read", "clipboard-write"],
  };
  const context = await browser.newContext(options);
  try {
    return await run(context);
  } finally {
    await context.close();
  }
}

for (const screen of screens) {
  for (const capture of screen.captures) {
    // A fresh context per capture: every capture starts from its own seed.
    await withContext(screen.viewport, async (context) => {
      const page = await context.newPage();
      await open(page, screen.route, screen.seed);
      await capture.prepare(page, solver);
      await shoot(page, capture, screen.viewport);
    });
    console.log(`app-${capture.stem}.png`);
  }
}
await browser.close();

// ---- evidence page ----------------------------------------------------------

copyFileSync("public/icons/icon-512.png", `${OUT}/app-icon.png`);
for (const screen of screens) {
  copyFileSync(
    `${SCREENS_DIR}/${screen.id}.png`,
    `${OUT}/approved-${screen.id}.png`,
  );
}
copyFileSync(`${SCREENS_DIR}/icon.png`, `${OUT}/approved-icon.png`);

const escape = (text: string): string =>
  text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const figure = (file: string, caption: string, width: number): string =>
  `<figure><figcaption>${escape(caption)}</figcaption><img src="${file}" width="${width}" alt="${escape(caption)}"></figure>`;

const rows = [
  ...screens.map((screen) => {
    const width = screen.viewport === PHONE ? 360 : 480;
    const apps = screen.captures
      .map((c) => figure(`app-${c.stem}.png`, c.label, width))
      .join("");
    const note =
      screen.note === undefined ? "" : `<p>${escape(screen.note)}</p>`;
    return `<section><h2>${escape(screen.id)}</h2>${note}<div class="row">${figure(`approved-${screen.id}.png`, "approved prototype", width)}${apps}</div></section>`;
  }),
  `<section><h2>icon</h2><div class="row">${figure("approved-icon.png", "approved prototype", 256)}${figure("app-icon.png", "app, public/icons/icon-512.png", 256)}</div></section>`,
];

const skipped = notCaptured
  .map(([name, why]) => `<li><code>${escape(name)}</code>: ${escape(why)}</li>`)
  .join("");

writeFileSync(
  `${OUT}/index.html`,
  `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Carakan: approved prototype vs app (${head.slice(0, 7)})</title>
<style>
body{font:16px/1.4 system-ui,sans-serif;margin:24px;background:#fafafa;color:#222}
.row{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}
figure{margin:0}figcaption{font-weight:600;margin-bottom:6px}
img{border:1px solid #ccc;background:#fff;height:auto}
section{margin-bottom:48px}
</style></head><body>
<h1>Approved prototype vs app</h1>
<p>Head <code>${head}</code>, app at ${escape(BASE)}, 360×740 at device scale 2 unless the caption says otherwise.</p>
${rows.join("\n")}
<h2>Not recaptured</h2><ul>${skipped}</ul>
</body></html>
`,
);
console.log(`${OUT}/index.html`);
