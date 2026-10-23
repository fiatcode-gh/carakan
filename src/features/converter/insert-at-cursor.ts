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

/** Reports the field's caret on select/input/click/keyup; returns the cleanup. */
export function trackCaret(
  field: HTMLInputElement | HTMLTextAreaElement,
  onCaret: (caret: number | null) => void,
): () => void {
  const track = () => onCaret(field.selectionStart);
  const events = ["select", "input", "click", "keyup"] as const;
  for (const name of events) field.addEventListener(name, track);
  return () => {
    for (const name of events) field.removeEventListener(name, track);
  };
}
