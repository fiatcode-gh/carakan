import { describe, expect, test } from "vitest";
import { deriveGlyphs } from "../../src/content/glyph-derivation.ts";
import { toAksara } from "../../src/engine/index.ts";
import { ak } from "../engine/support/aksara-builder.ts";

function aksara(latin: string): string {
  const res = toAksara(latin);
  if (res.kind !== "success") throw new Error(`${latin} does not convert`);
  return res.output;
}

describe("[P-C07] glyph derivation", () => {
  test("rekan fa/va derive as one id, not pa/wa plus a sign", () => {
    const { ids, caps } = deriveGlyphs(aksara("foto"));
    expect(ids).toEqual(["ta", "taling", "tarung", "fa"]);
    expect(caps).toEqual([]);
    const v = deriveGlyphs(ak("WA CECAK_TELU WULU LA"));
    expect(v.ids).toEqual(["la", "wulu", "va"]);
  });

  test("dirga mure derives as ai, with tarung as au", () => {
    const ai = deriveGlyphs(ak("RA MA DIRGA_MURE"));
    expect(ai.ids).toEqual(["ra", "ma", "ai"]);
    const au = deriveGlyphs(ak("KA CA DIRGA_MURE TARUNG"));
    // Universe order: ca(2) sorts before ka(4) — ha na ca ra ka.
    expect(au.ids).toEqual(["ca", "ka", "au"]);
  });

  test("a pasangan before a post-onset taling still marks the pasangan capability", () => {
    expect(deriveGlyphs(aksara("lombok/")).caps).toEqual(["pasangan"]);
    expect(deriveGlyphs(aksara("ngombé")).caps).toEqual(["pasangan"]);
  });

  test("cecak telu on an unsupported base fails fast", () => {
    expect(() => deriveGlyphs(ak("KA CECAK_TELU"))).toThrow(Error);
  });
});
