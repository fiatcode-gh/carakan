import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { describe, expect, test } from "vitest";

const engineDir = resolve("src/engine");
const forbidden = [
  "window",
  "document",
  "fetch",
  "localStorage",
  "indexedDB",
  "navigator",
  "process",
  "require",
];

function engineFiles(): string[] {
  return readdirSync(engineDir, { recursive: true, encoding: "utf8" })
    .filter((f) => f.endsWith(".ts"))
    .map((f) => join(engineDir, f));
}

/** Strip comments and string/template bodies so identifier scans see code only. */
function codeOnly(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\/\/[^\n]*/g, " ")
    .replace(/'(?:\\.|[^'\\\n])*'/g, "''")
    .replace(/"(?:\\.|[^"\\\n])*"/g, '""')
    .replace(/`(?:\\.|[^`\\])*`/g, "``");
}

describe("[P-D01] engine purity", () => {
  test("the engine directory is not empty", () => {
    expect(engineFiles().length).toBeGreaterThan(0);
  });

  test("every import specifier is relative and resolves inside src/engine", () => {
    const bad: string[] = [];
    for (const file of engineFiles()) {
      const src = readFileSync(file, "utf8");
      const specs = [
        ...src.matchAll(
          /\b(?:import|export)\b[^;'"]*?\bfrom\s*["']([^"']+)["']/g,
        ),
        ...src.matchAll(/\bimport\s*["']([^"']+)["']/g),
        ...src.matchAll(/\bimport\(\s*["']([^"']+)["']\s*\)/g),
      ].map((m) => m[1]!);
      for (const spec of specs) {
        const target = resolve(dirname(file), spec);
        const inside = !relative(engineDir, target).startsWith("..");
        if (!(spec.startsWith("./") || spec.startsWith("../")) || !inside) {
          bad.push(`${relative(engineDir, file)}: ${spec}`);
        }
      }
    }
    expect(bad).toEqual([]);
  });

  test("no DOM, Node or network identifiers", () => {
    const hits: string[] = [];
    for (const file of engineFiles()) {
      const code = codeOnly(readFileSync(file, "utf8"));
      for (const id of forbidden) {
        if (new RegExp(`(?<![\\w$.])${id}(?![\\w$])`).test(code)) {
          hits.push(`${relative(engineDir, file)}: ${id}`);
        }
      }
    }
    expect(hits).toEqual([]);
  });
});
