import { describe, expect, test } from "vitest";
import { ContentFormatError } from "../../src/content/content-format-error.ts";
import { parseShapeNotes } from "../../src/content/shape-note.ts";
import { nglegena } from "../../src/engine/index.ts";
import { readContentJson } from "../support/content-files.ts";

const shipped = () => readContentJson("shape_notes.json");

const withNotes = (notes: unknown) => ({
  version: 1,
  status: "draft",
  notes,
});

describe("[P-B21] shape-group notes", () => {
  test("the shipped file parses and covers exactly the 20 nglegena ids", () => {
    const notes = parseShapeNotes(shipped());
    expect([...notes.keys()].sort()).toEqual(nglegena.map((a) => a.id).sort());
  });

  test("ha's English note is the teacher's wording", () => {
    expect(parseShapeNotes(shipped()).get("ha")!.en).toBe(
      "ha is pa with one more leg.",
    );
  });

  test("no note contains aksara (U+A980–U+A9DF)", () => {
    for (const [key, note] of parseShapeNotes(shipped())) {
      for (const text of [note.id, note.en]) {
        for (const ch of text) {
          const cp = ch.codePointAt(0)!;
          expect(cp >= 0xa980 && cp <= 0xa9df, `${key}: ${text}`).toBe(false);
        }
      }
    }
  });

  test("a key that is not a nglegena id is rejected, naming the key", () => {
    const bad = withNotes({ wulu: { id: "x", en: "x" } });
    expect(() => parseShapeNotes(bad)).toThrow(ContentFormatError);
    expect(() => parseShapeNotes(bad)).toThrow(/wulu/);
  });

  test("an empty en is rejected, naming the key", () => {
    const bad = withNotes({ pa: { id: "Kait dan kaki.", en: "" } });
    expect(() => parseShapeNotes(bad)).toThrow(ContentFormatError);
    expect(() => parseShapeNotes(bad)).toThrow(/pa/);
  });

  test("a missing notes object is rejected", () => {
    expect(() => parseShapeNotes({ version: 1, status: "draft" })).toThrow(
      ContentFormatError,
    );
  });

  test("a non-string status is rejected", () => {
    expect(() => parseShapeNotes({ version: 1, status: 3, notes: {} })).toThrow(
      ContentFormatError,
    );
  });
});
