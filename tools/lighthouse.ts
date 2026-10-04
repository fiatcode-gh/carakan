import { chromium } from "@playwright/test";
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync } from "node:fs";

const RUNS = 3;
const OUT = ".cache/lighthouse";
const urls = (
  process.env["LIGHTHOUSE_URLS"] ??
  "http://localhost:8090/,http://localhost:8090/#/chart"
)
  .split(",")
  .map((u) => u.trim())
  .filter((u) => u !== "");

mkdirSync(OUT, { recursive: true });
const chromePath = chromium.executablePath();

function slug(url: string): string {
  const u = new URL(url);
  const s = `${u.host}${u.pathname}${u.hash}`.replace(/[^a-zA-Z0-9]+/g, "-");
  return s.replace(/^-+|-+$/g, "");
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

interface Report {
  categories: {
    performance: { score: number | null };
    accessibility: { score: number | null };
  };
}

let failed = false;
console.log("url | run | performance | accessibility");
for (const url of urls) {
  const performance: number[] = [];
  const accessibility: number[] = [];
  for (let n = 1; n <= RUNS; n++) {
    const base = `${OUT}/${slug(url)}-${n}`;
    const args = [
      "lighthouse",
      url,
      "--only-categories=performance,accessibility",
      "--output=json",
      ...(n === 1 ? ["--output=html"] : []),
      `--output-path=${n === 1 ? base : `${base}.json`}`,
      "--chrome-flags=--headless=new",
    ];
    const run = spawnSync("npx", args, {
      env: { ...process.env, CHROME_PATH: chromePath },
      encoding: "utf8",
    });
    if (run.status !== 0) {
      console.error(run.stderr);
      console.log(`${url} | ${n} | lighthouse exited ${run.status}`);
      process.exit(1);
    }
    const report = JSON.parse(
      readFileSync(n === 1 ? `${base}.report.json` : `${base}.json`, "utf8"),
    ) as Report;
    const p = report.categories.performance.score ?? 0;
    const a = report.categories.accessibility.score ?? 0;
    performance.push(p);
    accessibility.push(a);
    console.log(`${url} | ${n} | ${p.toFixed(2)} | ${a.toFixed(2)}`);
  }
  const medPerf = median(performance);
  const minA11y = Math.min(...accessibility);
  const ok = medPerf >= 0.9 && minA11y >= 0.95;
  if (!ok) failed = true;
  console.log(
    `${url} | median/min | ${medPerf.toFixed(2)} | ${minA11y.toFixed(2)} | ${ok ? "PASS" : "FAIL"}`,
  );
}
process.exit(failed ? 1 : 0);
