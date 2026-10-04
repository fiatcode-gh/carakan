import type { AksaraItem } from "../../content/aksara-item.ts";
import type { SandhanganItem } from "../../content/sandhangan-item.ts";
import {
  angkaDigitToChar,
  angkaFlanker,
  cecakTelu,
  javaneseChar,
  murdaFor,
  murdaLinks,
  nglegena,
  nglegenaById,
  padaActive,
  padaCatalogue,
  rekan,
  rekanById,
  sandhanganPangkon,
  swara,
  swaraCatalogue,
  swaraLongForms,
} from "../../engine/index.ts";

export interface ChartEntry {
  readonly id: string;
  readonly name: string;
  readonly char: string;
  /** e.g. `ha / ha`, or `na / na — has murda`. */
  readonly subtitle: string;
}

export interface ChartSection {
  readonly title: string;
  readonly entries: readonly ChartEntry[];
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
  /** Appended to a carakan subtitle when the letter has a murda variant. */
  readonly murdaHint: string;
  /** How an angka digit is written in running text, given the flanked form. */
  readonly writtenAs: (form: string) => string;
  /** Name of a long swara form, given the base vowel name. */
  readonly longFormName: (name: string) => string;
}

/**
 * Subjoined form: killed ka carrier + the base letter (UTN47: pasangan =
 * base + pangkon + consonant; the font subjoins it).
 */
export function pasanganString(baseId: string): string {
  const base = nglegenaById(baseId);
  if (base === null) throw new RangeError(`unknown nglegena: ${baseId}`);
  return (
    javaneseChar("JAVANESE LETTER KA") + sandhanganPangkon.char + base.char
  );
}

export function murdaVariant(baseId: string): string | null {
  return murdaFor(baseId)?.aksara.char ?? null;
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

/** The full aksara chart, ungated. Chars always come from the engine. */
export function buildChartSections({
  aksara,
  sandhangan,
  strings,
}: {
  aksara: readonly AksaraItem[];
  sandhangan: readonly SandhanganItem[];
  strings: ChartStrings;
}): ChartSection[] {
  const byId = new Map(aksara.map((a) => [a.id, a]));
  const nameOf = (id: string) => byId.get(id)?.name ?? id;
  const result: ChartSection[] = [];

  result.push({
    title: strings.carakan,
    entries: nglegena.map((a) => ({
      id: a.id,
      name: nameOf(a.id),
      char: a.char,
      subtitle: `${a.latinPujl} / ${a.latinJgst}${
        murdaVariant(a.id) !== null ? ` — ${strings.murdaHint}` : ""
      }`,
    })),
  });

  // Sandhangan grouped by function, in first-appearance order.
  const functionTitles: Record<string, string> = {
    vowelChanging: strings.sandhanganVowel,
    syllableClosing: strings.sandhanganClosing,
    consonantModifying: strings.sandhanganConsonant,
    vowelKiller: strings.sandhanganKiller,
  };
  const byFunction = new Map<string, SandhanganItem[]>();
  for (const s of sandhangan) {
    const group = byFunction.get(s.function);
    if (group === undefined) byFunction.set(s.function, [s]);
    else group.push(s);
  }
  for (const [fn, group] of byFunction) {
    const title = functionTitles[fn];
    if (title === undefined) throw new RangeError(`unknown function: ${fn}`);
    result.push({
      title,
      entries: group.map((s) => ({
        id: s.id,
        name: s.name,
        char: s.carrierChar,
        subtitle: `${s.latinPujl} / ${s.latinJgst}`,
      })),
    });
  }

  result.push({
    title: strings.murda,
    entries: murdaLinks.map((m) => ({
      id: m.aksara.id,
      name: nameOf(m.aksara.id),
      char: m.aksara.char,
      subtitle: `${m.aksara.latinPujl} / ${m.aksara.latinJgst}`,
    })),
  });

  result.push({
    title: strings.swara,
    entries: [
      ...swara.map((s) => ({
        id: s.id,
        name: nameOf(s.id),
        char: s.char,
        subtitle: `${s.latinPujl} / ${s.latinJgst}`,
      })),
      ...[...swaraLongForms.values()].map((f) => ({
        id: `long-${f.baseId}`,
        name: strings.longFormName(nameOf(f.baseId)),
        char:
          javaneseChar(`JAVANESE LETTER ${letterFor(f.baseId)}`) + f.tarungChar,
        subtitle: `${f.latinPujl} / ${f.latinJgst}`,
      })),
      ...swaraCatalogue.map((s) => ({
        id: s.id,
        name: nameOf(s.id),
        char: s.char,
        subtitle: `${s.latinPujl} / ${s.latinJgst}`,
      })),
    ],
  });

  result.push({
    title: strings.rekan,
    entries: rekan.map((r) => ({
      id: r.id,
      name: nameOf(r.id),
      char: rekanChar(r.id),
      subtitle: `${r.latinPujl} / ${r.latinJgst}`,
    })),
  });

  // Angka 0-9: the plain digit, subtitled with its flanked written form.
  result.push({
    title: strings.angka,
    entries: Array.from({ length: 10 }, (_, d) => ({
      id: `angka-${d}`,
      name: byId.get(`angka-${d}`)?.name ?? String(d),
      char: angkaPlain(d),
      subtitle: strings.writtenAs(angkaFlanked(d)),
    })),
  });

  result.push({
    title: strings.pada,
    entries: [...padaActive, ...padaCatalogue].map((p) => ({
      id: p.id,
      name: nameOf(p.id),
      char: javaneseChar(p.unicodeName),
      subtitle: p.latin ?? "—",
    })),
  });

  return result;
}
