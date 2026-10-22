// Shaping case dump: port of app/tool/shaping/dump_cases.dart @ebc7cb5.
// Usage (from the repo root):
//   node tools/shaping/dump-cases.ts [--clusters] [--ruleset <id>] [extra...] > out.tsv
// Inputs: every corpus canonical in public/content/v1/words.json, the v3
// sentence cases, the taling intent cases (with the expected drawn order of
// letters + TALING, Unicode short names), plus extra CLI args ("murda:"
// prefix = useMurda). Errors/ambiguities print as '#' lines so nothing is
// silently dropped.
// --clusters: each line is "label<TAB>aksara<TAB>s1,s2,..." with the engine
// cluster output starts (UTF-16 offsets); the taling expectation is omitted.
// --ruleset <id>: absent = KAJ v3 exactly as the Dart dumper (byte-compared).
// "pedoman-2002-v1" = the corpus under its Pedoman canonicals, the Pedoman
// sentence cases and the chart-only rekan (kha dza za gha); no Dart oracle.
import { readFileSync } from "node:fs";

import { Word } from "../../src/content/word.ts";
import type { RulesetId, ToAksaraSuccess } from "../../src/engine/index.ts";
import {
  cecakTelu,
  isRulesetId,
  javaneseChar,
  pedomanRulesetId,
  rekanCatalogue,
  toAksara,
} from "../../src/engine/index.ts";

export const v3Cases: readonly string[] = [
  "bapak lunga",
  "bapak ibu",
  "bapak, ibu",
  "bapak/ hibu",
  "bapak/hibu",
  "sěk/lěk",
  "ṅajak/abdul/",
  "bapak.",
  "bapak",
  "bapak,",
  "lunga, ibu.",
  "ngajak Abdul",
  "pak Airlangga",
  "mènèk klapa",
  "mangan kwèni",
  "anak kyai",
  "liwat kṛtěg",
  "bapak lěmah",
  "jaklěk",
  "boy",
  "wow",
  "joyko",
  "royko",
  "bapak, énak",
  "ěmpu",
  "bapak rěsik",
  "maaf, ibu",
  "layang, ibu",
  "bapak 17",
  "murda:Paku Alam",
  "Ibu lunga. Ibu turu.",
  "Abdul",
];

/** Pedoman sentence inputs (tests/engine/pedoman-2002-cases.ts, Ped p.27-28). */
export const pedomanShapingCases: readonly string[] = [
  "sinau",
  "rame sinau",
  "aula",
  "sinahu",
  "ngajak Abdul",
  "bapak Ibu",
  "bapak ibu",
  "adol klasa",
  "golèk klungsu",
  "rimbag dwipurwa",
  "liwat kṛtěg",
  "bapak byar",
  "anak priya",
  "bapak lunga",
  "bapak.",
  "lunga.",
  "bapak, ibu",
  "iklan",
  "vila",
  "vakum/",
  "ṇabi",
  "murda:Nabi Nuh",
  "murda:Kabupatèn Kudus",
  "murda:Radèn Gandamana",
  "murda:Kraton",
  "benik klambi",
  "ngedhuk blumbang",
  "Bapak macul, bakyu masak.",
];

/** Taling intent: input -> expected drawn order (letters + TALING only). */
export const talingIntent: Readonly<Record<string, string>> = {
  saté: "SA TALING TA",
  gulé: "GA TALING LA",
  toko: "TALING TA TALING KA",
  bocah: "TALING BA CA",
  rawon: "RA TALING WA NA",
  ṅombé: "TALING NGA TALING MA BA",
  lombok: "TALING LA TALING MA BA KA",
  "bapak lombok": "BA PA TALING KA LA TALING MA BA KA",
  joyko: "TALING JA TALING YA KA",
  kŕaton: "KA TALING TA NA",
  foto: "TALING PA TALING TA",
};

function emit(
  raw: string,
  expect: string | null,
  lines: string[],
  clusters: boolean,
  ruleset: RulesetId | undefined,
): void {
  let input = raw.startsWith("intent:") ? raw.slice(7) : raw;
  const murda = input.startsWith("murda:");
  if (murda) input = input.slice(6);
  const r = toAksara(input, { useMurda: murda, ruleset });
  const tail = clusters || expect === null ? "" : `\t${expect}`;
  const line = (label: string, c: ToAksaraSuccess): string =>
    clusters
      ? `${label}\t${c.output}\t${c.clusters.map((k) => k.output.start).join(",")}`
      : `${label}\t${c.output}${tail}`;
  switch (r.kind) {
    case "success":
      lines.push(line(raw, r));
      break;
    case "ambiguous":
      r.candidates.forEach((c, i) => lines.push(line(`${raw}#${i}`, c)));
      break;
    case "error":
      lines.push(`# ERROR ${raw}: ${r.message}`);
      break;
  }
}

function parseRuleset(args: string[]): RulesetId | undefined {
  const at = args.indexOf("--ruleset");
  if (at < 0) return undefined;
  const id = args[at + 1];
  args.splice(at, 2);
  if (!isRulesetId(id)) {
    process.stderr.write(`unknown ruleset: ${String(id)}\n`);
    process.exit(2);
  }
  return id;
}

function main(argv: readonly string[]): void {
  const rest = [...argv];
  const ruleset = parseRuleset(rest);
  const clusters = rest.includes("--clusters");
  const extra = rest.filter((a) => a !== "--clusters");
  const raws = (
    JSON.parse(readFileSync("public/content/v1/words.json", "utf8")) as {
      words: Record<string, unknown>[];
    }
  ).words;
  const pedoman = ruleset === pedomanRulesetId;
  const canonicals = raws.map((raw) =>
    pedoman
      ? Word.fromJson(raw, pedomanRulesetId).canonical
      : (raw["canonical"] as string),
  );
  const plain = [
    ...canonicals,
    ...(pedoman ? pedomanShapingCases : v3Cases),
    ...extra,
  ];
  const lines: string[] = [];
  for (const raw of plain) emit(raw, null, lines, clusters, ruleset);
  for (const [input, expect] of Object.entries(talingIntent)) {
    emit(`intent:${input}`, expect, lines, clusters, ruleset);
  }
  if (pedoman) {
    for (const r of rekanCatalogue) {
      const text = javaneseChar(r.baseUnicodeName!) + cecakTelu.char;
      lines.push(
        clusters ? `chart:${r.id}\t${text}\t0` : `chart:${r.id}\t${text}`,
      );
    }
  }
  process.stdout.write(lines.map((l) => `${l}\n`).join(""));
}

main(process.argv.slice(2));
