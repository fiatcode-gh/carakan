import { describe, expect, test } from "vitest";
import { cecakTelu, rekanById } from "../../src/engine/rekan.ts";
import { ak } from "./support/aksara-builder.ts";

describe("[P-D01] rekan", () => {
  test("cecak telu (nukta) is modelled as an attachable sign", () => {
    // UTN47: a nukta is used after the base character, never after a
    // below-base conjunct form.
    expect(cecakTelu.unicodeName).toBe("JAVANESE SIGN CECAK TELU");
    expect(cecakTelu.char).toBe(ak("CECAK_TELU"));
  });

  test("attested consonant rekan use cecak telu", () => {
    // fa: UTN47 rendering section — pa + cecak telu renders "f" (example:
    // the loanword "for"). va: KAJ I — wa in "èkuivalèn".
    expect(rekanById("fa")?.baseUnicodeName).toBe("JAVANESE LETTER PA");
    expect(rekanById("va")?.baseUnicodeName).toBe("JAVANESE LETTER WA");
    expect(rekanById("fa")?.usesCecakTelu).toBe(true);
  });

  test("KAJ I loan-sound repertoire is catalogued", () => {
    // KAJ I Bab I A.4 (Aksara Rekaan): sounds invented for loan words.
    expect(rekanById("ai")?.encodedAs).toBe("JAVANESE LETTER AI");
    expect(rekanById("le")?.encodedAs).toBe("JAVANESE LETTER NGA LELET");
    expect(rekanById("reu")?.composition).toEqual([
      "JAVANESE LETTER PA CEREK",
      "JAVANESE VOWEL SIGN TARUNG",
    ]);
  });
});
