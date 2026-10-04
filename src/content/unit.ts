import {
  asArray,
  ContentFormatError,
  optionalString,
  stringList,
  type JsonObject,
} from "./content-format-error.ts";
import { bitOf, containsGlyph, pasanganCap } from "./glyph-universe.ts";

/**
 * One curriculum unit (spec 4.1 order). `glyphs` may contain universe ids
 * (nglegena/sandhangan/murda/swara) or pasangan items (`'pasangan-<baseId>'`);
 * `caps` carries capability bits ('pasangan').
 */
export class Unit {
  readonly id: string;
  readonly name: string;
  readonly glyphs: readonly string[];
  readonly caps: readonly string[];
  /** 'previous' — the previous unit must be completed. */
  readonly unlock: string;

  constructor(init: {
    id: string;
    name: string;
    glyphs: readonly string[];
    caps?: readonly string[];
    unlock: string;
  }) {
    this.id = init.id;
    this.name = init.name;
    this.glyphs = init.glyphs;
    this.caps = init.caps ?? [];
    this.unlock = init.unlock;
  }

  get glyphBits(): bigint {
    return this.glyphs
      .filter(containsGlyph)
      .reduce((acc, g) => acc | bitOf(g), 0n);
  }

  get capBits(): bigint {
    return this.caps.includes("pasangan") ? pasanganCap : 0n;
  }

  static fromJson(json: JsonObject): Unit {
    const { id, name } = json;
    if (typeof id !== "string" || typeof name !== "string") {
      throw new ContentFormatError(
        `unit needs id and name: ${JSON.stringify(json)}`,
      );
    }
    asArray(json["glyphs"], "glyphs");
    return new Unit({
      id,
      name,
      glyphs: stringList(json, "glyphs"),
      caps: stringList(json, "caps"),
      unlock: optionalString(json, "unlock") ?? "previous",
    });
  }
}
