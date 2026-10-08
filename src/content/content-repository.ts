import { AksaraItem } from "./aksara-item.ts";
import { ConfusionPair } from "./confusion-pair.ts";
import {
  asArray,
  asObject,
  ContentFormatError,
} from "./content-format-error.ts";
import { containsGlyph } from "./glyph-universe.ts";
import { SandhanganItem } from "./sandhangan-item.ts";
import { RetiredUnit, Unit } from "./unit.ts";
import { Word } from "./word.ts";

/** Content data loaded once at startup (spec 7: static JSON, versioned). */
export interface ContentData {
  readonly version: number;
  readonly aksara: readonly AksaraItem[];
  readonly sandhangan: readonly SandhanganItem[];
  readonly words: readonly Word[];
  readonly units: readonly Unit[];
  /** Unit ids that left the ladder; their completions map by glyphs. */
  readonly retiredUnits: readonly RetiredUnit[];
  readonly confusionPairs: readonly ConfusionPair[];
  /**
   * Teacher-curated chart examples: glyph id → words, in display order
   * (chart_examples.json, resolved against `words` at load).
   */
  readonly chartExamples: ReadonlyMap<string, readonly Word[]>;
}

/** Relative to the app base (`document.baseURI`) or to `public/` on disk. */
export const contentDir = "content/v1";

/**
 * Loads `content/v1/*.json`. `load` is injected so tests read from disk and
 * the app fetches against its base URL; nothing here touches the network.
 */
export async function loadContent(
  load: (path: string) => Promise<string>,
): Promise<ContentData> {
  const read = async (file: string, what: string) =>
    asObject(JSON.parse(await load(`${contentDir}/${file}`)), what);
  const manifest = await read("manifest.json", "manifest.json");
  const aksaraData = await read("aksara.json", "aksara.json");
  const sandhanganData = await read("sandhangan.json", "sandhangan.json");
  const wordsData = await read("words.json", "words.json");
  const unitsData = await read("units.json", "units.json");
  const pairsData = await read("confusion_pairs.json", "confusion_pairs.json");
  const examplesData = await read("chart_examples.json", "chart_examples.json");
  const objects = (data: Record<string, unknown>, key: string) =>
    asArray(data[key], key).map((raw) => asObject(raw, `${key} entry`));
  const words = objects(wordsData, "words").map((raw) => Word.fromJson(raw));
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
    words,
    units: objects(unitsData, "units").map((raw) => Unit.fromJson(raw)),
    retiredUnits: objects(unitsData, "retiredUnits").map((raw) =>
      RetiredUnit.fromJson(raw),
    ),
    confusionPairs: objects(pairsData, "pairs").map((raw) =>
      ConfusionPair.fromJson(raw),
    ),
    chartExamples: resolveChartExamples(examplesData, words),
  };
}

function resolveChartExamples(
  data: Record<string, unknown>,
  words: readonly Word[],
): Map<string, Word[]> {
  const byId = new Map(words.map((w) => [w.id, w] as const));
  const result = new Map<string, Word[]>();
  const examples = asObject(data["examples"], "examples");
  for (const [key, ids] of Object.entries(examples)) {
    if (!containsGlyph(key)) {
      throw new ContentFormatError(`chart_examples: unknown glyph "${key}"`);
    }
    result.set(
      key,
      asArray(ids, key).map((id) => {
        const word = typeof id === "string" ? byId.get(id) : undefined;
        if (word === undefined) {
          throw new ContentFormatError(
            `chart_examples: unknown word id "${String(id)}" under "${key}"`,
          );
        }
        return word;
      }),
    );
  }
  return result;
}
