/** Seeded linear congruential generator: the same seed yields the same inputs. */
export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

export function randomStrings(
  rand: () => number,
  alphabet: readonly string[],
  count: number,
): string[] {
  const out: string[] = [];
  for (let n = 0; n < count; n++) {
    const len = 1 + Math.floor(rand() * 8);
    let s = "";
    for (let k = 0; k < len; k++) {
      s += alphabet[Math.floor(rand() * alphabet.length)]!;
    }
    out.push(s);
  }
  return out;
}
