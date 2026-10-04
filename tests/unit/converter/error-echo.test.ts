import { expect, test } from "vitest";
import { splitAtIndex } from "../../../src/features/converter/error-echo.ts";

test("[P-U05] [W08] marks the character at the index", () => {
  expect(splitAtIndex("kuwi!", 4)).toEqual({
    before: "kuwi",
    marked: "!",
    after: "",
  });
  expect(splitAtIndex("qa", 0)).toEqual({
    before: "",
    marked: "q",
    after: "a",
  });
});

test("[P-U05] [W08] the mark extends to the whole code point", () => {
  expect(splitAtIndex("a😀b", 1)).toEqual({
    before: "a",
    marked: "😀",
    after: "b",
  });
});

test("[P-U05] [W08] an index past the end marks nothing", () => {
  expect(splitAtIndex("ka", 2)).toEqual({
    before: "ka",
    marked: "",
    after: "",
  });
  expect(splitAtIndex("ka", 9)).toEqual({
    before: "ka",
    marked: "",
    after: "",
  });
});
