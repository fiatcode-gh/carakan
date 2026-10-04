import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";

// Aksara strings are built from Unicode names (javaneseChar / ak), never typed.
const roots: ReadonlyArray<{ dir: string; ext: RegExp }> = [
  { dir: "src", ext: /\.(ts|svelte)$/ },
  { dir: "tests", ext: /\.ts$/ },
  { dir: "tools", ext: /\.(ts|py|sh)$/ },
  { dir: "prototype", ext: /\.(ts|html|css)$/ },
];

const javanese = /[\u{A980}-\u{A9DF}]/u;

function* walk(dir: string): Generator<string> {
  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return; // directory does not exist (yet)
  }
  for (const name of names) {
    if (name === "node_modules") continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) yield* walk(path);
    else yield path;
  }
}

describe("[P-D05] no aksara literals", () => {
  test("no U+A980-U+A9DF code point in source, tests, tools or prototype", () => {
    const offenders: string[] = [];
    for (const { dir, ext } of roots) {
      for (const file of walk(dir)) {
        if (!ext.test(file)) continue;
        readFileSync(file, "utf8")
          .split("\n")
          .forEach((line, i) => {
            if (javanese.test(line)) offenders.push(`${file}:${i + 1}`);
          });
      }
    }
    expect(
      offenders,
      `typed aksara literals:\n${offenders.join("\n")}`,
    ).toEqual([]);
  });
});
