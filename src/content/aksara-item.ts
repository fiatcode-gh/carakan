import { angkaDigitToChar, javaneseChar } from "../engine/index.ts";
import {
  ContentFormatError,
  optionalString,
  type JsonObject,
} from "./content-format-error.ts";

/**
 * One chart item from aksara.json. The char string is always derived at
 * runtime from the engine (single source of truth); the JSON holds metadata
 * and display names only.
 */
export class AksaraItem {
  readonly id: string;
  readonly name: string;
  /** nglegena | murda | swara | rekan | angka | pada */
  readonly category: string;
  readonly unicodeName: string | null;
  readonly latinPujl: string | null;
  readonly latinJgst: string | null;
  /** angka items only. */
  readonly digit: number | null;
  readonly audioKey: string;

  constructor(init: {
    id: string;
    name: string;
    category: string;
    unicodeName?: string | null;
    latinPujl?: string | null;
    latinJgst?: string | null;
    digit?: number | null;
    audioKey: string;
  }) {
    this.id = init.id;
    this.name = init.name;
    this.category = init.category;
    this.unicodeName = init.unicodeName ?? null;
    this.latinPujl = init.latinPujl ?? null;
    this.latinJgst = init.latinJgst ?? null;
    this.digit = init.digit ?? null;
    this.audioKey = init.audioKey;
  }

  /**
   * Runtime glyph string derived from the engine (single source of truth):
   * digits via `angkaDigitToChar`, everything else via the Unicode name.
   * Non-null for every item the repository can produce (`fromJson` enforces
   * digit for angka, unicodeName for every other category).
   */
  get char(): string {
    return this.digit !== null
      ? angkaDigitToChar(this.digit)
      : javaneseChar(this.unicodeName!);
  }

  static fromJson(json: JsonObject): AksaraItem {
    const { id, name, category } = json;
    if (
      typeof id !== "string" ||
      typeof name !== "string" ||
      typeof category !== "string"
    ) {
      throw new ContentFormatError("aksara item needs id/name/category");
    }
    if (category === "angka" && !Number.isInteger(json["digit"])) {
      throw new ContentFormatError(`angka item needs digit: ${id}`);
    }
    // rekan entries carry no unicodeName by design (a rekan is a composition;
    // the chart derives its char from the engine directly, plan note).
    const unicodeName = json["unicodeName"];
    const hasName = typeof unicodeName === "string";
    const absent = unicodeName === undefined || unicodeName === null;
    if (
      !(hasName || absent) ||
      (category !== "angka" && category !== "rekan" && !hasName)
    ) {
      throw new ContentFormatError(
        `non-angka non-rekan item needs unicodeName: ${id}`,
      );
    }
    const digit = json["digit"];
    return new AksaraItem({
      id,
      name,
      category,
      unicodeName: optionalString(json, "unicodeName"),
      latinPujl: optionalString(json, "latinPujl"),
      latinJgst: optionalString(json, "latinJgst"),
      digit: typeof digit === "number" ? digit : null,
      audioKey: optionalString(json, "audioKey") ?? id,
    });
  }
}
