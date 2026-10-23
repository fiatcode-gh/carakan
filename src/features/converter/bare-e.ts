import type { BareE } from "../../engine/index.ts";

/** The two readings of a plain e (spec 6.2). */
export type EReading = "pepet" | "taling";

/** The accented letter each reading is typed as (tokenizer: ê = pepet, é = taling). */
export const eLetters: Readonly<Record<EReading, string>> = {
  taling: "\u00e9",
  pepet: "\u00ea",
};

/** One plain-e choice row: the e's input index, its word split around it, and its 1-based letter position in the word. */
export interface BareEChoice {
  readonly index: number;
  readonly word: string;
  readonly before: string;
  readonly marked: string;
  readonly after: string;
  readonly position: number;
}

export function bareEChoices(
  input: string,
  bareE: readonly BareE[],
): BareEChoice[] {
  return bareE.map(({ index, word }) => ({
    index,
    word: input.slice(word.start, word.end),
    before: input.slice(word.start, index),
    marked: input[index] ?? "",
    after: input.slice(index + 1, word.end),
    position: index - word.start + 1,
  }));
}

/** `text` with the plain e/E at `index` written as the reading's letter (case kept: Ê/É); unchanged when `text[index]` is not e/E. */
export function writeE(text: string, index: number, reading: EReading): string {
  const letter = text[index];
  if (letter !== "e" && letter !== "E") return text;
  const written =
    letter === "E" ? eLetters[reading].toUpperCase() : eLetters[reading];
  return text.slice(0, index) + written + text.slice(index + 1);
}
