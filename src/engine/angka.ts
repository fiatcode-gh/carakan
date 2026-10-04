import { codepointOf } from "./aksara-char.ts";
import { javaneseChar } from "./codepoints.ts";

/** Angka Jawa (Javanese digits) — Unicode names JAVANESE DIGIT ZERO..NINE. */
const angkaNames: readonly string[] = [
  "JAVANESE DIGIT ZERO",
  "JAVANESE DIGIT ONE",
  "JAVANESE DIGIT TWO",
  "JAVANESE DIGIT THREE",
  "JAVANESE DIGIT FOUR",
  "JAVANESE DIGIT FIVE",
  "JAVANESE DIGIT SIX",
  "JAVANESE DIGIT SEVEN",
  "JAVANESE DIGIT EIGHT",
  "JAVANESE DIGIT NINE",
];

export function angkaDigitToChar(digit: number): string {
  const name = Number.isInteger(digit) ? angkaNames[digit] : undefined;
  if (name === undefined) {
    throw new RangeError(`Invalid value ${digit} for digit: must be 0..9`);
  }
  return javaneseChar(name);
}

export function angkaCharToDigit(char: string): number | null {
  const index = angkaNames.map(javaneseChar).indexOf(char);
  return index < 0 ? null : index;
}

/** Pada pangkat flanks runs of angka (KAJ I Bab I A.6). */
export interface PadaPangkat {
  readonly unicodeName: string;
  readonly char: string;
  readonly codepoint: number;
}

function padaPangkat(unicodeName: string): PadaPangkat {
  return {
    unicodeName,
    get char() {
      return javaneseChar(this.unicodeName);
    },
    get codepoint() {
      return codepointOf(this.unicodeName);
    },
  };
}

export const angkaFlanker: PadaPangkat = padaPangkat("JAVANESE PADA PANGKAT");
