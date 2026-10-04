import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  scanProseLiterals,
  scanRawHtml,
  scanSvelteMarkup,
} from "./string-guard.ts";

const SRC = new URL("../../../src/", import.meta.url);

/** feedback-report output is a bug report for the maintainer, not learner UI. */
const EXEMPT_PREFIXES = ["l10n/", "engine/"];
const EXEMPT_FILES = ["features/settings/feedback-report.ts"];

function scannedFiles(): string[] {
  return (readdirSync(SRC, { recursive: true }) as string[])
    .map((p) => p.replaceAll("\\", "/"))
    .filter((p) => /\.(ts|svelte)$/.test(p))
    .filter((p) => !EXEMPT_PREFIXES.some((x) => p.startsWith(x)))
    .filter((p) => !EXEMPT_FILES.includes(p))
    .sort();
}

function offendersOf(
  scan: (source: string) => { line: number; text: string }[],
  only: (path: string) => boolean = () => true,
): string[] {
  return scannedFiles()
    .filter(only)
    .flatMap((p) =>
      scan(readFileSync(new URL(p, SRC), "utf8")).map(
        (o) => `src/${p}:${o.line}: ${o.text}`,
      ),
    );
}

describe("sample sources: the scanners catch what they claim to", () => {
  test("[P-L02] net 1 flags bare text in markup", () => {
    expect(scanSvelteMarkup("<p>Halo</p>")).toHaveLength(1);
  });

  test("[P-L02] net 1 passes localized expressions", () => {
    expect(scanSvelteMarkup("<p>{$t('x')}</p>")).toEqual([]);
  });

  test("[P-L02] net 1 flags displayed attribute literals", () => {
    expect(
      scanSvelteMarkup('<button title="Salin">{$t("a")}</button>'),
    ).toHaveLength(1);
    expect(scanSvelteMarkup('<img alt="Logo" />')).toHaveLength(1);
  });

  test("[P-L02] net 1 passes dynamic and non-letter attributes", () => {
    expect(
      scanSvelteMarkup('<button title={$t("a")}>{$t("b")}</button>'),
    ).toEqual([]);
    expect(
      scanSvelteMarkup('<button aria-label="{x} ok">{y}</button>'),
    ).toEqual([]);
    expect(scanSvelteMarkup('<div title="123"></div>')).toEqual([]);
  });

  test("[P-L02] net 1 allows the PUJL and JGST tokens", () => {
    expect(scanSvelteMarkup("<span>PUJL</span>")).toEqual([]);
    expect(scanSvelteMarkup("<span>PUJL JGST</span>")).toEqual([]);
    expect(scanSvelteMarkup("<span>PUJLX</span>")).toHaveLength(1);
  });

  test("[P-L02] net 1 ignores script, style, comments and braces with strings", () => {
    const source = [
      '<script lang="ts">const a = "Halo";</script>',
      '<style>.x::after { content: "Halo"; }</style>',
      "<!-- Halo -->",
      "{#if ok}",
      `<p>{ok ? 'a}' : "b"}</p>`,
      "{/if}",
      "<p>&nbsp;&#9679;</p>",
    ].join("\n");
    expect(scanSvelteMarkup(source)).toEqual([]);
  });

  test("[P-L02] net 1 reports the offending line", () => {
    expect(scanSvelteMarkup("<div>\n  <p>{x}</p>\n  Halo\n</div>")).toEqual([
      { line: 3, text: "Halo" },
    ]);
  });

  test("[P-L02] net 2 flags Indonesian prose in string literals", () => {
    expect(scanProseLiterals("const a = 'Belajar dulu';")).toHaveLength(1);
    expect(
      scanProseLiterals('const a = "ini dan itu dari sini";'),
    ).toHaveLength(1);
    expect(scanProseLiterals("const a = `Soal ${n}`;")).toHaveLength(1);
    expect(scanProseLiterals("const a = `x ${y} yang z`;")).toHaveLength(1);
  });

  test("[P-L02] net 2 ignores comments and identifiers", () => {
    expect(scanProseLiterals('// Belajar dulu "Salin"')).toEqual([]);
    expect(scanProseLiterals(' * "Batal" dan yang lain')).toEqual([]);
    expect(scanProseLiterals("const a = 'unit-1';")).toEqual([]);
  });

  test("[P-L02] net 3 flags {@html}", () => {
    expect(scanRawHtml("<div>{@html x}</div>")).toHaveLength(1);
    expect(scanRawHtml("<div>{ @html x }</div>")).toHaveLength(1);
    expect(scanRawHtml("<div>{x}</div>")).toEqual([]);
  });
});

describe("the web tree", () => {
  test("[P-L02] no markup renders a bare string literal", () => {
    expect(
      offendersOf(scanSvelteMarkup, (p) => p.endsWith(".svelte")),
      "move these into src/l10n/*.json",
    ).toEqual([]);
  });

  test("[P-L02] no Indonesian prose is hard-coded in src", () => {
    expect(
      offendersOf(scanProseLiterals),
      "move these into src/l10n/*.json",
    ).toEqual([]);
  });

  test("[P-L02] no {@html} in any Svelte file (SEC)", () => {
    expect(offendersOf(scanRawHtml, (p) => p.endsWith(".svelte"))).toEqual([]);
  });
});
