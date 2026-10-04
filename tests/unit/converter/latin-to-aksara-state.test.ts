import { get } from "svelte/store";
import { describe, expect, test } from "vitest";
import { LatinToAksaraConverter } from "../../../src/features/converter/latin-to-aksara-state.ts";
import { ak } from "../../engine/support/aksara-builder.ts";

const clipboardSpy = () => {
  const written: string[] = [];
  return {
    written,
    writeText: async (text: string) => void written.push(text),
  };
};

describe("LatinToAksaraConverter", () => {
  test("[P-U03] converts an unambiguous word", () => {
    const c = new LatinToAksaraConverter();
    c.input("kaca");
    expect(get(c.state)).toEqual({
      kind: "idle",
      output: ak("KA CA"),
    });
  });

  test("[P-U03] blank input is the initial state; input is trimmed", () => {
    const c = new LatinToAksaraConverter();
    c.input("  kaca ");
    c.input("   ");
    expect(get(c.state)).toEqual({ kind: "initial" });
  });

  test("[P-U04] surfaces ambiguity with both candidates (bare e)", () => {
    const c = new LatinToAksaraConverter();
    c.input("prelu");
    const state = get(c.state);
    expect(state.kind).toBe("ambiguous");
    if (state.kind !== "ambiguous") return;
    expect(state.candidates).toHaveLength(2);
    expect(state.reason).not.toBe("");
  });

  test("[P-U05] reports an explicit error with an index (unsupported cluster)", () => {
    const c = new LatinToAksaraConverter();
    c.input("stra");
    const state = get(c.state);
    expect(state.kind).toBe("error");
    if (state.kind !== "error") return;
    expect(state.index).toBeGreaterThanOrEqual(0);
  });

  test("[P-U05] error states keep the raw English engine text", () => {
    const c = new LatinToAksaraConverter();
    c.input("qa");
    expect(get(c.state)).toMatchObject({
      kind: "error",
      message: 'Unknown character "q"',
      index: 0,
    });
  });

  test("[P-U04] picking a candidate locks the output", () => {
    const c = new LatinToAksaraConverter();
    c.input("prelu");
    const ambiguous = get(c.state);
    if (ambiguous.kind !== "ambiguous") throw new Error("not ambiguous");
    c.choose(1);
    expect(get(c.state)).toEqual({
      kind: "idle",
      output: ambiguous.candidates[1],
    });
  });

  test("[P-U04] an out-of-range or stray choice changes nothing", () => {
    const c = new LatinToAksaraConverter();
    c.choose(0);
    expect(get(c.state)).toEqual({ kind: "initial" });
    c.input("prelu");
    const before = get(c.state);
    c.choose(2);
    c.choose(-1);
    expect(get(c.state)).toBe(before);
  });

  test("[P-U06] [W01] copy writes the output and leaves the output visible", async () => {
    const c = new LatinToAksaraConverter();
    const clipboard = clipboardSpy();
    c.input("kaca");
    const before = get(c.state);
    await expect(c.copy(clipboard.writeText)).resolves.toBe(true);
    expect(clipboard.written).toEqual([ak("KA CA")]);
    expect(get(c.state)).toBe(before);
  });

  test("[P-U06] copy outside the idle state does nothing", async () => {
    const c = new LatinToAksaraConverter();
    const clipboard = clipboardSpy();
    await expect(c.copy(clipboard.writeText)).resolves.toBe(false);
    c.input("prelu");
    await expect(c.copy(clipboard.writeText)).resolves.toBe(false);
    expect(clipboard.written).toEqual([]);
  });

  test("[P-U06] a rejected clipboard write returns false and keeps the state", async () => {
    const c = new LatinToAksaraConverter();
    c.input("kaca");
    const before = get(c.state);
    const copied = await c.copy(() => Promise.reject(new Error("denied")));
    expect(copied).toBe(false);
    expect(get(c.state)).toBe(before);
  });

  test("never applies murda", () => {
    const c = new LatinToAksaraConverter();
    c.input("Kaca");
    expect(get(c.state)).toMatchObject({ output: ak("KA CA") });
  });
});
