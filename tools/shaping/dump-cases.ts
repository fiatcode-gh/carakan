// Shaping case dump: port of app/tool/shaping/dump_cases.dart @ebc7cb5.
// Usage (from the repo root):
//   node tools/shaping/dump-cases.ts [--clusters] [extra...] > out.tsv
// Inputs: every corpus canonical in public/content/v1/words.json, the v3
// sentence cases, the taling intent cases (with the expected drawn order of
// letters + TALING, Unicode short names), plus extra CLI args ("murda:"
// prefix = useMurda). Errors/ambiguities print as '#' lines so nothing is
// silently dropped.
// --clusters: each line is "label<TAB>aksara<TAB>s1,s2,..." with the engine
// cluster output starts (UTF-16 offsets); the taling expectation is omitted.
import { readFileSync } from "node:fs";

import type { ToAksaraSuccess } from "../../src/engine/index.ts";
import { toAksara } from "../../src/engine/index.ts";

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
): void {
  let input = raw.startsWith("intent:") ? raw.slice(7) : raw;
  const murda = input.startsWith("murda:");
  if (murda) input = input.slice(6);
  const r = toAksara(input, { useMurda: murda });
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

function main(args: readonly string[]): void {
  const clusters = args.includes("--clusters");
  const extra = args.filter((a) => a !== "--clusters");
  const words = (
    JSON.parse(readFileSync("public/content/v1/words.json", "utf8")) as {
      words: { canonical: string }[];
    }
  ).words;
  const plain = [...words.map((w) => w.canonical), ...v3Cases, ...extra];
  const lines: string[] = [];
  for (const raw of plain) emit(raw, null, lines, clusters);
  for (const [input, expect] of Object.entries(talingIntent)) {
    emit(`intent:${input}`, expect, lines, clusters);
  }
  process.stdout.write(lines.map((l) => `${l}\n`).join(""));
}

main(process.argv.slice(2));
