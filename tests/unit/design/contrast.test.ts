import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";

const TOKENS_PATH = "src/styles/tokens.css";
const BASE_PATH = "src/styles/base.css";

/** Every component rule: base.css plus the `<style>` block of each Svelte file. */
function componentCss(): string {
  const styles = (readdirSync("src", { recursive: true }) as string[])
    .filter((p) => p.endsWith(".svelte"))
    .flatMap((p) =>
      [
        ...readFileSync(`src/${p}`, "utf8").matchAll(
          /<style[^>]*>([\s\S]*?)<\/style>/g,
        ),
      ].map((m) => m[1] ?? ""),
    );
  return [readFileSync(BASE_PATH, "utf8"), ...styles].join("\n");
}

/** `--name: value;` declarations of every `:root` block, in file order. */
function parseTokens(css: string): Map<string, string> {
  const tokens = new Map<string, string>();
  const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const block of withoutComments.matchAll(/:root\s*\{([^}]*)\}/g)) {
    for (const decl of (block[1] ?? "").matchAll(
      /(--[\w-]+)\s*:\s*([^;]+);/g,
    )) {
      tokens.set(decl[1] ?? "", (decl[2] ?? "").trim());
    }
  }
  return tokens;
}

function resolve(tokens: Map<string, string>, name: string): string {
  let value = tokens.get(name);
  const seen = new Set<string>([name]);
  while (value !== undefined) {
    const ref = /^var\((--[\w-]+)\)$/.exec(value);
    if (ref === null) return value;
    const next = ref[1] ?? "";
    if (seen.has(next)) throw new Error(`token cycle at ${next}`);
    seen.add(next);
    value = tokens.get(next);
    if (value === undefined) throw new Error(`${name} -> undefined ${next}`);
  }
  throw new Error(`token ${name} is not defined`);
}

function channels(hex: string): [number, number, number] {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex);
  if (m === null) throw new Error(`not a solid hex colour: ${hex}`);
  let h = m[1] ?? "";
  if (h.length === 3) h = [...h].map((c) => c + c).join("");
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrast(a: string, b: string): number {
  const x = luminance(a);
  const y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

const tokens = parseTokens(readFileSync(TOKENS_PATH, "utf8"));
const color = (name: string) => resolve(tokens, `--color-${name}`);

type Pair = readonly [fg: string, bg: string, min: number, kind: string];

const surfaces = [
  "paper",
  "card",
  "coral",
  "periwinkle",
  "butter",
  "sage",
  "neutral",
] as const;

/** WCAG 2.2 AA: 4.5 body text, 3 for non-text indicators and focus. */
const pairs: readonly Pair[] = [
  ...surfaces.map((s): Pair => ["ink", s, 4.5, "text"]),
  ["on-ink", "ink", 4.5, "on-ink text"],
  ...["paper", "card", "neutral"].map((s): Pair => [
    "ink-muted",
    s,
    4.5,
    "muted text",
  ]),
  ...["paper", "card"].map((s): Pair => ["ink-subtle", s, 4.5, "subtle text"]),
  ...["paper", "card"].map((s): Pair => ["hand", s, 4.5, "hand note"]),
  ...["paper", "card"].map((s): Pair => ["stamp", s, 4.5, "state text"]),
  ...surfaces.map((s): Pair => ["ink", s, 3, "border and focus"]),
  ["trace-ink", "card", 3, "trace stroke"],
];

const requiredTokens = [
  "paper",
  "card",
  "rule",
  "margin",
  "ink",
  "ink-muted",
  "ink-subtle",
  "hand",
  "stamp",
  "stamp-decor",
  "placeholder",
  "on-ink",
  "coral",
  "periwinkle",
  "butter",
  "sage",
  "neutral",
  "tape",
  "scrim",
  "trace-ink",
];

/** Heritage token names, removed by the Buku Poster cutover. */
const removedNames =
  /var\(--(?:paper-\d+|soga-\d+|indigo-\d+|terracotta-\d+|gold-\d+|color-(?:bg|surface|surface-raised|surface-sunken|text|text-muted|accent|accent-pressed|accent-soft|on-accent|link|reward|reward-fill|reward-soft|border|border-strong|focus|success|success-soft|danger|danger-soft|shadow)|radius-[\w-]+|shadow-slip|shadow-sheet|tab-height|font-ui)\)/;

describe("design tokens", () => {
  test("every colour token is defined", () => {
    for (const name of requiredTokens) {
      expect(tokens.has(`--color-${name}`), `--color-${name}`).toBe(true);
    }
  });

  test.each(pairs)("%s on %s is at least %s:1 (%s)", (fg, bg, min) => {
    const ratio = contrast(color(fg), color(bg));
    expect(
      ratio,
      `${fg} ${color(fg)} on ${bg} ${color(bg)} = ${ratio.toFixed(2)}`,
    ).toBeGreaterThanOrEqual(min);
  });

  test("touch target token is 44px and no radius token exists", () => {
    expect(tokens.get("--touch-min")).toBe("44px");
    expect([...tokens.keys()].filter((k) => k.startsWith("--radius-"))).toEqual(
      [],
    );
  });

  test("components use tokens only, no colour literals or removed names", () => {
    const css = componentCss().replace(/\/\*[\s\S]*?\*\//g, "");
    expect(removedNames.exec(css)?.[0]).toBeUndefined();
    expect(/#[0-9a-f]{3,8}\b/i.exec(css)?.[0]).toBeUndefined();
    expect(/\brgba?\(/.exec(css)?.[0]).toBeUndefined();
  });

  test("the placeholder colour is never a text colour", () => {
    const css = componentCss().replace(/\/\*[\s\S]*?\*\//g, "");
    expect(
      /color:\s*var\(--color-placeholder\)/.exec(css)?.[0],
    ).toBeUndefined();
  });

  test("the decorative stamp colour is only used by Stamp.svelte", () => {
    const users = (readdirSync("src", { recursive: true }) as string[])
      .filter((p) => p.endsWith(".svelte") && !p.endsWith("Stamp.svelte"))
      .filter((p) => {
        const source = readFileSync(`src/${p}`, "utf8");
        return [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].some(
          (m) => (m[1] ?? "").includes("--color-stamp-decor"),
        );
      });
    expect(users).toEqual([]);
  });
});
