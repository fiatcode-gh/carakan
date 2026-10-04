import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parseArgs } from "node:util";
import {
  aksaraEngineRulesetId,
  murdaLinks,
  nglegena,
  padaActive,
  padaCatalogue,
  rekan,
  sandhangan,
  swara,
  swaraCatalogue,
} from "../src/engine/index.ts";

// Generates public/content/v1/{aksara,sandhangan,manifest}.json from the
// engine catalogs. Engine facts (unicode names, transliterations) come from
// the engine; the table below is the only hand-written content here.
// Usage: node tools/gen-content.ts [--out <dir>]

/** Indonesian display names, keyed by item id. */
const names: Readonly<Record<string, string>> = {
  // nglegena — the aksara names are identical in Indonesian
  ha: "ha",
  na: "na",
  ca: "ca",
  ra: "ra",
  ka: "ka",
  da: "da",
  ta: "ta",
  sa: "sa",
  wa: "wa",
  la: "la",
  pa: "pa",
  dha: "dha",
  ja: "ja",
  ya: "ya",
  nya: "nya",
  ma: "ma",
  ga: "ga",
  ba: "ba",
  tha: "tha",
  nga: "nga",
  // sandhangan
  wulu: "wulu (i)",
  suku: "suku (u)",
  taling: "taling (é)",
  tarung: "tarung (panjang)",
  pepet: "pepet (e)",
  layar: "layar (-r)",
  cecak: "cecak (-ng)",
  wignyan: "wignyan (-h)",
  pangkon: "pangkon (pemati)",
  cakra: "cakra (-r-)",
  keret: "keret (rě)",
  pengkal: "pengkal (-y-)",
  // murda
  naMurda: "na murda",
  kaMurda: "ka murda",
  taMurda: "ta murda",
  saMurda: "sa murda",
  paMurda: "pa murda",
  nyaMurda: "nya murda",
  gaMurda: "ga murda",
  baMurda: "ba murda",
  caMurda: "ca murda",
  jaMurda: "ja mahaprana",
  raAgung: "ra agung",
  // swara
  a: "a",
  i: "i",
  u: "u",
  e: "é",
  o: "o",
  paCerek: "pa cerek (rě)",
  ngaLelet: "nga lelet (lě)",
  // swara catalogue
  iKawi: "i kawi",
  ii: "ii",
  ngaLeletRaswadi: "nga lelet raswadi",
  ai: "ai",
  // rekan
  fa: "fa",
  va: "va",
  le: "le",
  au: "au",
  reu: "reu",
  leu: "leu",
  // angka (display label pinned by the plan's GlyphPickerEntry('angka $d', …))
  "angka-0": "angka 0",
  "angka-1": "angka 1",
  "angka-2": "angka 2",
  "angka-3": "angka 3",
  "angka-4": "angka 4",
  "angka-5": "angka 5",
  "angka-6": "angka 6",
  "angka-7": "angka 7",
  "angka-8": "angka 8",
  "angka-9": "angka 9",
  // pada
  lingsa: "pada lingsa (,)",
  lungsi: "pada lungsi (.)",
  adeg: "pada adeg",
  adegAdeg: "pada adeg-adeg",
  windu: "pada windu",
  rerengganKiwa: "rerenggan kiri",
  rerengganTengen: "rerenggan kanan",
  andap: "pada andap",
  madya: "pada madya",
  luhur: "pada luhur",
  piseleh: "pada piseleh",
  turnedPiseleh: "pada piseleh terbalik",
  pangrangkep: "pangrangkep",
  tirtaTumetes: "pada tirta tumetes",
  isenIsen: "pada isen-isen",
};

function nameOf(id: string): string {
  const n = Object.hasOwn(names, id) ? names[id] : undefined;
  if (n === undefined) throw new Error(`missing display name for ${id}`);
  return n;
}

interface AksaraEntry {
  id: string;
  category: string;
  unicodeName?: string;
  latinPujl?: string;
  latinJgst?: string;
  digit?: number;
}

// Key order is the file format: id, name, category, unicodeName?, latinPujl?,
// latinJgst?, digit?, audioKey. `undefined` values are omitted by stringify.
function aksaraEntry(e: AksaraEntry): Record<string, unknown> {
  return {
    id: e.id,
    name: nameOf(e.id),
    category: e.category,
    unicodeName: e.unicodeName,
    latinPujl: e.latinPujl,
    latinJgst: e.latinJgst,
    digit: e.digit,
    audioKey: e.id,
  };
}

const aksara = [
  ...nglegena.map((a) =>
    aksaraEntry({
      id: a.id,
      category: "nglegena",
      unicodeName: a.unicodeName,
      latinPujl: a.latinPujl,
      latinJgst: a.latinJgst,
    }),
  ),
  ...murdaLinks.map((m) =>
    aksaraEntry({
      id: m.aksara.id,
      category: "murda",
      unicodeName: m.aksara.unicodeName,
      latinPujl: m.aksara.latinPujl,
      latinJgst: m.aksara.latinJgst,
    }),
  ),
  ...[...swara, ...swaraCatalogue].map((s) =>
    aksaraEntry({
      id: s.id,
      category: "swara",
      unicodeName: s.unicodeName,
      latinPujl: s.latinPujl,
      latinJgst: s.latinJgst,
    }),
  ),
  ...rekan.map((r) =>
    aksaraEntry({
      id: r.id,
      category: "rekan",
      latinPujl: r.latinPujl,
      latinJgst: r.latinJgst,
    }),
  ),
  ...Array.from({ length: 10 }, (_, d) =>
    aksaraEntry({ id: `angka-${d}`, category: "angka", digit: d }),
  ),
  ...[...padaActive, ...padaCatalogue].map((p) =>
    aksaraEntry({
      id: p.id,
      category: "pada",
      unicodeName: p.unicodeName,
      latinPujl: p.latin ?? undefined,
    }),
  ),
];

const sandhanganItems = sandhangan.map((s) => ({
  id: s.id,
  name: nameOf(s.id),
  unicodeName: s.unicodeName,
  function: s.function,
  latinPujl: s.latinPujl,
  latinJgst: s.latinJgst,
  audioKey: s.id,
}));

const manifest = {
  contentVersion: 1,
  rulesetId: aksaraEngineRulesetId,
  generatedAt: new Date().toISOString(),
};

const { values } = parseArgs({
  options: { out: { type: "string", default: "public/content/v1" } },
});
const dir = values.out;
mkdirSync(dir, { recursive: true });
const encode = (value: unknown) => JSON.stringify(value, null, 2);
writeFileSync(join(dir, "aksara.json"), encode({ version: 1, items: aksara }));
writeFileSync(
  join(dir, "sandhangan.json"),
  encode({ version: 1, items: sandhanganItems }),
);
writeFileSync(join(dir, "manifest.json"), encode(manifest));
console.log(
  `generated ${aksara.length} aksara items, ${sandhanganItems.length} sandhangan items`,
);
