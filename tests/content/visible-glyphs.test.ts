import { describe, expect, test } from "vitest";
import { toAksara } from "../../src/engine/index.ts";
import { ak } from "../engine/support/aksara-builder.ts";
import { hasPasangan, visibleGlyphs } from "../support/visible-glyphs.ts";

function aksara(jgst: string): string {
  const res = toAksara(jgst);
  if (res.kind !== "success") throw new Error(`${jgst} does not convert`);
  return res.output;
}

function visible(jgst: string): Set<string> {
  return visibleGlyphs(aksara(jgst));
}

function expectContainsAll(set: Set<string>, ids: string[]): void {
  for (const id of ids) expect(set.has(id), id).toBe(true);
}

describe("[P-D04] visible glyphs", () => {
  test("a panjing la is subjoined: klapa shows ka and pa, no la, no pangkon", () => {
    const v = visible("klapa");
    expectContainsAll(v, ["ka", "pa"]);
    expect(v.has("la")).toBe(false);
    expect(v.has("pangkon")).toBe(false);
  });

  test("a final pangkon is visible", () => {
    expect(visible("bapak").has("pangkon")).toBe(true);
  });

  test("a pangkon linking to the next letter and its pasangan are hidden", () => {
    const v = visible("aksara");
    expectContainsAll(v, ["ha", "ka", "ra"]);
    expect(v.has("sa")).toBe(false);
    expect(v.has("pangkon")).toBe(false);
  });

  test("a pangkon before a ZWNJ is visible", () => {
    expect(visible("bapak, hibu").has("pangkon")).toBe(true);
  });

  test("rekan fa, swara a and the final pangkon are visible", () => {
    expectContainsAll(visible("maaf/"), ["fa", "a", "pangkon"]);
  });

  test("taling, tarung and final pangkon are visible; subjoined ba is not", () => {
    const v = visible("lombok/");
    expectContainsAll(v, ["taling", "tarung", "pangkon"]);
    expect(v.has("ba")).toBe(false);
  });

  test("a pasangan after a nasal coda hides the base letter", () => {
    expect(visible("ṅombé").has("ba")).toBe(false);
  });

  test("an unknown codepoint is rejected", () => {
    expect(() => visibleGlyphs(ak("KA") + "\u0041")).toThrow(Error);
  });

  describe("hasPasangan", () => {
    for (const jgst of [
      "klapa",
      "kanca",
      "aksara",
      "lombok/",
      "mlaku",
      "bapak lunga",
    ]) {
      test(`${jgst} has a pasangan`, () => {
        expect(hasPasangan(aksara(jgst))).toBe(true);
      });
    }

    for (const jgst of [
      "bapak/",
      "kŕasa",
      "pṛlu",
      "sětỿa",
      "maaf/",
      "bapak, hibu",
      "omaḥ",
    ]) {
      test(`${jgst} has no pasangan`, () => {
        expect(hasPasangan(aksara(jgst))).toBe(false);
      });
    }
  });
});
