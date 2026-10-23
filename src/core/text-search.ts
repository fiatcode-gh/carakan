/** Lower case, no accents, and every run of punctuation or spaces as one space. */
function fold(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

/** Whether `query` starts the folded text or any of its words. */
function startsAWord(folded: string, query: string): boolean {
  let at = 0;
  while (at <= folded.length) {
    if (folded.startsWith(query, at)) return true;
    const space = folded.indexOf(" ", at);
    if (space < 0) return false;
    at = space + 1;
  }
  return false;
}

/** True when one of the texts has a word that starts with the query; null texts never match. */
export type SearchMatcher = (
  ...texts: readonly (string | null | undefined)[]
) => boolean;

/**
 * The one rule of the picker and the chart search: an entry matches when its
 * name, or its Latin reading, has a word starting with the query (several
 * query words must follow each other), ignoring case, accents and
 * punctuation. A blank query has no matcher: everything shows.
 */
export function searchMatcher(query: string): SearchMatcher | null {
  const folded = fold(query);
  if (folded === "") return null;
  return (...texts) =>
    texts.some((text) => text != null && startsAWord(fold(text), folded));
}
