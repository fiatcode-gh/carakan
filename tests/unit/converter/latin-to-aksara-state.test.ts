import { get } from "svelte/store";
import { describe, expect, test } from "vitest";
import {
  kajRulesetId,
  pedomanRulesetId,
  toAksara,
  type ToAksaraSuccess,
} from "../../../src/engine/index.ts";
import { LatinToAksaraConverter } from "../../../src/features/converter/latin-to-aksara-state.ts";
import { ak } from "../../engine/support/aksara-builder.ts";

const expectSuccess = (text: string): ToAksaraSuccess => {
  const result = toAksara(text);
  if (result.kind !== "success") throw new Error("not a success");
  return result;
};
const clipboardSpy = () => {
  const written: string[] = [];
  return {
    written,
    writeText: async (text: string) => void written.push(text),
  };
};

describe("LatinToAksaraConverter", () => {
  test("[P-U03] converts an unambiguous word", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("kaca");
    expect(get(c.state)).toEqual({
      kind: "idle",
      input: "kaca",
      output: ak("KA CA"),
      clusters: expectSuccess("kaca").clusters,
      selected: null,
    });
  });

  test("[P-U03] blank input is the initial state; input is trimmed", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("  kaca ");
    c.input("   ");
    expect(get(c.state)).toEqual({ kind: "initial" });
  });

  test("[P-U04] plain e's surface as the bareE state", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("prelu");
    const result = toAksara("prelu");
    if (result.kind !== "ambiguous") throw new Error("not ambiguous");
    expect(get(c.state)).toEqual({
      kind: "bareE",
      input: "prelu",
      bareE: result.bareE,
    });
  });

  test("[P-U05] reports an explicit error with an index (unsupported cluster)", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("stra");
    const state = get(c.state);
    expect(state.kind).toBe("error");
    if (state.kind !== "error") return;
    expect(state.index).toBeGreaterThanOrEqual(0);
  });

  test("[P-U05] error states keep the raw English engine text", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("qa");
    expect(get(c.state)).toMatchObject({
      kind: "error",
      message: 'Unknown character "q"',
      index: 0,
    });
  });

  test("[P-U04] picking a candidate locks the output", () => {
    const c = new LatinToAksaraConverter(pedomanRulesetId);
    c.input("sinau");
    const ambiguous = get(c.state);
    if (ambiguous.kind !== "ambiguous") throw new Error("not ambiguous");
    c.choose(1);
    expect(get(c.state)).toEqual({
      kind: "idle",
      input: "sinau",
      output: ambiguous.candidates[1]!.output,
      clusters: ambiguous.candidates[1]!.clusters,
      selected: null,
    });
  });

  test("[P-U04] an out-of-range or stray choice changes nothing", () => {
    const c = new LatinToAksaraConverter(pedomanRulesetId);
    c.choose(0);
    expect(get(c.state)).toEqual({ kind: "initial" });
    c.input("sinau");
    const before = get(c.state);
    c.choose(2);
    c.choose(-1);
    expect(get(c.state)).toBe(before);
  });

  test("[P-U04] choose does nothing in the bareE state", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("prelu");
    const before = get(c.state);
    c.choose(0);
    expect(get(c.state)).toBe(before);
  });

  test("[P-U06] [W01] copy writes the output and leaves the output visible", async () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    const clipboard = clipboardSpy();
    c.input("kaca");
    const before = get(c.state);
    await expect(c.copy(clipboard.writeText)).resolves.toBe(true);
    expect(clipboard.written).toEqual([ak("KA CA")]);
    expect(get(c.state)).toBe(before);
  });

  test("[P-U06] copy outside the idle state does nothing", async () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    const clipboard = clipboardSpy();
    await expect(c.copy(clipboard.writeText)).resolves.toBe(false);
    c.input("prelu");
    await expect(c.copy(clipboard.writeText)).resolves.toBe(false);
    expect(clipboard.written).toEqual([]);
  });

  test("[P-U06] a rejected clipboard write returns false and keeps the state", async () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("kaca");
    const before = get(c.state);
    const copied = await c.copy(() => Promise.reject(new Error("denied")));
    expect(copied).toBe(false);
    expect(get(c.state)).toBe(before);
  });

  test("never applies murda", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("Kaca");
    expect(get(c.state)).toMatchObject({ output: ak("KA CA") });
  });

  test("[P-U10] input stores the trimmed text and clusters index into it", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("  kita ");
    const state = get(c.state);
    if (state.kind !== "idle") throw new Error("not idle");
    expect(state.input).toBe("kita");
    expect(state.clusters[0]!.sources).toEqual([{ start: 0, end: 2 }]);
  });

  test("[P-U10] select moves the selection", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("kita");
    c.select(1);
    expect(get(c.state)).toMatchObject({ selected: 1 });
    c.select(0);
    expect(get(c.state)).toMatchObject({ selected: 0 });
  });

  test("[P-U10] selecting the same cluster again keeps the identical state", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("kita");
    c.select(0);
    const before = get(c.state);
    c.select(0);
    expect(get(c.state)).toBe(before);
  });

  test("[P-U10] an invalid index is a no-op", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("kita");
    const before = get(c.state);
    c.select(-1);
    c.select(2);
    c.select(0.5);
    expect(get(c.state)).toBe(before);
  });

  test.each([
    ["initial", ""],
    ["bareE", "prelu"],
    ["error", "qa"],
  ])("[P-U10] select is a no-op in the %s state", (_kind, text) => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input(text);
    const before = get(c.state);
    c.select(0);
    expect(get(c.state)).toBe(before);
  });

  test("[P-U10] input clears the selection, even for unchanged text", () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    c.input("kita");
    c.select(1);
    c.input("kita");
    expect(get(c.state)).toMatchObject({ selected: null });
  });

  test("[P-U10] copy after a selection writes exactly the output", async () => {
    const c = new LatinToAksaraConverter(kajRulesetId);
    const clipboard = clipboardSpy();
    c.input("kita");
    c.select(0);
    const before = get(c.state);
    await expect(c.copy(clipboard.writeText)).resolves.toBe(true);
    expect(clipboard.written).toEqual([expectSuccess("kita").output]);
    expect(get(c.state)).toBe(before);
  });

  test("[P-U11] a Pedoman converter surfaces the ai/au ambiguity", () => {
    const c = new LatinToAksaraConverter(pedomanRulesetId);
    c.input("sinau");
    const state = get(c.state);
    expect(state.kind).toBe("ambiguous");
    if (state.kind === "ambiguous") expect(state.candidates).toHaveLength(2);
    const kaj = new LatinToAksaraConverter(kajRulesetId);
    kaj.input("sinau");
    expect(get(kaj.state).kind).toBe("idle");
  });

  test("[P-U11] ai/au after the e choices", () => {
    const c = new LatinToAksaraConverter(pedomanRulesetId);
    c.input("rame sinau");
    expect(get(c.state).kind).toBe("bareE");
    c.input("ramé sinau");
    const state = get(c.state);
    expect(state.kind).toBe("ambiguous");
    if (state.kind === "ambiguous") expect(state.candidates).toHaveLength(2);
  });

  test("[P-U11] each converter writes with its own ruleset (vila)", () => {
    const outputOf = (id: typeof kajRulesetId | typeof pedomanRulesetId) => {
      const c = new LatinToAksaraConverter(id);
      c.input("vila");
      const state = get(c.state);
      if (state.kind !== "idle") throw new Error("not idle");
      return state.output;
    };
    expect(outputOf(pedomanRulesetId)).toBe(ak("PA CECAK_TELU WULU LA"));
    expect(outputOf(kajRulesetId)).not.toBe(outputOf(pedomanRulesetId));
  });
});
