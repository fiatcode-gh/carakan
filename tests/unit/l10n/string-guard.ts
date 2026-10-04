/**
 * Scanners behind the hard-coded UI string guard (spec 12): UI text lives in
 * src/l10n/*.json, never in component or logic code. Three nets, because any
 * one alone leaks:
 *   1. markup: visible text and displayed attributes in .svelte templates;
 *   2. Indonesian prose markers in any string literal;
 *   3. `{@html}` (SEC): never render unescaped markup.
 */

export interface Offender {
  line: number;
  text: string;
}

/** Tokens that are script names / glyph codes, not prose. */
const ALLOWED_TOKENS = /\b(?:PUJL|JGST)\b/g;

const DISPLAYED_ATTRIBUTES = [
  "aria-label",
  "aria-description",
  "title",
  "placeholder",
  "alt",
  "label",
];

/** Indonesian words that only appear in user-facing prose, never in ids. */
export const INDONESIAN_MARKERS = [
  " dan ",
  " yang ",
  " untuk ",
  " dengan ",
  " tidak ",
  " atau ",
  " dari ",
  " semua ",
  " setiap ",
  " hanya ",
  " sebelum ",
  " langsung ",
  "Belajar",
  "Ulangi",
  "Salin",
  "Batal",
  "Lanjut",
  "Belum tepat",
  "Kembali",
  "Soal ",
  "Bunyi",
  "Fungsi",
  "Contoh",
  "Versi ",
  "Aturan",
  "Sumber",
  "Korpus",
  "Bagan",
  "ditulis",
  "panjang",
  "Sandhangan ",
  "Pemati",
  "Latihan",
  "Mudah",
  "Bagus",
  "Agak sulit",
  "Untuk Guru",
  "Apa yang",
  "Laporan",
  "kotak-kotak",
  "Selesai",
  "ada murda",
  "Tidak ada",
  "Urutan",
];

/** Replaces every non-newline character with a space so line numbers survive. */
function blank(s: string): string {
  return s.replace(/[^\n]/g, " ");
}

function blankMatches(source: string, pattern: RegExp): string {
  return source.replace(pattern, blank);
}

/** Blanks every `{…}` block, including nested braces and quoted strings. */
function blankBraceBlocks(source: string): string {
  let out = "";
  let i = 0;
  while (i < source.length) {
    if (source[i] !== "{") {
      out += source[i];
      i += 1;
      continue;
    }
    let depth = 0;
    let quote: string | null = null;
    let j = i;
    for (; j < source.length; j++) {
      const c = source[j]!;
      if (quote) {
        if (c === "\\") j += 1;
        else if (c === quote) quote = null;
      } else if (c === "'" || c === '"' || c === "`") {
        quote = c;
      } else if (c === "{") {
        depth += 1;
      } else if (c === "}") {
        depth -= 1;
        if (depth === 0) break;
      }
    }
    out += blank(source.slice(i, j + 1));
    i = j + 1;
  }
  return out;
}

function lineOf(source: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index; i++) if (source[i] === "\n") line += 1;
  return line;
}

/** Net 1: visible text and displayed attribute literals in a Svelte template. */
export function scanSvelteMarkup(source: string): Offender[] {
  const offenders: Offender[] = [];
  let markup = blankMatches(source, /<script\b[\s\S]*?<\/script>/gi);
  markup = blankMatches(markup, /<style\b[\s\S]*?<\/style>/gi);
  markup = blankMatches(markup, /<!--[\s\S]*?-->/g);

  const attribute = new RegExp(
    `(?<![\\w-])(${DISPLAYED_ATTRIBUTES.join("|")})\\s*=\\s*(?:"([^"]*)"|'([^']*)')`,
    "g",
  );
  for (const m of markup.matchAll(attribute)) {
    const value = m[2] ?? m[3] ?? "";
    if (value.includes("{") || !/\p{L}/u.test(value)) continue;
    offenders.push({
      line: lineOf(markup, m.index),
      text: `${m[1]}="${value}"`,
    });
  }

  let text = blankBraceBlocks(markup);
  text = blankMatches(text, /<\/?[A-Za-z][^>]*>/g);
  text = blankMatches(text, /&(?:#\d+|#x[\da-f]+|\w+);/gi);
  text = text.replace(ALLOWED_TOKENS, blank);
  text.split("\n").forEach((raw, i) => {
    if (/\p{L}/u.test(raw)) offenders.push({ line: i + 1, text: raw.trim() });
  });
  return offenders.sort((a, b) => a.line - b.line);
}

function isCommentLine(line: string): boolean {
  const t = line.trimStart();
  return (
    t.startsWith("//") ||
    t.startsWith("*") ||
    t.startsWith("/*") ||
    t.startsWith("<!--")
  );
}

function markerIn(value: string): boolean {
  return INDONESIAN_MARKERS.some((m) => value.includes(m));
}

/** Net 2: Indonesian prose markers in string literals on non-comment lines. */
export function scanProseLiterals(source: string): Offender[] {
  const offenders: Offender[] = [];
  const lines = source.split("\n");
  const literal = /(['"])((?:\\.|(?!\1)[^\\\n])*)\1/g;
  lines.forEach((line, i) => {
    if (isCommentLine(line)) return;
    for (const m of line.matchAll(literal)) {
      const value = m[2] ?? "";
      if (markerIn(value)) offenders.push({ line: i + 1, text: value });
    }
  });

  const code = lines.map((l) => (isCommentLine(l) ? "" : l)).join("\n");
  for (const m of code.matchAll(/`((?:\\.|[^`\\])*)`/g)) {
    const chunks = (m[1] ?? "").replace(/\$\{[^}]*\}/g, "\u0000");
    if (markerIn(chunks)) {
      offenders.push({ line: lineOf(code, m.index), text: chunks });
    }
  }
  return offenders.sort((a, b) => a.line - b.line);
}

/** Net 3 (SEC): `{@html …}` in a Svelte file. */
export function scanRawHtml(source: string): Offender[] {
  const offenders: Offender[] = [];
  for (const m of source.matchAll(/\{\s*@html\b[^}]*\}?/g)) {
    offenders.push({ line: lineOf(source, m.index), text: m[0] });
  }
  return offenders;
}
