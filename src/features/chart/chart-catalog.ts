import type { AksaraItem } from "../../content/aksara-item.ts";
import type { SandhanganItem } from "../../content/sandhangan-item.ts";
import {
  angkaDigitToChar,
  angkaFlanker,
  cecakTelu,
  javaneseChar,
  nglegena,
  nglegenaById,
  padaActive,
  padaCatalogue,
  rekanById,
  type Ruleset,
  sandhanganPangkon,
  swara,
} from "../../engine/index.ts";

export type ChartTabId = "carakan" | "sandhangan" | "pasangan";

export type ChartSectionId =
  | "carakan"
  | "murda"
  | "swara"
  | "rekan"
  | "angka"
  | "pada"
  | "vowelChanging"
  | "syllableClosing"
  | "consonantModifying"
  | "vowelKiller"
  | "pasangan";

/** Sections whose entries are read as a syllable: their detail sheet has a Dengar button. */
const soundSections: ReadonlySet<ChartSectionId> = new Set([
  "carakan",
  "rekan",
  "pasangan",
]);
export function sectionHasSound(id: ChartSectionId): boolean {
  return soundSections.has(id);
}

export interface ChartEntry {
  readonly id: string;
  readonly name: string;
  /**
   * Shorter text for the tile's label strip when the name is too long for it;
   * the name stays the accessible name. Absent: the strip shows the name.
   */
  readonly tileLabel?: string;
  readonly char: string;
  /** e.g. `ha / ha`, or `na / na — has murda`. */
  readonly subtitle: string;
  /** The PUJL reading; null for angka and pada, which are not read as a syllable. */
  readonly reading: string | null;
}

export interface ChartSection {
  readonly id: ChartSectionId;
  readonly title: string;
  readonly entries: readonly ChartEntry[];
}

export interface ChartTab {
  readonly id: ChartTabId;
  readonly sections: readonly ChartSection[];
}

export interface ChartLocation {
  readonly tab: ChartTab;
  readonly section: ChartSection;
  readonly entry: ChartEntry;
  /** 1-based within the section. */
  readonly position: number;
}

/**
 * Display words the catalog composes into section titles and subtitles.
 * Built at the component layer from the message catalog, so this module
 * stays free of Svelte and of hardcoded UI text.
 */
export interface ChartStrings {
  readonly carakan: string;
  readonly sandhanganVowel: string;
  readonly sandhanganClosing: string;
  readonly sandhanganConsonant: string;
  readonly sandhanganKiller: string;
  readonly murda: string;
  readonly swara: string;
  readonly rekan: string;
  readonly angka: string;
  readonly pada: string;
  /** Title of the Pasangan tab's only section. */
  readonly pasangan: string;
  /** Appended to a carakan subtitle when the letter has a murda variant. */
  readonly murdaHint: string;
  /** How an angka digit is written in running text, given the flanked form. */
  readonly writtenAs: (form: string) => string;
  /** Name of a long swara form, given the base vowel name. */
  readonly longFormName: (name: string) => string;
  /** Name of a pasangan entry, given its base letter's name. */
  readonly pasanganName: (name: string) => string;
}

/**
 * Subjoined form of a letter: killed ka carrier + the letter (UTN47: pasangan
 * = base + pangkon + consonant; the font subjoins it).
 */
export function subjoinedForm(char: string): string {
  return javaneseChar("JAVANESE LETTER KA") + sandhanganPangkon.char + char;
}

export function pasanganString(baseId: string): string {
  const base = nglegenaById(baseId);
  if (base === null) throw new RangeError(`unknown nglegena: ${baseId}`);
  return subjoinedForm(base.char);
}

/** Pasangan entries are keyed after their base letter; the Pasangan tab's ids. */
const pasanganEntryPrefix = "pasangan-";

/** The base nglegena id of a Pasangan tab entry id, or null for any other id. */
export function pasanganBaseId(entryId: string): string | null {
  if (!entryId.startsWith(pasanganEntryPrefix)) return null;
  const baseId = entryId.slice(pasanganEntryPrefix.length);
  return nglegenaById(baseId) === null ? null : baseId;
}

/** The first entry with `id` in tab, then section order, or null. */
export function findChartEntry(
  tabs: readonly ChartTab[],
  id: string,
): ChartLocation | null {
  for (const tab of tabs) {
    for (const section of tab.sections) {
      const at = section.entries.findIndex((entry) => entry.id === id);
      if (at >= 0) {
        return { tab, section, entry: section.entries[at]!, position: at + 1 };
      }
    }
  }
  return null;
}

export function murdaVariant(baseId: string, ruleset: Ruleset): string | null {
  return ruleset.murda.find((m) => m.baseId === baseId)?.aksara.char ?? null;
}

export function rekanChar(rekanId: string): string {
  const r = rekanById(rekanId);
  if (r === null) throw new RangeError(`unknown rekan: ${rekanId}`);
  if (r.encodedAs !== null) return javaneseChar(r.encodedAs);
  if (r.baseUnicodeName !== null) {
    return javaneseChar(r.baseUnicodeName) + cecakTelu.char;
  }
  return (r.composition ?? []).map(javaneseChar).join("");
}

/** Sandhangan by function, in first-appearance order: the Sandhangan tab's sections. */
export function sandhanganGroups(
  sandhangan: readonly SandhanganItem[],
): ReadonlyMap<string, readonly SandhanganItem[]> {
  const byFunction = new Map<string, SandhanganItem[]>();
  for (const s of sandhangan) {
    const group = byFunction.get(s.function);
    if (group === undefined) byFunction.set(s.function, [s]);
    else group.push(s);
  }
  return byFunction;
}

