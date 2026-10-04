/**
 * Returns `text` with `replacement` inserted at `offset` (a UTF-16 index,
 * clamped to 0..text.length). The glyph picker composes aksara input this way.
 */
export function insertAtCursor(
  text: string,
  offset: number,
  replacement: string,
): string {
  const clamped = Math.min(Math.max(offset, 0), text.length);
  return text.slice(0, clamped) + replacement + text.slice(clamped);
}
