import { expect, test } from "vitest";
import { ConfusionPair } from "../../../src/content/confusion-pair.ts";
import {
  GlyphInfoTable,
  type GlyphInfo,
} from "../../../src/content/glyph-info-table.ts";
import { javaneseChar } from "../../../src/engine/index.ts";
import { confusionPairKeyFor } from "../../../src/features/lessons/confusion-pair-lookup.ts";

const daChar = javaneseChar("JAVANESE LETTER DA");
const dhaChar = javaneseChar("JAVANESE LETTER DA MAHAPRANA");
const kaChar = javaneseChar("JAVANESE LETTER KA");

const info = (id: string, char: string, pujl: string): [string, GlyphInfo] => [
  id,
  { id, name: id, char, pujl },
];

const table = new GlyphInfoTable(
  new Map([
    info("da", daChar, "da"),
    info("dha", dhaChar, "dha"),
    info("ka", kaChar, "ka"),
  ]),
);

const daDha = new ConfusionPair({ a: "da", b: "dha", label: "da/dha" });

test("[P-B13] pujl option matching the pair member resolves the pair key", () => {
  expect(
    confusionPairKeyFor({
      targetGlyphId: "da",
      chosenOption: "dha",
      optionIsAksara: false,
      glyphInfo: table,
      pairs: [daDha],
    }),
  ).toBe("da-dha");
});

test("[P-B13] aksara option matching the pair member resolves the pair key", () => {
  expect(
    confusionPairKeyFor({
      targetGlyphId: "dha",
      chosenOption: daChar,
      optionIsAksara: true,
      glyphInfo: table,
      pairs: [daDha],
    }),
  ).toBe("da-dha");
});

test("[P-B13] option outside the pair resolves to null", () => {
  expect(
    confusionPairKeyFor({
      targetGlyphId: "da",
      chosenOption: "ka",
      optionIsAksara: false,
      glyphInfo: table,
      pairs: [daDha],
    }),
  ).toBeNull();
});

test("[P-B13] pasangan target strips the prefix before pair matching", () => {
  expect(
    confusionPairKeyFor({
      targetGlyphId: "pasangan-da",
      chosenOption: dhaChar,
      optionIsAksara: true,
      glyphInfo: table,
      pairs: [daDha],
    }),
  ).toBe("da-dha");
});

test("[P-B13] no pairs means nothing is logged", () => {
  expect(
    confusionPairKeyFor({
      targetGlyphId: "da",
      chosenOption: "dha",
      optionIsAksara: false,
      glyphInfo: table,
      pairs: [],
    }),
  ).toBeNull();
});

test("[P-B13] pasangan table entries are never matched as the chosen option", () => {
  const withPasangan = new GlyphInfoTable(
    new Map([
      info("pasangan-dha", dhaChar, "dha"),
      info("dha", dhaChar, "dha"),
      info("da", daChar, "da"),
    ]),
  );
  expect(
    confusionPairKeyFor({
      targetGlyphId: "da",
      chosenOption: "dha",
      optionIsAksara: false,
      glyphInfo: withPasangan,
      pairs: [daDha],
    }),
  ).toBe("da-dha");
});
