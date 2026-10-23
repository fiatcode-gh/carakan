import { get } from "svelte/store";
import { describe, expect, test } from "vitest";
import { toAksara } from "../../../src/engine/index.ts";
import {
  bareEChoices,
  writeE,
} from "../../../src/features/converter/bare-e.ts";
import { LatinToAksaraConverter } from "../../../src/features/converter/latin-to-aksara-state.ts";

function bareEOf(input: string) {
  const result = toAksara(input);
  if (result.kind !== "ambiguous") throw new Error("not ambiguous");
  return result.bareE;
}

describe("bare-e", () => {
  test("[P-U04] writeE writes pepet or taling in place, keeping case", () => {
    expect(writeE("seneng", 1, "pepet")).toBe("sêneng");
    expect(writeE("Seneng", 3, "taling")).toBe("Senéng");
    expect(writeE("Ewa", 0, "pepet")).toBe("Êwa");
    expect(writeE("Ewa", 0, "taling")).toBe("Éwa");
  });

  test("[P-U04] writeE leaves a non-e position unchanged", () => {
    expect(writeE("kowe", 0, "pepet")).toBe("kowe");
  });

  test("[P-U04] bareEChoices marks the e inside its word", () => {
    expect(bareEChoices("seneng kowe", bareEOf("seneng kowe"))).toEqual([
      {
        index: 1,
        word: "seneng",
        before: "s",
        marked: "e",
        after: "neng",
        position: 2,
      },
      {
        index: 3,
        word: "seneng",
        before: "sen",
        marked: "e",
        after: "ng",
        position: 4,
      },
      {
        index: 10,
        word: "kowe",
        before: "kow",
        marked: "e",
        after: "",
        position: 4,
      },
    ]);
  });

  test("[P-U04] a leading-space field maps onto the trimmed input", () => {
    const converter = new LatinToAksaraConverter("kaj1-2021-simplified-v3");
    converter.input("  seneng");
    const state = get(converter.state);
    if (state.kind !== "bareE") throw new Error("expected bareE");
    expect(state.bareE[0]?.index).toBe(1);
    const raw = "  seneng";
    const leading = raw.length - raw.trimStart().length;
    expect(writeE(raw, leading + 1, "taling")).toBe("  séneng");
  });
});
