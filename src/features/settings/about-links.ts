/** Served paths of the license texts and the word corpus (W09). */
export const FONT_LINKS: readonly string[] = [
  "licenses/NOTICE-fonts.txt",
  "licenses/ofl-mplus.txt",
  "licenses/lucide-LICENSE.txt",
];

export const CORPUS_LINKS: readonly string[] = ["content/v1/words.json"];

export const fileName = (path: string): string =>
  path.slice(path.lastIndexOf("/") + 1);
