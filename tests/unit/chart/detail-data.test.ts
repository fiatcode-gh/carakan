import { describe, expect, test } from "vitest";
import {
  detailForNglegena,
  detailForSandhangan,
  sandhanganFunctionMessageKey,
} from "../../../src/features/chart/detail-data.ts";
import en from "../../../src/l10n/en.json";
import id from "../../../src/l10n/id.json";
import { ak } from "../../engine/support/aksara-builder.ts";

describe("chart detail data", () => {
  test("[P-C04] nglegena detail carries both Latin forms, pasangan and murda", () => {
    expect(detailForNglegena("ka")).toEqual({
      id: "ka",
      name: "ka",
      pujl: "ka",
      jgst: "ka",
      pasanganDemo: ak("KA PANGKON KA"),
      murda: ak("KA_MURDA"),
    });
  });

  test("[P-C04] a letter without a murda form has none", () => {
    expect(detailForNglegena("wa").murda).toBeNull();
  });

  test("[P-C04] an unknown nglegena id throws", () => {
    expect(() => detailForNglegena("nope")).toThrow();
  });

  test("[P-C05] sandhangan detail carries its function", () => {
    expect(detailForSandhangan("wulu").function).toBe("vowelChanging");
    expect(() => detailForSandhangan("nope")).toThrow();
  });

  test("[P-C05] the function resolves to a localized description, not the raw enum name", () => {
    const keys = [
      "vowelChanging",
      "syllableClosing",
      "consonantModifying",
      "vowelKiller",
    ] as const;
    expect(keys.map((k) => en[sandhanganFunctionMessageKey(k)])).toEqual([
      "Changes the syllable's vowel",
      "Closes the syllable with a final consonant",
      "Adds a consonant sound (-r, -re, -y)",
      "Kills the vowel (pangkon)",
    ]);
    for (const k of keys) {
      expect(id[sandhanganFunctionMessageKey(k)]).not.toBe(k);
    }
  });
});
