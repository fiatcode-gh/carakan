import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  loadContent,
  type ContentData,
} from "../../../src/content/content-repository.ts";
import {
  GlyphInfoTable,
  type GlyphInfo,
} from "../../../src/content/glyph-info-table.ts";

/**
 * Answers lesson and drill questions from outside the page. It rebuilds the
 * glyph table from the shipped content with the app's own modules, so the
 * production DOM carries no answer hints.
 */
export interface Solver {
  readonly content: ContentData;
  readonly table: GlyphInfoTable;
  /** The index of the right option for a question as shown. */
  correctIndex(prompt: QuestionPrompt, options: readonly string[]): number;
  /** The glyph ids a question is about (a sound can name several glyphs). */
  targetIds(prompt: QuestionPrompt): string[];
  /** The index of the option that stands for `glyphId`, or -1. */
  optionFor(
    glyphId: string,
    prompt: QuestionPrompt,
    options: readonly string[],
  ): number;
}

/** Glyph to sound shows an aksara char; sound to glyph shows a PUJL string. */
export type QuestionPrompt =
  { readonly glyph: string } | { readonly sound: string };

export async function createSolver(): Promise<Solver> {
  const content = await loadContent(async (path) =>
    readFileSync(join("public", path), "utf8"),
  );
  const table = GlyphInfoTable.build(content);
  const entries: GlyphInfo[] = [...table.byId.values()];
  const byChar = (char: string) => entries.filter((e) => e.char === char);
  const bySound = (sound: string) =>
    entries.filter((e) => e.pujl === sound && !e.id.startsWith("pasangan-"));

  const charOrSound = (info: GlyphInfo, prompt: QuestionPrompt) =>
    "glyph" in prompt ? info.pujl : info.char;

  return {
    content,
    table,
    correctIndex(prompt, options) {
      const index =
        "glyph" in prompt
          ? options.indexOf(byChar(prompt.glyph)[0]?.pujl ?? "")
          : options.findIndex((o) =>
              byChar(o).some((e) => e.pujl === prompt.sound),
            );
      if (index < 0) {
        throw new Error(`no right option for ${JSON.stringify(prompt)}`);
      }
      return index;
    },
    targetIds(prompt) {
      return (
        "glyph" in prompt ? byChar(prompt.glyph) : bySound(prompt.sound)
      ).map((e) => e.id);
    },
    optionFor(glyphId, prompt, options) {
      const info = table.byId.get(glyphId);
      return info === undefined
        ? -1
        : options.indexOf(charOrSound(info, prompt));
    },
  };
}
