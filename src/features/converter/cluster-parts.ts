import type { AksaraItem } from "../../content/aksara-item.ts";
import type { SandhanganItem } from "../../content/sandhangan-item.ts";
import {
  angkaCharToDigit,
  cecakTelu,
  codepointOf,
  javaneseChar,
  javaneseCodepoints,
  rekanById,
  sandhanganPangkon,
  sandhanganTaling,
  sandhanganTarung,
  toLatin,
  zeroWidthNonJoiner,
  type AksaraCluster,
} from "../../engine/index.ts";
import {
  angkaPlain,
  rekanChar,
  subjoinedForm,
} from "../chart/chart-catalog.ts";

export interface ClusterPart {
  /** Display aksara. */
  readonly char: string;
  /** Content name, or a derived Unicode short name. */
  readonly name: string;
  /** "" when none. */
  readonly sound: string;
  /** Id of a chart entry, null when the chart has none. */
  readonly chartId: string | null;
  /** Written as pasangan. */
  readonly subjoined: boolean;
}

const nameOfCodepoint: ReadonlyMap<number, string> = new Map(
  Object.entries(javaneseCodepoints).map(([name, cp]) => [cp, name]),
);

const letterPrefix = "JAVANESE LETTER ";
const signPrefixes = ["VOWEL SIGN ", "CONSONANT SIGN ", "SIGN "];
const shortNamePrefixes = [...signPrefixes, "LETTER ", "DIGIT "];
const haCarrier = javaneseChar(`${letterPrefix}HA`);
const dirgaMure = codepointOf("JAVANESE VOWEL SIGN DIRGA MURE");

/**
 * PUJL reading of vowel signs written on the ha carrier, without the
 * carrier's h; "" when the engine cannot read them.
 */
function signSound(signs: string): string {
  const r = toLatin(haCarrier + signs, { scheme: "pujl" });
  return r.kind === "success" && r.output.startsWith("h")
    ? r.output.slice(1)
    : "";
}

/** Unicode short name and display char of a code point with no content item. */
function fallbackPart(cp: number, subjoined: boolean): ClusterPart {
  const full = nameOfCodepoint.get(cp);
  const char = String.fromCodePoint(cp);
  if (full === undefined) {
    return {
      char,
      name: `u+${cp.toString(16)}`,
      sound: "",
      chartId: null,
      subjoined,
    };
  }
  const bare = full.replace(/^JAVANESE /, "");
  const prefix = shortNamePrefixes.find((p) => bare.startsWith(p));
  const name = (
    prefix === undefined ? bare : bare.slice(prefix.length)
  ).toLowerCase();
  const isSign = signPrefixes.some((p) => bare.startsWith(p));
  return {
    char: isSign ? haCarrier + char : char,
    name,
    sound: bare.startsWith("VOWEL SIGN ") ? signSound(char) : "",
    chartId: null,
    subjoined,
  };
}

/**
 * Breaks one written cluster's text into the parts a learner reads it from,
 * using only content data and the engine's code points.
 */
export class ClusterPartTable {
  private readonly aksaraByCodepoint: ReadonlyMap<number, AksaraItem>;
  private readonly angkaByDigit: ReadonlyMap<number, AksaraItem>;
  /** Two-codepoint rekan (letter + cecak telu, letter + tarung), keyed "a,b". */
  private readonly rekanByPair: ReadonlyMap<string, AksaraItem>;
  private readonly sandhanganByCodepoint: ReadonlyMap<number, SandhanganItem>;

  private constructor(init: {
    aksaraByCodepoint: ReadonlyMap<number, AksaraItem>;
    angkaByDigit: ReadonlyMap<number, AksaraItem>;
    rekanByPair: ReadonlyMap<string, AksaraItem>;
    sandhanganByCodepoint: ReadonlyMap<number, SandhanganItem>;
  }) {
    this.aksaraByCodepoint = init.aksaraByCodepoint;
    this.angkaByDigit = init.angkaByDigit;
    this.rekanByPair = init.rekanByPair;
    this.sandhanganByCodepoint = init.sandhanganByCodepoint;
  }

