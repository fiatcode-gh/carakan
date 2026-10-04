// Shaping case dump: port of app/tool/shaping/dump_cases.dart @ebc7cb5.
// Usage (from the repo root): node tools/shaping/dump-cases.ts [extra...] > out.tsv
// Inputs: every corpus canonical in public/content/v1/words.json, the v3
// sentence cases, the taling intent cases (with the expected drawn order of
// letters + TALING, Unicode short names), plus extra CLI args ("murda:"
// prefix = useMurda). Errors/ambiguities print as '#' lines so nothing is
// silently dropped.
import { readFileSync } from "node:fs";

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

function emit(raw: string, expect: string | null, lines: string[]): void {
  let input = raw.startsWith("intent:") ? raw.slice(7) : raw;
  const murda = input.startsWith("murda:");
  if (murda) input = input.slice(6);
  const r = toAksara(input, { useMurda: murda });
  const tail = expect === null ? "" : `\t${expect}`;
  switch (r.kind) {
    case "success":
      lines.push(`${raw}\t${r.output}${tail}`);
      break;
    case "ambiguous":
      r.candidates.forEach((c, i) => lines.push(`${raw}#${i}\t${c.output}`));
      break;
    case "error":
      lines.push(`# ERROR ${raw}: ${r.message}`);
      break;
  }
}

function main(args: readonly string[]): void {
  const words = (
    JSON.parse(readFileSync("public/content/v1/words.json", "utf8")) as {
      words: { canonical: string }[];
    }
  ).words;
  const plain = [...words.map((w) => w.canonical), ...v3Cases, ...args];
  const lines: string[] = [];
  for (const raw of plain) emit(raw, null, lines);
  for (const [input, expect] of Object.entries(talingIntent)) {
    emit(`intent:${input}`, expect, lines);
  }
  process.stdout.write(lines.map((l) => `${l}\n`).join(""));
}

main(process.argv.slice(2));
