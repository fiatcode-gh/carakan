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
