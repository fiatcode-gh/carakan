import { describe, expect, test } from "vitest";
import { markSpans } from "../../../src/features/converter/source-echo.ts";

const part = (text: string, marked: boolean) => ({ text, marked });

describe("markSpans", () => {
  test("[P-U10] splits text into unmarked and marked runs", () => {
    expect(
      markSpans("bapak lunga", [
        { start: 4, end: 5 },
        { start: 6, end: 8 },
      ]),
    ).toEqual([
      part("bapa", false),
      part("k", true),
      part(" ", false),
      part("lu", true),
      part("nga", false),
    ]);
  });

  test("[P-U10] no spans is one unmarked part", () => {
    expect(markSpans("kita", [])).toEqual([part("kita", false)]);
  });

  test("[P-U10] a span at the start or the end", () => {
    expect(markSpans("kita", [{ start: 0, end: 2 }])).toEqual([
      part("ki", true),
      part("ta", false),
    ]);
    expect(markSpans("kita", [{ start: 2, end: 4 }])).toEqual([
      part("ki", false),
      part("ta", true),
    ]);
  });

  test("[P-U10] a span past the end is clamped; empty spans are skipped", () => {
    expect(
      markSpans("kita", [
        { start: 1, end: 1 },
        { start: 3, end: 9 },
      ]),
    ).toEqual([part("kit", false), part("a", true)]);
    expect(markSpans("kita", [{ start: 7, end: 9 }])).toEqual([
      part("kita", false),
    ]);
  });

  test("[P-U10] an empty text gives no parts", () => {
    expect(markSpans("", [])).toEqual([]);
    expect(markSpans("", [{ start: 0, end: 1 }])).toEqual([]);
  });
});
