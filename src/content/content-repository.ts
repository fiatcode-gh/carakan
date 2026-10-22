import { rulesetById, type Ruleset, type RulesetId } from "../engine/index.ts";
import { AksaraItem } from "./aksara-item.ts";
import { ConfusionPair } from "./confusion-pair.ts";
import {
  asArray,
  asObject,
  ContentFormatError,
  type JsonObject,
} from "./content-format-error.ts";
import { containsGlyph, rulesetGlyphIds } from "./glyph-universe.ts";
import { SandhanganItem } from "./sandhangan-item.ts";
import { RetiredUnit, Unit } from "./unit.ts";
import { Word } from "./word.ts";

/** The content of one ruleset, resolved from the shared files (spec 7: static JSON, versioned). */
export interface ContentData {
  readonly ruleset: Ruleset;
  readonly version: number;
  readonly aksara: readonly AksaraItem[];
  readonly sandhangan: readonly SandhanganItem[];
  /** Resolved for `ruleset`. */
  readonly words: readonly Word[];
  /** Units that apply to `ruleset`, file order. */
  readonly units: readonly Unit[];
  /** Unit ids that left the ladder; their completions map by glyphs. */
  readonly retiredUnits: readonly RetiredUnit[];
  /** Units of other rulesets: their completions map by glyphs (contract 2.4). */
  readonly otherRulesetUnits: readonly Unit[];
  readonly confusionPairs: readonly ConfusionPair[];
  /**
   * Teacher-curated chart examples: glyph id → words, in display order
   * (chart_examples.json, resolved against `words` at load). Keys outside
   * `glyphIds` are dropped (contract 2.4: only the active ruleset's letters).
   */
  readonly chartExamples: ReadonlyMap<string, readonly Word[]>;
  /** Universe glyph ids this ruleset has (`rulesetGlyphIds`). */
  readonly glyphIds: ReadonlySet<string>;
}

/** The parsed content files, shared by every ruleset view. */
export interface ContentSource {
  readonly version: number;
  readonly aksara: readonly AksaraItem[];
  readonly sandhangan: readonly SandhanganItem[];
  readonly wordEntries: readonly JsonObject[];
  readonly units: readonly Unit[];
  readonly retiredUnits: readonly RetiredUnit[];
  readonly confusionPairs: readonly ConfusionPair[];
  readonly examples: JsonObject;
}

/** Relative to the app base (`document.baseURI`) or to `public/` on disk. */
export const contentDir = "content/v1";

/**
 * Fetches and parses `content/v1/*.json` once. `load` is injected so tests
 * read from disk and the app fetches against its base URL; nothing here
 * touches the network.
 */
export async function readContent(
  load: (path: string) => Promise<string>,
): Promise<ContentSource> {
  const read = async (file: string, what: string) =>
    asObject(JSON.parse(await load(`${contentDir}/${file}`)), what);
  const manifest = await read("manifest.json", "manifest.json");
  const aksaraData = await read("aksara.json", "aksara.json");
  const sandhanganData = await read("sandhangan.json", "sandhangan.json");
  const wordsData = await read("words.json", "words.json");
  const unitsData = await read("units.json", "units.json");
  const pairsData = await read("confusion_pairs.json", "confusion_pairs.json");
  const examples = await read("chart_examples.json", "chart_examples.json");
  const objects = (data: Record<string, unknown>, key: string) =>
    asArray(data[key], key).map((raw) => asObject(raw, `${key} entry`));
  const version = manifest["contentVersion"];
  if (typeof version !== "number") {
    throw new ContentFormatError("manifest.json needs contentVersion");
  }
  return {
    version,
    aksara: objects(aksaraData, "items").map((raw) => AksaraItem.fromJson(raw)),
    sandhangan: objects(sandhanganData, "items").map((raw) =>
      SandhanganItem.fromJson(raw),
    ),
    wordEntries: objects(wordsData, "words"),
    units: objects(unitsData, "units").map((raw) => Unit.fromJson(raw)),
    retiredUnits: objects(unitsData, "retiredUnits").map((raw) =>
      RetiredUnit.fromJson(raw),
    ),
    confusionPairs: objects(pairsData, "pairs").map((raw) =>
      ConfusionPair.fromJson(raw),
    ),
    examples,
  };
}

/** The view of `source` for one ruleset. Throws `ContentFormatError` on bad data. */
export function contentFor(
  source: ContentSource,
  rulesetId: RulesetId,
): ContentData {
  const ruleset = rulesetById(rulesetId);
  const glyphIds = rulesetGlyphIds(ruleset);
  const words = source.wordEntries.map((raw) => Word.fromJson(raw, rulesetId));
  return {
    ruleset,
    version: source.version,
    aksara: source.aksara,
    sandhangan: source.sandhangan,
    words,
    units: source.units.filter((u) => u.appliesTo(rulesetId)),
    retiredUnits: source.retiredUnits,
    otherRulesetUnits: source.units.filter((u) => !u.appliesTo(rulesetId)),
    confusionPairs: source.confusionPairs,
    chartExamples: resolveChartExamples(source.examples, words, glyphIds),
    glyphIds,
  };
}

export async function loadContent(
  load: (path: string) => Promise<string>,
  rulesetId: RulesetId,
): Promise<ContentData> {
  return contentFor(await readContent(load), rulesetId);
}

function resolveChartExamples(
  data: Record<string, unknown>,
  words: readonly Word[],
  glyphIds: ReadonlySet<string>,
): Map<string, Word[]> {
  const byId = new Map(words.map((w) => [w.id, w] as const));
  const result = new Map<string, Word[]>();
  const examples = asObject(data["examples"], "examples");
  for (const [key, ids] of Object.entries(examples)) {
    if (!containsGlyph(key)) {
      throw new ContentFormatError(`chart_examples: unknown glyph "${key}"`);
    }
    const resolved = asArray(ids, key).map((id) => {
      const word = typeof id === "string" ? byId.get(id) : undefined;
      if (word === undefined) {
        throw new ContentFormatError(
          `chart_examples: unknown word id "${String(id)}" under "${key}"`,
        );
      }
      return word;
    });
    if (glyphIds.has(key)) result.set(key, resolved);
  }
  return result;
}
