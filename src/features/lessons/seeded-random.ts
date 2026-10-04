/** Small seeded PRNG (mulberry32): the same seed always yields the same plan. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An integer in `[0, n)`. */
export function nextInt(rng: () => number, n: number): number {
  return Math.floor(rng() * n);
}

/** Fisher-Yates in place, in the loop shape of Dart's `List.shuffle`. */
export function shuffle<T>(list: T[], rng: () => number): T[] {
  for (let len = list.length; len > 1;) {
    const pos = nextInt(rng, len);
    len -= 1;
    [list[len], list[pos]] = [list[pos] as T, list[len] as T];
  }
  return list;
}
