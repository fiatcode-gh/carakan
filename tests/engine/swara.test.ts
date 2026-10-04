import { describe, expect, test } from "vitest";
import {
  swaraById,
  swaraCatalogue,
  swaraLongForms,
} from "../../src/engine/swara.ts";

describe("[P-D01] swara", () => {
  test("core swara cover the five independent vowels", () => {
    // KAJ I Bab I A.3. Pa cerek and nga lelet stand for the syllables re/le
    // which never take pepet (KAJ I Bab I A.5.b).
    expect(swaraById("a")?.unicodeName).toBe("JAVANESE LETTER A");
    expect(swaraById("i")?.unicodeName).toBe("JAVANESE LETTER I");
    expect(swaraById("u")?.unicodeName).toBe("JAVANESE LETTER U");
    expect(swaraById("e")?.unicodeName).toBe("JAVANESE LETTER E");
    expect(swaraById("o")?.unicodeName).toBe("JAVANESE LETTER O");
    expect(swaraById("paCerek")?.unicodeName).toBe("JAVANESE LETTER PA CEREK");
    expect(swaraById("ngaLelet")?.unicodeName).toBe(
      "JAVANESE LETTER NGA LELET",
    );
  });

  test("Latin values per Daftar Transliterasi", () => {
    expect(swaraById("paCerek")?.latinPujl).toBe("re");
    expect(swaraById("paCerek")?.latinJgst).toBe("ṛ");
    expect(swaraById("ngaLelet")?.latinPujl).toBe("le");
    expect(swaraById("ngaLelet")?.latinJgst).toBe("ḷ");
    expect(swaraById("e")?.latinPujl).toBe("é");
  });

  test("long-form swara are tarung combinations", () => {
    // KAJ I Bab I A.5.b.2 (sandhangan swara panjang): ā, ū, au, reu.
    expect(swaraLongForms.get("a")?.latinJgst).toBe("ā");
    expect(swaraLongForms.get("u")?.latinJgst).toBe("ū");
    expect(swaraLongForms.get("o")?.latinJgst).toBe("au");
    expect(swaraLongForms.get("paCerek")?.latinJgst).toBe("ṛě");
    expect(swaraLongForms.get("a")?.latinPujl).toBe("aa");
  });

  test("catalogue-only swara exist as data (iKawi, ii, ngaLeletRaswadi, ai)", () => {
    expect(new Set(swaraCatalogue.map((s) => s.id))).toEqual(
      new Set(["iKawi", "ii", "ngaLeletRaswadi", "ai"]),
    );
  });
});
