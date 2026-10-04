import {
  angkaDigitToChar,
  cecakTelu,
  javaneseChar,
  nglegena,
  rekanById,
} from "../engine/index.ts";
import type { AksaraItem } from "./aksara-item.ts";
import type { SandhanganItem } from "./sandhangan-item.ts";

export interface GlyphInfo {
  readonly id: string;
  readonly name: string;
  readonly char: string;
  readonly pujl: string;
}

function rekanChar(id: string): string {
  const r = rekanById(id);
  if (r === null) return "";
  if (r.encodedAs !== null) return javaneseChar(r.encodedAs);
  if (r.baseUnicodeName !== null) {
    return javaneseChar(r.baseUnicodeName) + cecakTelu.char;
  }
  return (r.composition ?? []).map(javaneseChar).join("");
}

function itemChar(a: AksaraItem): string {
  switch (a.category) {
    case "angka":
      return a.digit === null ? "" : angkaDigitToChar(a.digit);
    case "rekan":
      return rekanChar(a.id);
    default:
      return a.unicodeName === null ? "" : javaneseChar(a.unicodeName);
  }
}

/**
 * Metadata for every teachable item id: nglegena/murda/swara from
 * aksara.json, sandhangan from sandhangan.json, pasangan items derived
 * (name "pasangan X", char = killed carrier + base, UTN47).
 *
 * Map insertion order is aksara items, then sandhangan, then
 * `pasangan-<id>`: confusion-pair key lookups rely on it.
 */
export class GlyphInfoTable {
  readonly byId: ReadonlyMap<string, GlyphInfo>;

  constructor(byId: ReadonlyMap<string, GlyphInfo>) {
    this.byId = byId;
  }

  static build(content: {
    aksara: readonly AksaraItem[];
    sandhangan: readonly SandhanganItem[];
  }): GlyphInfoTable {
    const map = new Map<string, GlyphInfo>();
    for (const a of content.aksara) {
      map.set(a.id, {
        id: a.id,
        name: a.name,
        char: itemChar(a),
        pujl: a.latinPujl ?? a.name,
      });
    }
    for (const s of content.sandhangan) {
      map.set(s.id, {
        id: s.id,
        name: s.name,
        char: s.carrierChar,
        pujl: s.latinPujl,
      });
    }
    const killedCarrier =
      javaneseChar("JAVANESE LETTER KA") + javaneseChar("JAVANESE PANGKON");
    for (const n of nglegena) {
      map.set(`pasangan-${n.id}`, {
        id: `pasangan-${n.id}`,
        name: `pasangan ${n.id}`,
        char: killedCarrier + n.char,
        pujl: n.latinPujl,
      });
    }
    return new GlyphInfoTable(map);
  }
}
