import { displayCoverage } from "./display-coverage.ts";

function covered(codePoint: number): boolean {
  let low = 0;
  let high = displayCoverage.length - 1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    const [start, end] = displayCoverage[mid]!;
    if (codePoint < start) high = mid - 1;
    else if (codePoint > end) low = mid + 1;
    else return true;
  }
  return false;
}

/** True when every code point of `text`, as stored, has a Bricolage glyph. */
export function isDisplayCovered(text: string): boolean {
  for (const char of text) {
    if (!covered(char.codePointAt(0)!)) return false;
  }
  return true;
}

/** One font per reading, never mixed: Bricolage when fully covered, else MPLUS. */
export function readingFontClass(
  text: string,
): "reading--display" | "reading--latin" {
  return isDisplayCovered(text) ? "reading--display" : "reading--latin";
}
