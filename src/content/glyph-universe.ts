import { swara, type Ruleset } from "../engine/index.ts";

/**
 * Pinned bitmask universe: index = bit position (spec 7: required-glyph set
 * is a bitmask; "words this learner can read" is a single integer AND).
 * Pasangan is a capability bit, not an item (20 forms would overflow 64 bits
 * once murda/swara/rekan are included). Bit math is `bigint`: 57 ids exceed
 * the 32 bits of JS numbers.
 */
export const glyphUniverseIds: readonly string[] = [
  // nglegena 0–19
  ...["ha", "na", "ca", "ra", "ka", "da", "ta", "sa", "wa", "la"],
  ...["pa", "dha", "ja", "ya", "nya", "ma", "ga", "ba", "tha", "nga"],
  // sandhangan 20–31
  ...["wulu", "suku", "taling", "tarung", "pepet", "layar", "cecak"],
  ...["wignyan", "pangkon", "cakra", "keret", "pengkal"],
  // murda 32–42
  ...["naMurda", "kaMurda", "taMurda", "saMurda", "paMurda", "nyaMurda"],
  ...["gaMurda", "baMurda", "caMurda", "jaMurda", "raAgung"],
  // swara 43–49
  ...["a", "i", "u", "e", "o", "paCerek", "ngaLelet"],
  // rekan 50–56
  ...["fa", "va", "le", "ai", "au", "reu", "leu"],
];

const bitById: ReadonlyMap<string, bigint> = new Map(
  glyphUniverseIds.map((id, i) => [id, 1n << BigInt(i)] as const),
);

export function bitOf(id: string): bigint {
  const bit = bitById.get(id);
  if (bit === undefined) {
    throw new Error(`Invalid argument(s): not in the glyph universe: ${id}`);
  }
  return bit;
}

export function containsGlyph(id: string): boolean {
  return bitById.has(id);
}

/**
 * Capability bits (not item bits). Pasangan has 20 forms; one bit covers
 * them all (decision 4).
 */
export const pasanganCap = 1n << 0n;

/**
 * The universe ids one ruleset has: nglegena and sandhangan (index < 32),
 * plus the murda, swara and rekan it teaches that are universe ids
 * (contract 2.4). Chart-only rekan have no universe id and drop out.
 */
export function rulesetGlyphIds(ruleset: Ruleset): ReadonlySet<string> {
  const own = new Set<string>([
    ...ruleset.murda.map((m) => m.aksara.id),
    ...swara.map((s) => s.id),
    ...ruleset.rekan.map((r) => r.id),
  ]);
  return new Set(glyphUniverseIds.filter((id, i) => i < 32 || own.has(id)));
}
