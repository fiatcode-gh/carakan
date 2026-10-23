import { nglegenaById } from "../engine/index.ts";
import {
  asObject,
  ContentFormatError,
  type JsonObject,
} from "./content-format-error.ts";

/** A teacher's one-line hint on how a base letter's shape groups with others (D9). */
export interface ShapeNote {
  readonly id: string;
  readonly en: string;
}

function nonEmptyString(note: JsonObject, key: string, glyph: string): string {
  const value = note[key];
  if (typeof value !== "string" || value === "") {
    throw new ContentFormatError(
      `shape_notes: "${glyph}" needs a non-empty "${key}"`,
    );
  }
  return value;
}

/** `shape_notes.json` → nglegena id → note. Throws `ContentFormatError` naming the bad key. */
export function parseShapeNotes(
  json: JsonObject,
): ReadonlyMap<string, ShapeNote> {
  if (typeof json["status"] !== "string") {
    throw new ContentFormatError("shape_notes: status must be a string");
  }
  const notes = asObject(json["notes"], "shape_notes notes");
  const parsed = new Map<string, ShapeNote>();
  for (const [key, raw] of Object.entries(notes)) {
    if (nglegenaById(key) === null) {
      throw new ContentFormatError(`shape_notes: unknown nglegena "${key}"`);
    }
    const note = asObject(raw, `shape_notes "${key}"`);
    parsed.set(key, {
      id: nonEmptyString(note, "id", key),
      en: nonEmptyString(note, "en", key),
    });
  }
  return parsed;
}
