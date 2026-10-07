import type { TextSpan } from "../../engine/index.ts";

export interface EchoPart {
  readonly text: string;
  readonly marked: boolean;
}

/** Splits `text` into unmarked and marked runs; `spans` are sorted, disjoint UTF-16 ranges (engine invariant). */
export function markSpans(
  text: string,
  spans: readonly TextSpan[],
): readonly EchoPart[] {
  const parts: EchoPart[] = [];
  let cursor = 0;
  for (const span of spans) {
    const start = Math.max(span.start, cursor);
    const end = Math.min(span.end, text.length);
    if (end <= start) continue;
    if (start > cursor) {
      parts.push({ text: text.slice(cursor, start), marked: false });
    }
    parts.push({ text: text.slice(start, end), marked: true });
    cursor = end;
  }
  if (cursor < text.length) {
    parts.push({ text: text.slice(cursor), marked: false });
  }
  return parts;
}
