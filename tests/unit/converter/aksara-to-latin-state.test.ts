import { get } from "svelte/store";
import { describe, expect, test } from "vitest";
import { AksaraToLatinConverter } from "../../../src/features/converter/aksara-to-latin-state.ts";
import { ak } from "../../engine/support/aksara-builder.ts";

describe("AksaraToLatinConverter", () => {
  test("[P-U07] converts aksara to PUJL by default", () => {
    const c = new AksaraToLatinConverter();
    c.input(ak("KA CA"));
    expect(get(c.state)).toEqual({
      kind: "idle",
      output: "kaca",
      scheme: "pujl",
    });
    expect(get(c.scheme)).toBe("pujl");
  });

  test("[P-U07] toggling re-converts the last raw input in JGST and back", () => {
    const c = new AksaraToLatinConverter();
    c.input(ak("KA CAKRA SA"));
    expect(get(c.state)).toMatchObject({ output: "krasa", scheme: "pujl" });
    c.toggleScheme();
    expect(get(c.state)).toMatchObject({ output: "kŕasa", scheme: "jgst" });
    expect(get(c.scheme)).toBe("jgst");
    c.toggleScheme();
    expect(get(c.state)).toMatchObject({ output: "krasa", scheme: "pujl" });
  });

  test("[P-U07] toggling with no input stays initial", () => {
    const c = new AksaraToLatinConverter();
    c.toggleScheme();
    expect(get(c.state)).toEqual({ kind: "initial" });
  });

  test("[P-U07] blank input is the initial state", () => {
    const c = new AksaraToLatinConverter();
    c.input(ak("KA"));
    c.input("  ");
    expect(get(c.state)).toEqual({ kind: "initial" });
  });

  test("[P-U07] non-aksara input is an error carrying the raw engine text", () => {
    const c = new AksaraToLatinConverter();
    c.input("abc");
    expect(get(c.state)).toEqual({
      kind: "error",
      message: "Unrecognized codepoint U+0061",
    });
  });

  test("[P-U09] a lone vowel sign is an error with the engine message", () => {
    const c = new AksaraToLatinConverter();
    c.input(ak("WULU"));
    expect(get(c.state)).toEqual({
      kind: "error",
      message: "Sandhangan without a base aksara",
    });
  });

  test("[P-U06] [W01] copy writes the output and leaves the output visible", async () => {
    const c = new AksaraToLatinConverter();
    const written: string[] = [];
    c.input(ak("KA CA"));
    const before = get(c.state);
    await expect(c.copy(async (text) => void written.push(text))).resolves.toBe(
      true,
    );
    expect(written).toEqual(["kaca"]);
    expect(get(c.state)).toBe(before);
  });

  test("[P-U06] copy outside the idle state, or rejected, returns false", async () => {
    const c = new AksaraToLatinConverter();
    await expect(c.copy(async () => {})).resolves.toBe(false);
    c.input(ak("KA"));
    await expect(c.copy(() => Promise.reject(new Error("no")))).resolves.toBe(
      false,
    );
  });
});
