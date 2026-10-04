import { describe, expect, test } from "vitest";
import {
  murdaFor,
  murdaLinks,
  murdaNeverMandatory,
} from "../../src/engine/murda.ts";

describe("[P-D01] murda", () => {
  test("the 8 traditional murda link nglegena to their murda aksara", () => {
    // KAJ I Bab I A.2.a lists 8 traditional murda.
    const traditional = murdaLinks.filter((m) => m.traditional);
    expect(new Set(traditional.map((m) => m.baseId))).toEqual(
      new Set(["na", "ka", "ta", "sa", "pa", "nya", "ga", "ba"]),
    );
    expect(murdaFor("na")?.aksara.unicodeName).toBe("JAVANESE LETTER NA MURDA");
    expect(murdaFor("ka")?.aksara.unicodeName).toBe("JAVANESE LETTER KA MURDA");
    expect(murdaFor("ta")?.aksara.unicodeName).toBe("JAVANESE LETTER TA MURDA");
    expect(murdaFor("sa")?.aksara.unicodeName).toBe("JAVANESE LETTER SA MURDA");
    expect(murdaFor("pa")?.aksara.unicodeName).toBe("JAVANESE LETTER PA MURDA");
    expect(murdaFor("nya")?.aksara.unicodeName).toBe(
      "JAVANESE LETTER NYA MURDA",
    );
    expect(murdaFor("ga")?.aksara.unicodeName).toBe("JAVANESE LETTER GA MURDA");
    expect(murdaFor("ba")?.aksara.unicodeName).toBe("JAVANESE LETTER BA MURDA");
  });

  test("KAJ I Unicode-era additions are catalogued as non-traditional", () => {
    // KAJ I Bab I A.2.a: additions made possible by the Unicode slot.
    expect(murdaFor("ca")?.aksara.unicodeName).toBe("JAVANESE LETTER CA MURDA");
    expect(murdaFor("ca")?.traditional).toBe(false);
    expect(murdaFor("ja")?.aksara.unicodeName).toBe(
      "JAVANESE LETTER JA MAHAPRANA",
    );
    expect(murdaFor("ra")?.aksara.unicodeName).toBe("JAVANESE LETTER RA AGUNG");
  });

  test("nglegena without a murda return null", () => {
    for (const id of ["ha", "da", "wa", "la", "ma", "ya", "tha", "nga"]) {
      expect(murdaFor(id), id).toBeNull();
    }
  });

  test("murda are never mandatory (KAJ I Bab I A.2.f) — data carries the rule", () => {
    expect(murdaNeverMandatory).toBe(true);
  });

  test("JGST forms match the Daftar Transliterasi", () => {
    expect(murdaFor("na")?.aksara.latinJgst).toBe("ṇa");
    expect(murdaFor("ka")?.aksara.latinJgst).toBe("ḳa");
    expect(murdaFor("ta")?.aksara.latinJgst).toBe("ṭha");
    expect(murdaFor("sa")?.aksara.latinJgst).toBe("śa");
    expect(murdaFor("pa")?.aksara.latinJgst).toBe("p̣a");
    expect(murdaFor("nya")?.aksara.latinJgst).toBe("jña");
    expect(murdaFor("ga")?.aksara.latinJgst).toBe("g̣a");
    expect(murdaFor("ba")?.aksara.latinJgst).toBe("ḅa");
  });
});
