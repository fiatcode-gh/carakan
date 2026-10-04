export interface ErrorEcho {
  readonly before: string;
  /** The whole code point at the error index; empty when the index is past the end. */
  readonly marked: string;
  readonly after: string;
}

/** Splits `text` around the code point at the UTF-16 `index` (W08). */
export function splitAtIndex(text: string, index: number): ErrorEcho {
  const point = index < text.length ? text.codePointAt(index) : undefined;
  if (point === undefined) return { before: text, marked: "", after: "" };
  const marked = String.fromCodePoint(point);
  return {
    before: text.slice(0, index),
    marked,
    after: text.slice(index + marked.length),
  };
}
