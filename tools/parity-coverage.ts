// Fails unless every parity ID whose proof column names `unit` or `e2e`
// appears in at least one Vitest or Playwright (project `mobile`) test title.
// Usage: npm run parity:coverage
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const PARITY_FILE = "docs/parity.md";

interface Row {
  readonly id: string;
  readonly proof: string;
}

/** Table rows `| P-XXX | behavior | task | proof |` whose proof is automated. */
function automatedRows(markdown: string): Row[] {
  const rows: Row[] = [];
  for (const line of markdown.split("\n")) {
    const match = /^\|\s*(P-[A-Z]\d{2})\s*\|/.exec(line);
    if (match === null || match[1] === undefined) continue;
    const cells = line.split("|").map((cell) => cell.trim());
    // Leading and trailing empty cells come from the outer pipes.
    const proof = cells[cells.length - 2] ?? "";
    if (/\b(unit|e2e)\b/.test(proof)) rows.push({ id: match[1], proof });
  }
  return rows;
}

function run(command: string, args: string[]): string {
  return execFileSync(command, args, {
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "inherit"],
  });
}

function vitestTitles(): string[] {
  const list = JSON.parse(run("npx", ["vitest", "list", "--json"])) as Array<{
    name: string;
  }>;
  return list.map((test) => test.name);
}

interface PlaywrightSuite {
  title?: string;
  specs?: Array<{ title: string; tests: Array<{ projectName: string }> }>;
  suites?: PlaywrightSuite[];
}

function playwrightTitles(): string[] {
  const report = JSON.parse(
    run("npx", [
      "playwright",
      "test",
      "--list",
      "--reporter=json",
      "--project=mobile",
    ]),
  ) as { suites: PlaywrightSuite[] };
  const titles: string[] = [];
  const walk = (suite: PlaywrightSuite, path: string[]): void => {
    // The first level is the spec file; its name is not part of the title.
    const next = suite.title === undefined ? path : [...path, suite.title];
    for (const spec of suite.specs ?? []) {
      if (spec.tests.some((test) => test.projectName === "mobile")) {
        titles.push([...next.slice(1), spec.title].join(" > "));
      }
    }
    for (const child of suite.suites ?? []) walk(child, next);
  };
  for (const suite of report.suites) walk(suite, []);
  return titles;
}

const rows = automatedRows(readFileSync(PARITY_FILE, "utf8"));
const unitTitles = vitestTitles();
const e2eTitles = playwrightTitles();

const covering = (id: string, titles: string[]): string[] =>
  titles.filter((title) => title.includes(id));

const missing: string[] = [];
for (const { id, proof } of rows) {
  const unit = covering(id, unitTitles);
  const e2e = covering(id, e2eTitles);
  if (unit.length + e2e.length === 0) {
    missing.push(id);
    continue;
  }
  console.log(`${id}  (${proof})`);
  for (const title of unit) console.log(`    unit  ${title}`);
  for (const title of e2e) console.log(`    e2e   ${title}`);
}

const covered = rows.length - missing.length;
console.log(
  `\n${covered}/${rows.length} automated parity IDs covered by ` +
    `${unitTitles.length} Vitest and ${e2eTitles.length} Playwright (mobile) tests.`,
);
if (missing.length > 0) {
  console.error(`\nNo test title names: ${missing.join(", ")}`);
  process.exit(1);
}
