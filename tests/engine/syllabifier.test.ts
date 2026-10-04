import { describe, expect, test } from "vitest";
import {
  LatinParseError,
  tokenize,
} from "../../src/engine/latin/latin-tokenizer.ts";
import {
  syllabify,
  type Syllable,
} from "../../src/engine/latin/syllabifier.ts";

const syl = (word: string): Syllable[] => syllabify(tokenize(word));

describe("[P-D01] syllabifier", () => {
  test("open CV syllables", () => {
    const s = syl("budi");
    expect(s.length).toBe(2);
    expect(s[0]!.onset.length).toBe(1);
    expect(s[0]!.vowelToken?.vowel).toBe("u");
    expect(s[0]!.coda).toBeNull();
    expect(s[1]!.vowelToken?.vowel).toBe("i");
  });

  test("single consonant between vowels is the next onset (bapak)", () => {
    const s = syl("bapak");
    expect(s.length).toBe(2);
    expect(s[0]!.coda).toBeNull();
    expect(s[1]!.coda?.text).toBe("k");
  });

  test("two consonants between vowels split coda/onset (tangga, singkir)", () => {
    const ta = syl("tangga");
    expect(ta[0]!.coda?.sigegId ?? ta[0]!.coda?.text).toBe("ng");
    expect(ta[1]!.onset[0]!.text).toBe("g");

    const si = syl("singkir");
    expect(si[0]!.coda?.text).toBe("ng");
    expect(si[1]!.onset[0]!.text).toBe("k");
    expect(si[1]!.coda?.aksaraUnicodeName).toBe("JAVANESE LETTER RA");
  });

  test("word-initial clusters stay together (klapa, krasa)", () => {
    expect(syl("klapa")[0]!.onset.map((t) => t.text)).toEqual(["k", "l"]);
    expect(syl("krasa")[0]!.onset.map((t) => t.text)).toEqual(["k", "r"]);
  });

  test("ng onset plus cluster member (ngrusak)", () => {
    const s = syl("ngrusak");
    expect(s[0]!.onset.map((t) => t.text)).toEqual(["ng", "r"]);
  });

  test("JGST ṛ fuses into a keret syllable (pṛlu)", () => {
    const s = syl("pṛlu");
    expect(s.length).toBe(2);
    expect(s[0]!.keret).toBe(true);
    expect(s[0]!.vowelToken).toBeNull();
    expect(s[1]!.vowelToken?.vowel).toBe("u");
  });

  test("word-initial ṛ is a cerek syllable", () => {
    const s = syl("ṛmat");
    expect(s[0]!.cerek).toBe(true);
  });

  test("three consonants between vowels: first coda, rest onset", () => {
    // "baktra" is synthetic but exercises the split rule (k closes, tr opens).
    const s = syl("baktra");
    expect(s[0]!.coda?.text).toBe("k");
    expect(s[1]!.onset.map((t) => t.text)).toEqual(["t", "r"]);
  });

  test("a consonant cluster longer than two throws", () => {
    expect(() => syl("stra")).toThrow(LatinParseError);
  });

  test("vowel-less input throws", () => {
    expect(() => syl("bkr")).toThrow(LatinParseError);
  });
});
