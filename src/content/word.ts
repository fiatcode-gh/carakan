import { toAksara, toLatin } from "../engine/index.ts";
import {
  ContentFormatError,
  optionalString,
  stringList,
  type JsonObject,
} from "./content-format-error.ts";
import { bitOf, pasanganCap } from "./glyph-universe.ts";

const vowelInitial = /^[aiueoéèěêāīū]/;

/**
 * One corpus word. Canonical Latin (JGST) only — never aksara (spec 7).
 * `requiredGlyphs` ids and `requiredCaps` are validated by the round-trip
 * test against the engine's own output (decision 5).
 */
export class Word {
  readonly id: string;
  readonly canonical: string;
  readonly displayPujl: string | null;
  readonly gloss: string;
  readonly requiredGlyphs: readonly string[];
  readonly requiredCaps: readonly string[];
  readonly audioKey: string;
  readonly source: string;

  #aksara: string | undefined;
  #display: string | undefined;

  constructor(init: {
    id: string;
    canonical: string;
    displayPujl?: string | null;
    gloss: string;
    requiredGlyphs: readonly string[];
    requiredCaps?: readonly string[];
    audioKey: string;
    source: string;
  }) {
    this.id = init.id;
    this.canonical = init.canonical;
    this.displayPujl = init.displayPujl ?? null;
    this.gloss = init.gloss;
    this.requiredGlyphs = init.requiredGlyphs;
    this.requiredCaps = init.requiredCaps ?? [];
    this.audioKey = init.audioKey;
    this.source = init.source;
  }

  /**
   * School-spelling display form (KAJ I PUJL columns, D10/D11): the override,
   * else `derivedSchoolSpelling`. Never the JGST canonical. Computed once.
   */
  get display(): string {
    this.#display ??= this.displayPujl ?? this.derivedSchoolSpelling;
    return this.#display;
  }

  /** Engine rendering of `canonical` (spec 7: aksara is derived, never stored). Computed once. */
  get aksara(): string {
    if (this.#aksara === undefined) {
      const res = toAksara(this.canonical);
      if (res.kind !== "success") {
        throw new Error(
          `corpus word ${this.id} does not convert: ${JSON.stringify(res)}`,
        );
      }
      this.#aksara = res.output;
    }
    return this.#aksara;
  }

  /**
   * The school-spelling derivation without the `displayPujl` override: the
   * engine's PUJL reading of `aksara` with the silent carrier h removed.
   */
  get derivedSchoolSpelling(): string {
    const res = toLatin(this.aksara, { scheme: "pujl" });
    if (res.kind !== "success") {
      throw new Error(
        `corpus word ${this.id} has no PUJL reading: ${JSON.stringify(res)}`,
      );
    }
    if (!this.hasSilentHaCarrier) return res.output;
    if (!res.output.startsWith("h")) {
      throw new Error(
        `corpus word ${this.id}: carrier h missing in ${res.output}`,
      );
    }
    return res.output.substring(1);
  }

  /**
   * v3 (KAJ I p.12, p.124): a vowel-initial canonical is written with the
   * ha carrier; its h is silent in school spelling and explicit in the
   * engine's JGST back-form (hasěm/ ↔ asem).
   */
  get hasSilentHaCarrier(): boolean {
    return vowelInitial.test(this.canonical);
  }

  get glyphBits(): bigint {
    return this.requiredGlyphs.reduce((acc, id) => acc | bitOf(id), 0n);
  }

  get capBits(): bigint {
    return this.requiredCaps.includes("pasangan") ? pasanganCap : 0n;
  }

  /**
   * "This learner can read this word": every required glyph bit and every
   * required capability bit is already taught (spec 7).
   */
  readableBy(taughtGlyphBits: bigint, taughtCapBits: bigint): boolean {
    return (
      (this.glyphBits & ~taughtGlyphBits) === 0n &&
      (this.capBits & ~taughtCapBits) === 0n
    );
  }

  static fromJson(json: JsonObject): Word {
    const { id, canonical, gloss } = json;
    if (
      typeof id !== "string" ||
      typeof canonical !== "string" ||
      typeof gloss !== "string"
    ) {
      throw new ContentFormatError(
        `word entry needs id/canonical/gloss: ${JSON.stringify(json)}`,
      );
    }
    return new Word({
      id,
      canonical,
      displayPujl: optionalString(json, "displayPujl"),
      gloss,
      requiredGlyphs: stringList(json, "requiredGlyphs"),
      requiredCaps: stringList(json, "requiredCaps"),
      audioKey: optionalString(json, "audioKey") ?? id,
      source: optionalString(json, "source") ?? "author",
    });
  }
}