export function angkaFlanked(digit: number): string {
  const flank = angkaFlanker.char;
  return flank + angkaDigitToChar(digit) + flank;
}

export function angkaPlain(digit: number): string {
  return angkaDigitToChar(digit);
}

function letterFor(baseId: string): string {
  switch (baseId) {
    case "a":
      return "A";
    case "u":
      return "U";
    case "o":
      return "O";
    case "paCerek":
      return "PA CEREK";
    case "ngaLelet":
      return "NGA LELET";
    default:
      return "A";
  }
}

/**
 * The full aksara chart as its three tabs, ungated. Chars always come from the
 * engine.
 */
export function buildChartTabs({
  aksara,
  sandhangan,
  strings,
  ruleset,
}: {
  aksara: readonly AksaraItem[];
  sandhangan: readonly SandhanganItem[];
  strings: ChartStrings;
  ruleset: Ruleset;
}): readonly ChartTab[] {
  const byId = new Map(aksara.map((a) => [a.id, a]));
  const nameOf = (id: string) => byId.get(id)?.name ?? id;

  const carakanSections: ChartSection[] = [];
  carakanSections.push({
    id: "carakan",
    title: strings.carakan,
    entries: nglegena.map((a) => ({
      id: a.id,
      name: nameOf(a.id),
      char: a.char,
      subtitle: `${a.latinPujl} / ${a.latinJgst}${
        murdaVariant(a.id, ruleset) !== null ? ` — ${strings.murdaHint}` : ""
      }`,
      reading: a.latinPujl,
    })),
  });

  carakanSections.push({
    id: "murda",
    title: strings.murda,
    entries: ruleset.murda.map((m) => ({
      id: m.aksara.id,
      name: nameOf(m.aksara.id),
      char: m.aksara.char,
      subtitle: `${m.aksara.latinPujl} / ${m.aksara.latinJgst}`,
      reading: m.aksara.latinPujl,
    })),
  });

  carakanSections.push({
    id: "swara",
    title: strings.swara,
    entries: [
      ...swara.map((s) => ({
        id: s.id,
        name: nameOf(s.id),
        char: s.char,
        subtitle: `${s.latinPujl} / ${s.latinJgst}`,
        reading: s.latinPujl,
      })),
      ...ruleset.swaraLongForms.map((f) => ({
        id: `long-${f.baseId}`,
        name: strings.longFormName(nameOf(f.baseId)),
        char:
          javaneseChar(`JAVANESE LETTER ${letterFor(f.baseId)}`) + f.tarungChar,
        subtitle: `${f.latinPujl} / ${f.latinJgst}`,
        reading: f.latinPujl,
      })),
      ...ruleset.swaraCatalogue.map((s) => ({
        id: s.id,
        name: nameOf(s.id),
        char: s.char,
        subtitle: `${s.latinPujl} / ${s.latinJgst}`,
        reading: s.latinPujl,
      })),
    ],
  });

  carakanSections.push({
    id: "rekan",
    title: strings.rekan,
    entries: ruleset.rekan.map((r) => ({
      id: r.id,
      name: nameOf(r.id),
      char: rekanChar(r.id),
      subtitle: `${r.latinPujl} / ${r.latinJgst}`,
      reading: r.latinPujl,
    })),
  });

  // Angka 0-9: the plain digit, subtitled with its flanked written form.
  carakanSections.push({
    id: "angka",
    title: strings.angka,
    entries: Array.from({ length: 10 }, (_, d) => ({
      id: `angka-${d}`,
      name: byId.get(`angka-${d}`)?.name ?? String(d),
      char: angkaPlain(d),
      subtitle: strings.writtenAs(angkaFlanked(d)),
      reading: null,
    })),
  });

  carakanSections.push({
    id: "pada",
    title: strings.pada,
    entries: [...padaActive, ...padaCatalogue].map((p) => ({
      id: p.id,
      name: nameOf(p.id),
      char: javaneseChar(p.unicodeName),
      subtitle: p.latin ?? "—",
      reading: null,
    })),
  });

  // Sandhangan grouped by function, in first-appearance order.
  const functionSections: Record<
    string,
    { id: ChartSectionId; title: string }
  > = {
    vowelChanging: { id: "vowelChanging", title: strings.sandhanganVowel },
    syllableClosing: {
      id: "syllableClosing",
      title: strings.sandhanganClosing,
    },
    consonantModifying: {
      id: "consonantModifying",
      title: strings.sandhanganConsonant,
    },
    vowelKiller: { id: "vowelKiller", title: strings.sandhanganKiller },
  };
  const sandhanganSections: ChartSection[] = [];
  for (const [fn, group] of sandhanganGroups(sandhangan)) {
    const meta = functionSections[fn];
    if (meta === undefined) throw new RangeError(`unknown function: ${fn}`);
    sandhanganSections.push({
      ...meta,
      entries: group.map((s) => ({
        id: s.id,
        name: s.name,
        char: s.carrierChar,
        subtitle: `${s.latinPujl} / ${s.latinJgst}`,
        reading: s.latinPujl,
      })),
    });
  }

  const pasanganSection: ChartSection = {
    id: "pasangan",
    title: strings.pasangan,
    entries: nglegena.map((a) => ({
      id: `${pasanganEntryPrefix}${a.id}`,
      name: strings.pasanganName(nameOf(a.id)),
      tileLabel: nameOf(a.id),
      char: pasanganString(a.id),
      subtitle: `${a.latinPujl} / ${a.latinJgst}`,
      reading: a.latinPujl,
    })),
  };

  return [
    { id: "carakan", sections: carakanSections },
    { id: "sandhangan", sections: sandhanganSections },
    { id: "pasangan", sections: [pasanganSection] },
  ];
}
