import { describe, expect, test } from "vitest";
import {
  kajRulesetId,
  pedomanRulesetId,
  toAksara,
  toLatin,
} from "../../src/engine/index.ts";
import { pedomanCases } from "./pedoman-2002-cases.ts";

function jgstOf(aksara: string): string {
  const back = toLatin(aksara, { scheme: "jgst" });
  if (back.kind !== "success") throw new Error("toLatin was not a success");
  return back.output;
}

describe("[P-D07] Pedoman 2002 golden cases", () => {
  for (const c of pedomanCases) {
    test(`${c.input} (${c.cite})`, () => {
      const result = toAksara(c.input, {
        ruleset: pedomanRulesetId,
        useMurda: c.useMurda ?? false,
      });
      expect(result.kind).toBe(c.expect.kind);
      if (c.expect.kind === "success" && result.kind === "success") {
        expect(result.output).toBe(c.expect.aksara);
        if (c.expect.roundTrip) {
          const back = toAksara(jgstOf(result.output), {
            ruleset: pedomanRulesetId,
          });
          expect(back.kind).toBe("success");
          if (back.kind === "success") expect(back.output).toBe(result.output);
        }
        if (c.expect.jgst !== undefined) {
          expect(jgstOf(result.output)).toBe(c.expect.jgst);
        }
      } else if (c.expect.kind === "ambiguous" && result.kind === "ambiguous") {
        expect(result.candidates.map((x) => x.output)).toEqual(
          c.expect.candidates,
        );
        expect(result.reason).toBe(c.expect.reason);
        for (const cand of result.candidates) {
          const back = toAksara(jgstOf(cand.output), {
            ruleset: pedomanRulesetId,
          });
          if (back.kind === "success") expect(back.output).toBe(cand.output);
          else if (back.kind === "ambiguous") {
            expect(back.candidates.map((x) => x.output)).toContain(cand.output);
          } else throw new Error(`candidate does not re-convert: ${c.input}`);
        }
      } else if (c.expect.kind === "error" && result.kind === "error") {
        expect(result.message).toBe(c.expect.message);
        if (c.expect.index !== undefined) {
          expect(result.index).toBe(c.expect.index);
        }
      }
    });
  }

  test("every case cites a Pedoman page or a silent point", () => {
    for (const c of pedomanCases) {
      expect(c.cite).toMatch(/^(Ped p\.\d+|Pedoman silent)/);
    }
  });

  test("the engine default ruleset is KAJ v3", () => {
    for (const c of pedomanCases) {
      const useMurda = c.useMurda ?? false;
      expect(toAksara(c.input, { useMurda })).toEqual(
        toAksara(c.input, { useMurda, ruleset: kajRulesetId }),
      );
    }
  });
});
