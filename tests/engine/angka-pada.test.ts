import { describe, expect, test } from "vitest";
import {
  angkaCharToDigit,
  angkaDigitToChar,
  angkaFlanker,
} from "../../src/engine/angka.ts";
import { padaById, padaCatalogue } from "../../src/engine/pada.ts";

describe("[P-D01] angka and pada", () => {
  test("ten angka jawa digits map to 0-9", () => {
    for (let d = 0; d <= 9; d++) {
      expect(angkaDigitToChar(d).length, `digit ${d}`).toBeGreaterThan(0);
      expect(angkaCharToDigit(angkaDigitToChar(d))).toBe(d);
    }
    expect(angkaDigitToChar(0)).toBe(String.fromCodePoint(0xa9d0));
    expect(angkaDigitToChar(7)).toBe(String.fromCodePoint(0xa9d7));
  });

  test("numbers are flanked by pada pangkat", () => {
    expect(angkaFlanker.unicodeName).toBe("JAVANESE PADA PANGKAT");
    expect(angkaFlanker.char).toBe(String.fromCodePoint(0xa9c7));
  });

  test("pada lingsa and lungsi are the comma and period", () => {
    expect(padaById("lingsa")?.unicodeName).toBe("JAVANESE PADA LINGSA");
    expect(padaById("lingsa")?.latin).toBe(",");
    expect(padaById("lungsi")?.unicodeName).toBe("JAVANESE PADA LUNGSI");
    expect(padaById("lungsi")?.latin).toBe(".");
  });

  test("remaining pada are catalogued for the chart feature", () => {
    expect(padaCatalogue.map((p) => p.unicodeName)).toEqual(
      expect.arrayContaining([
        "JAVANESE PADA ADEG",
        "JAVANESE PADA ADEG ADEG",
        "JAVANESE PADA WINDU",
        "JAVANESE LEFT RERENGGAN",
        "JAVANESE RIGHT RERENGGAN",
        "JAVANESE PADA ANDAP",
        "JAVANESE PADA MADYA",
        "JAVANESE PADA LUHUR",
        "JAVANESE PADA PISELEH",
        "JAVANESE TURNED PADA PISELEH",
        "JAVANESE PANGRANGKEP",
        "JAVANESE PADA TIRTA TUMETES",
        "JAVANESE PADA ISEN-ISEN",
      ]),
    );
  });
});
