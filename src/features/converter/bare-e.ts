/** The two readings of a plain e (spec 6.2). */
export type EReading = "pepet" | "taling";

/** The accented letter each reading is typed as (tokenizer: ê = pepet, é = taling). */
export const eLetters: Readonly<Record<EReading, string>> = {
  taling: "\u00e9",
  pepet: "\u00ea",
};
