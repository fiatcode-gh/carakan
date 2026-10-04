import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import {
  aksaraEngineRulesetId,
  toAksara,
  toLatin,
  type ConvertResult,
} from "../../src/engine/index.ts";

const FIXTURE =
  process.env["DIFF_FIXTURE"] ??
  new URL("./fixtures/dart-ebc7cb5.json", import.meta.url).pathname;

// "x" = the engine threw; the message is runtime-specific and not compared.
type Rec =
  | ["x"]
  | ["s", string]
  | ["a", string, string[], string | null]
  | ["e", number, string, string | null];

interface Fixture {
  source: { repo: string; commit: string; rulesetId: string };
  stats: { latin: number; aksara: number };
  toAksara: [string, boolean, Rec][];
  toLatin: [string, "pujl" | "jgst", Rec][];
}

const fixture = JSON.parse(readFileSync(FIXTURE, "utf8")) as Fixture;

// Same shape the Dart dumper writes: the echo is null when the result's input
// equals the call input.
function toRec(call: string, run: () => ConvertResult): Rec {
  let r: ConvertResult;
  try {
    r = run();
  } catch {
    return ["x"];
  }
  const echo = (input: string) => (input === call ? null : input);
  switch (r.kind) {
    case "success":
      return ["s", r.output];
    case "ambiguous":
      return ["a", r.reason, r.candidates.map((c) => c.output), echo(r.input)];
    case "error":
      return ["e", r.index, r.message, echo(r.input)];
  }
}

interface Mismatch {
  call: string;
  dart: Rec;
  ts: Rec;
}

function compare(
  rows: [string, string | boolean, Rec][],
  run: (input: string, opt: never) => ConvertResult,
  label: (input: string, opt: string | boolean) => string,
): Mismatch[] {
  const mismatches: Mismatch[] = [];
  for (const [input, opt, dart] of rows) {
    const ts = toRec(input, () => run(input, opt as never));
    // Contract section 3.1: where the Dart engine threw (["x"]), the TS engine
    // must return an error result instead. A TS throw is always a mismatch.
    const same =
      dart[0] === "x"
        ? ts[0] === "e"
        : JSON.stringify(ts) === JSON.stringify(dart);
    if (!same) {
      mismatches.push({ call: label(input, opt), dart, ts });
    }
  }
  return mismatches;
}

describe("[P-D02] differential: Dart engine @ebc7cb5 vs TS engine", () => {
  test("fixture is the pinned Dart revision and ruleset", () => {
    expect(fixture.source.commit).toBe(
      "ebc7cb524ca7ddea8a3adca8b21939cd3da09bca",
    );
    expect(fixture.source.rulesetId).toBe(aksaraEngineRulesetId);
  });

  // Pins the section 3.1 exception: a regenerated fixture cannot widen it
  // without this count changing.
  test('the fixture records exactly 8 Dart throws ["x"]', () => {
    const thrown = [...fixture.toAksara, ...fixture.toLatin].filter(
      ([, , rec]) => rec[0] === "x",
    );
    expect(thrown).toHaveLength(8);
  });

  test("toAksara matches the Dart engine for every recorded input", () => {
    const mismatches = compare(
      fixture.toAksara,
      (input, useMurda: boolean) => toAksara(input, { useMurda }),
      (input, murda) =>
        `toAksara(${JSON.stringify(input)}, useMurda: ${murda})`,
    );
    expect(mismatches.slice(0, 20)).toEqual([]);
    expect(mismatches).toHaveLength(0);
  });

  test("toLatin matches the Dart engine for every recorded input", () => {
    const mismatches = compare(
      fixture.toLatin,
      (input, scheme: "pujl" | "jgst") => toLatin(input, { scheme }),
      (input, scheme) => `toLatin(${JSON.stringify(input)}, scheme: ${scheme})`,
    );
    expect(mismatches.slice(0, 20)).toEqual([]);
    expect(mismatches).toHaveLength(0);
  });
});
