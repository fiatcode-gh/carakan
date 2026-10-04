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

/** WCAG 2.2 AA: 4.5 body text, 3 for non-text indicators and focus. */
const pairs: readonly Pair[] = [
  ["text", "bg", 4.5, "text"],
  ["text", "surface", 4.5, "text"],
  ["text", "surface-raised", 4.5, "text"],
  ["text", "surface-sunken", 4.5, "text"],
  ["text-muted", "bg", 4.5, "muted text"],
  ["text-muted", "surface", 4.5, "muted text"],
  ["text-muted", "surface-raised", 4.5, "muted text"],
  ["text-muted", "surface-sunken", 4.5, "muted text"],
  ["on-accent", "accent", 4.5, "on-accent"],
  ["link", "bg", 4.5, "link"],
  ["link", "surface", 4.5, "link"],
  ["link", "surface-raised", 4.5, "link"],
  ["text", "accent-soft", 4.5, "text on tint"],
  ["text", "reward-soft", 4.5, "text on tint"],
  ["text", "reward-fill", 4.5, "text on tint"],
  ["danger", "danger-soft", 4.5, "state text"],
  ["success", "success-soft", 4.5, "state text"],
  ["danger", "bg", 4.5, "state text"],
  ["danger", "surface", 4.5, "state text"],
  ["danger", "surface-raised", 4.5, "state text"],
  ["success", "bg", 4.5, "state text"],
  ["success", "surface", 4.5, "state text"],
  ["success", "surface-raised", 4.5, "state text"],
  ["border-strong", "bg", 3, "control border"],
  ["border-strong", "surface", 3, "control border"],
  ["border-strong", "surface-sunken", 3, "control border"],
  ["focus", "bg", 3, "focus ring"],
  ["focus", "surface", 3, "focus ring"],
  ["focus", "surface-raised", 3, "focus ring"],
  ["focus", "surface-sunken", 3, "focus ring"],
  ["reward", "bg", 3, "indicator"],
  ["reward", "surface", 3, "indicator"],
  ["accent", "bg", 3, "indicator"],
  ["accent", "surface", 3, "indicator"],
];

const requiredSemantic = [
  "bg",
  "surface",
  "surface-raised",
  "surface-sunken",
  "text",
  "text-muted",
  "accent",
  "on-accent",
  "link",
  "reward",
  "border",
  "border-strong",
  "focus",
  "success",
  "danger",
  "scrim",
];

describe("design tokens", () => {
  test("every semantic role is defined", () => {
    for (const role of requiredSemantic) {
      expect(tokens.has(`--color-${role}`), `--color-${role}`).toBe(true);
    }
  });

  test.each(pairs)("%s on %s is at least %s:1 (%s)", (fg, bg, min) => {
    const ratio = contrast(color(fg), color(bg));
    expect(
      ratio,
      `${fg} ${color(fg)} on ${bg} ${color(bg)} = ${ratio.toFixed(2)}`,
    ).toBeGreaterThanOrEqual(min);
  });

  test("touch target token is at least 48px and heritage radius is 16px", () => {
    expect(tokens.get("--touch-min")).toBe("48px");
    expect(tokens.get("--radius-lg")).toBe("16px");
  });

  test("components use semantic and scale tokens only, no colour literals", () => {
    const css = componentCss().replace(/\/\*[\s\S]*?\*\//g, "");
    const primitive =
      /var\(--(?:paper|soga|indigo|terracotta|gold)-\d+\)|var\(--(?:paper|soga|indigo|terracotta|gold)\)/;
    expect(primitive.exec(css)?.[0]).toBeUndefined();
    expect(/#[0-9a-f]{3,8}\b/i.exec(css)?.[0]).toBeUndefined();
    expect(/\brgba?\(/.exec(css)?.[0]).toBeUndefined();
  });
});
