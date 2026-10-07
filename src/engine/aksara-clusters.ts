import { javaneseCodepoints } from "./codepoints.ts";
import type { AksaraCluster, TextSpan } from "./convert-result.ts";
import { sandhanganPangkon } from "./sandhangan.ts";

// Cluster starters come from the official Unicode names, never from numeric
// ranges: every letter, digit and pada begins a cluster; signs, pangkon and
// ZWNJ continue it.
const starterCodepoints: ReadonlySet<number> = new Set(
  Object.entries(javaneseCodepoints)
    .filter(([name]) => /^JAVANESE (LETTER|DIGIT|PADA) /.test(name))
    .map(([, cp]) => cp),
);
const letterCodepoints: ReadonlySet<number> = new Set(
  Object.entries(javaneseCodepoints)
    .filter(([name]) => name.startsWith("JAVANESE LETTER "))
    .map(([, cp]) => cp),
);

/**
 * Start offsets of the clusters of `text`. A starter begins a cluster, except
 * a letter right after pangkon: that is a pasangan (or a subjoined swara) of
 * the current cluster.
 */
function clusterStarts(text: string): number[] {
  const pangkon = sandhanganPangkon.codepoint;
  const starts: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const cu = text.charCodeAt(i);
    const joins =
      letterCodepoints.has(cu) && i > 0 && text.charCodeAt(i - 1) === pangkon;
    if (i === 0 || (starterCodepoints.has(cu) && !joins)) starts.push(i);
  }
  return starts;
}

/** Index of the cluster that holds code unit `at` (starts is ascending). */
function clusterIndexAt(starts: readonly number[], at: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid]! <= at) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

function coalesce(spans: TextSpan[]): TextSpan[] {
  const sorted = spans
    .filter((s) => s.end > s.start)
    .sort((a, b) => a.start - b.start || a.end - b.end);
  const merged: TextSpan[] = [];
  for (const s of sorted) {
    const last = merged[merged.length - 1];
    if (last !== undefined && s.start <= last.end) {
      if (s.end > last.end)
        merged[merged.length - 1] = { start: last.start, end: s.end };
    } else {
      merged.push(s);
    }
  }
  return merged;
}

interface Piece {
  readonly start: number;
  readonly spans: TextSpan[];
}

/**
 * Builds an output string in pieces, each attributed to the input ranges that
 * produced it, and maps those ranges onto the output's written clusters. The
 * text is exactly what was written; the attribution only sits beside it.
 */
export class ClusterWriter {
  private out = "";
  private readonly pieces: Piece[] = [];

  get text(): string {
    return this.out;
  }

  /** Appends one piece of output; empty spans are dropped. */
  write(text: string, spans: readonly TextSpan[]): void {
    this.pieces.push({
      start: this.out.length,
      spans: spans.filter((s) => s.end > s.start),
    });
    this.out += text;
  }

  /** Adds input ranges to the last piece without writing any text. */
  attribute(spans: readonly TextSpan[]): void {
    const last = this.pieces[this.pieces.length - 1];
    if (last === undefined) return;
    last.spans.push(...spans.filter((s) => s.end > s.start));
  }

  /** Removes the final code unit (the trailing ZWNJ strip). */
  dropLast(): void {
    this.out = this.out.slice(0, -1);
  }

  finish(): { output: string; clusters: AksaraCluster[] } {
    const output = this.out;
    const starts = clusterStarts(output);
    if (starts.length === 0) return { output, clusters: [] };

    const perCluster: TextSpan[][] = starts.map(() => []);
    for (let p = 0; p < this.pieces.length; p++) {
      const piece = this.pieces[p]!;
      if (piece.spans.length === 0) continue;
      const start = Math.min(piece.start, output.length);
      const next = this.pieces[p + 1];
      const end =
        next === undefined
          ? output.length
          : Math.min(next.start, output.length);
      // A piece with no remaining text belongs to the code unit before it.
      const at = end > start ? start : start - 1;
      if (at < 0) continue;
      perCluster[clusterIndexAt(starts, at)]!.push(...piece.spans);
    }

    const clusters = starts.map((start, c): AksaraCluster => ({
      output: { start, end: starts[c + 1] ?? output.length },
      sources: coalesce(perCluster[c]!),
    }));
    return { output, clusters };
  }
}
