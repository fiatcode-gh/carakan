import { describe, expect, test } from "vitest";
import {
  LatinParseError,
  tokenize,
  type LatinToken,
} from "../../src/engine/latin/latin-tokenizer.ts";

const tok = (word: string): LatinToken[] => tokenize(word);

describe("[P-D01] latin-tokenizer", () => {
  test("plain CV words tokenize to alternating consonants and vowels", () => {
    const t = tok("budi");
    expect(t.map((x) => x.text)).toEqual(["b", "u", "d", "i"]);
    expect(t[0]!.aksaraUnicodeName).toBe("JAVANESE LETTER BA");
    expect(t[1]!.vowel).toBe("u");
    expect(t[2]!.aksaraUnicodeName).toBe("JAVANESE LETTER DA");
  });

  test("PUJL digraphs use longest match", () => {
    expect(tok("dha")[0]!.aksaraUnicodeName).toBe(
      "JAVANESE LETTER DA MAHAPRANA",
    );
    expect(tok("tha")[0]!.aksaraUnicodeName).toBe("JAVANESE LETTER TTA");
    expect(tok("nya")[0]!.aksaraUnicodeName).toBe("JAVANESE LETTER NYA");
    expect(tok("nga")[0]!.aksaraUnicodeName).toBe("JAVANESE LETTER NGA");
  });

  test("ngg splits into ng + g (cecak rule input)", () => {
    // "tangga": ng closes the first syllable.
    const t = tok("tangga");
    expect(t.map((x) => x.text)).toEqual(["t", "a", "ng", "g", "a"]);
  });

  test("diacritic vowels resolve: é/è taling, ě/ê pepet", () => {
    expect(tok("saté")[3]!.vowel).toBe("eTaling");
    expect(tok("satè")[3]!.vowel).toBe("eTaling");
    expect(tok("sětya")[1]!.vowel).toBe("ePepet");
    expect(tok("sêtya")[1]!.vowel).toBe("ePepet");
  });

  test("bare e tokenizes as eBare (ambiguity is the converter job)", () => {
    expect(tok("setya")[1]!.vowel).toBe("eBare");
  });

  test("JGST onsets map straight to their aksara", () => {
    // Lossless canonical input round-trips (KAJ I Daftar Transliterasi).
    expect(tok("ṭa")[0]!.aksaraUnicodeName).toBe("JAVANESE LETTER TTA");
    expect(tok("ḍa")[0]!.aksaraUnicodeName).toBe(
      "JAVANESE LETTER DA MAHAPRANA",
    );
    expect(tok("ña")[0]!.aksaraUnicodeName).toBe("JAVANESE LETTER NYA");
    expect(tok("ṅa")[0]!.aksaraUnicodeName).toBe("JAVANESE LETTER NGA");
    expect(tok("ḅu")[0]!.aksaraUnicodeName).toBe("JAVANESE LETTER BA MURDA");
    expect(tok("ṇa")[0]!.aksaraUnicodeName).toBe("JAVANESE LETTER NA MURDA");
  });

  test("PUJL tha wins over JGST ta-murda tha (school input priority)", () => {
    // Documented collision: JGST of TA MURDA is also "tha". Nglegena are
    // matched first, so plain "tha" never silently produces murda.
    expect(tok("tha")[0]!.aksaraUnicodeName).toBe("JAVANESE LETTER TTA");
  });

  test("JGST sigeg markers are coda tokens", () => {
    expect(tok("kacaŋ")[4]!.sigegId).toBe("ng");
    expect(tok("layaŋ")[4]!.sigegId).toBe("ng");
    expect(tok("cacaḥ")[4]!.sigegId).toBe("h");
    expect(tok("bapak/")[5]!.kind).toBe("pangkon");
  });

  test("JGST keret/cakra/pengkal markers carry their flags", () => {
    expect(tok("pṛlu")[1]!.isCerekR).toBe(true);
    expect(tok("kŕasa")[1]!.isCakraR).toBe(true);
    expect(tok("sětỿa")[3]!.isPengkalY).toBe(true);
  });

  test("digits tokenize", () => {
    expect(tok("17").map((x) => x.kind)).toEqual(["digit", "digit"]);
  });

  test("capitalization is recorded for the murda opt-in", () => {
    expect(tok("Budi")[0]!.capitalized).toBe(true);
    expect(tok("Budi")[2]!.capitalized).toBe(false);
  });

  test("unknown characters throw with their index", () => {
    expect(() => tok("b4x")).toThrow(LatinParseError);
    let caught: unknown;
    try {
      tok("bx");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(LatinParseError);
    expect((caught as LatinParseError).index).toBe(1);
  });
});
