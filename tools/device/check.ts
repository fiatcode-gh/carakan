/**
 * Scripted checks against Chrome on an Android device or emulator, over CDP.
 *
 *   npm run device:check -- <command> [args] [--url-prefix <prefix>]
 *
 * Commands: status | tour | reload | lesson <unitId> | screenshot <file>.
 * Results print as JSON; a failed check exits non-zero.
 *
 * It forwards Chrome's DevTools socket with
 * `adb forward tcp:9222 localabstract:chrome_devtools_remote`, then picks the
 * Carakan page by URL. A WebAPK or installed shortcut runs in Chrome and shows
 * up on the same socket, so it is found by the same prefix.
 */
import { chromium, expect, type Page } from "@playwright/test";
import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { auditRoutes, href } from "../../src/app/router.ts";
import {
  MISTAKE_LOGS,
  SRS_ITEMS,
  UNIT_COMPLETIONS,
} from "../../src/core/db/schema.ts";
import {
  answerCurrentQuestion,
  id,
  readStore,
  walkMeet,
} from "../../tests/e2e/support/lesson.ts";
import { createSolver } from "../../tests/e2e/support/solver.ts";

const CDP = "http://localhost:9222";
const DEFAULT_PREFIX = "http://localhost:8090/";
const READY = '#app[data-boot="ready"]';

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { "url-prefix": { type: "string", default: DEFAULT_PREFIX } },
});
const prefix = values["url-prefix"]!;
const [command, arg] = positionals;

const usage =
  "usage: device:check <status|tour|reload|lesson <unitId>|screenshot <file>> [--url-prefix <prefix>]";

function forward(): void {
  execFileSync("adb", [
    "forward",
    "tcp:9222",
    "localabstract:chrome_devtools_remote",
  ]);
}

async function ready(page: Page): Promise<void> {
  await page.locator(READY).waitFor({ timeout: 20_000 });
}

async function status(page: Page) {
  const info = await page.evaluate(async () => ({
    url: location.href,
    build:
      document
        .querySelector('meta[name="carakan-build"]')
        ?.getAttribute("content") ?? null,
    swControlled: navigator.serviceWorker.controller !== null,
    persisted: (await navigator.storage?.persisted?.()) ?? false,
  }));
  const count = async (store: string) =>
    (await readStore<unknown>(page, store)).length;
  return {
    ...info,
    counts: {
      srsItems: await count(SRS_ITEMS),
      unitCompletions: await count(UNIT_COMPLETIONS),
      mistakeLogs: await count(MISTAKE_LOGS),
    },
  };
}

/** Moves within the running app, so it works with the server unreachable. */
async function goto(page: Page, hash: string): Promise<void> {
  await page.evaluate((h) => {
    location.hash = h;
  }, hash);
  await ready(page);
}

async function tour(page: Page) {
  const routes: { route: string; heading: string }[] = [];
  for (const route of auditRoutes) {
    await goto(page, href(route));
    const h1 = page.getByRole("heading", { level: 1 }).first();
    await expect(h1, href(route)).toBeVisible();
    routes.push({
      route: href(route),
      heading: ((await h1.textContent()) ?? "").trim(),
    });
  }
  await goto(page, "#/");
  return { routes };
}

async function lesson(page: Page, unitId: string) {
  const solver = await createSolver();
  const unit = solver.content.units.find((u) => u.id === unitId);
  if (unit === undefined) throw new Error(`no unit ${unitId}`);

  // Read the page's locale to determine which language file to use
  const locale = await page.evaluate(() => document.documentElement.lang);

  // Load the appropriate localization file based on the page's locale
  let messages: Record<string, string>;
  if (locale === "en") {
    messages = JSON.parse(readFileSync("src/l10n/en.json", "utf8"));
  } else {
    // Default to Indonesian for any other locale (including "id")
    messages = id;
  }

  await goto(page, `#/lesson/${unitId}`);
  await expect(page.locator(".lesson")).toBeVisible();
  await walkMeet(page, unit.glyphs.length, messages);
  const next = page.getByRole("button", { name: messages["continueButton"]! });
  for (;;) {
    const q = await answerCurrentQuestion(page, solver);
    await next.click();
    if (q.number === q.total) break;
  }
  await expect(page.locator(".trophy")).toBeVisible();
  await page.locator(".lesson__foot").getByRole("button").click();
  await ready(page);
  return { unitId, completed: true };
}

async function main(): Promise<void> {
  if (
    command === undefined ||
    !["status", "tour", "reload", "lesson", "screenshot"].includes(command) ||
    (command === "lesson" && arg === undefined) ||
    (command === "screenshot" && arg === undefined)
  ) {
    console.error(usage);
    process.exit(2);
  }
  if (command === "screenshot") {
    const png = execFileSync("adb", ["exec-out", "screencap", "-p"], {
      maxBuffer: 64 * 1024 * 1024,
    });
    writeFileSync(arg!, png);
    console.log(JSON.stringify({ screenshot: arg, bytes: png.length }));
    return;
  }

  forward();
  const browser = await chromium.connectOverCDP(CDP);
  try {
    const pages = browser.contexts().flatMap((c) => c.pages());
    const page = pages.find((p) => p.url().startsWith(prefix));
    if (page === undefined) {
      throw new Error(
        `no page under ${prefix}; open: ${JSON.stringify(pages.map((p) => p.url()))}`,
      );
    }
    await ready(page);
    let result: unknown;
    if (command === "status") result = await status(page);
    else if (command === "tour") result = await tour(page);
    else if (command === "reload") {
      await page.reload();
      await ready(page);
      result = await status(page);
    } else result = await lesson(page, arg!);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    // Closing a CDP connection leaves the device's Chrome running.
    await browser.close();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