  static build(content: {
    aksara: readonly AksaraItem[];
    sandhangan: readonly SandhanganItem[];
  }): ClusterPartTable {
    const aksaraByCodepoint = new Map<number, AksaraItem>();
    const angkaByDigit = new Map<number, AksaraItem>();
    const rekanByPair = new Map<string, AksaraItem>();
    for (const item of content.aksara) {
      if (item.digit !== null) {
        if (!angkaByDigit.has(item.digit)) angkaByDigit.set(item.digit, item);
        continue;
      }
      if (item.unicodeName !== null) {
        const cp = codepointOf(item.unicodeName);
        if (!aksaraByCodepoint.has(cp)) aksaraByCodepoint.set(cp, item);
        continue;
      }
      const entry = rekanById(item.id);
      const pair =
        entry?.baseUnicodeName != null
          ? [codepointOf(entry.baseUnicodeName), cecakTelu.codepoint]
          : entry?.composition?.length === 2
            ? entry.composition.map(codepointOf)
            : null;
      if (pair !== null) rekanByPair.set(pair.join(","), item);
    }
    const sandhanganByCodepoint = new Map<number, SandhanganItem>();
    for (const item of content.sandhangan) {
      sandhanganByCodepoint.set(codepointOf(item.unicodeName), item);
    }
    return new ClusterPartTable({
      aksaraByCodepoint,
      angkaByDigit,
      rekanByPair,
      sandhanganByCodepoint,
    });
  }

  partsOf(clusterText: string): readonly ClusterPart[] {
    const cps = Array.from(clusterText, (c) => c.codePointAt(0)!);
    const parts: ClusterPart[] = [];
    let subjoinNext = false;
    for (let i = 0; i < cps.length; i++) {
      const cp = cps[i]!;
      if (cp === zeroWidthNonJoiner) continue;
      const isLetter = nameOfCodepoint.get(cp)?.startsWith(letterPrefix);
      if (cp === sandhanganPangkon.codepoint) {
        const next = cps[i + 1];
        if (
          next !== undefined &&
          nameOfCodepoint.get(next)?.startsWith(letterPrefix)
        ) {
          subjoinNext = true;
          continue;
        }
      }
      const subjoined = isLetter === true && subjoinNext;
      if (isLetter === true) subjoinNext = false;
      const rekanItem =
        isLetter === true && i + 1 < cps.length
          ? this.rekanByPair.get(`${cp},${cps[i + 1]}`)
          : undefined;
      if (rekanItem !== undefined) {
        const char = rekanChar(rekanItem.id);
        parts.push({
          char: subjoined ? subjoinedForm(char) : char,
          name: rekanItem.name,
          sound: rekanItem.latinPujl ?? "",
          chartId: rekanItem.id,
          subjoined,
        });
        i++;
        continue;
      }
      // Tarung after taling or dirga mure is part of one vowel (o, au),
      // not its own long a.
      if (
        (cp === sandhanganTaling.codepoint || cp === dirgaMure) &&
        cps[i + 1] === sandhanganTarung.codepoint
      ) {
        parts.push(this.tarungPairPart(cp));
        i++;
        continue;
      }
      parts.push(this.partOf(cp, subjoined));
    }
    return parts;
  }

  private tarungPairPart(first: number): ClusterPart {
    const signs = String.fromCodePoint(first, sandhanganTarung.codepoint);
    const firstName =
      this.sandhanganByCodepoint.get(first)?.id ??
      fallbackPart(first, false).name;
    return {
      char: haCarrier + signs,
      name: `${firstName} ${sandhanganTarung.id}`,
      sound: signSound(signs),
      chartId: null,
      subjoined: false,
    };
  }

  private partOf(cp: number, subjoined: boolean): ClusterPart {
    const char = String.fromCodePoint(cp);
    const sandhangan = this.sandhanganByCodepoint.get(cp);
    if (sandhangan !== undefined) {
      return {
        char: sandhangan.carrierChar,
        name: sandhangan.name,
        sound: sandhangan.latinPujl,
        chartId: sandhangan.id,
        subjoined,
      };
    }
    const digit = angkaCharToDigit(char);
    if (digit !== null) {
      const item = this.angkaByDigit.get(digit);
      if (item !== undefined) {
        return {
          char: angkaPlain(digit),
          name: item.name,
          sound: String(digit),
          chartId: item.id,
          subjoined,
        };
      }
    }
    const item = this.aksaraByCodepoint.get(cp);
    if (item !== undefined) {
      return {
        char: subjoined ? subjoinedForm(char) : char,
        name: item.name,
        sound: item.latinPujl ?? "",
        chartId: item.id,
        subjoined,
      };
    }
    return fallbackPart(cp, subjoined);
  }
}

/** The cluster's source text, in order, joined without separators ("k" + "lu" = "klu"). */
export function clusterReading(input: string, cluster: AksaraCluster): string {
  return cluster.sources.map((s) => input.slice(s.start, s.end)).join("");
}
