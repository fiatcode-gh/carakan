import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { kajRulesetId, pedomanRulesetId } from "../../../src/engine/index.ts";
import {
  buildFeedbackReport,
  FEEDBACK_RULE_SOURCES,
} from "../../../src/features/settings/feedback-report.ts";

const sources = FEEDBACK_RULE_SOURCES[kajRulesetId];

describe("buildFeedbackReport [P-T06]", () => {
  it("names the ruleset id and version", () => {
    const report = buildFeedbackReport({
      description: "saté salah",
      appVersion: "0.1.0+1",
      rulesetId: "kaj1-2021-simplified-v1",
      sources,
    });
    expect(report).toContain("kaj1-2021-simplified-v1");
    expect(report).toContain("0.1.0+1");
    expect(report).toContain("saté salah");
  });

  it("lists the cited authorities", () => {
    const report = buildFeedbackReport({
      description: "",
      appVersion: "0.1.0+1",
      rulesetId: "kaj1-2021-simplified-v1",
      sources,
    });
    expect(report).toContain("Kongres Aksara Jawa I");
    expect(report).toContain("Sriwedari");
  });

  it("matches the Dart text extracted at ebc7cb5 exactly", () => {
    const expected = readFileSync(
      "tests/unit/settings/feedback-report.dart-fixture.txt",
      "utf8",
    );
    expect(
      buildFeedbackReport({
        description: "saté salah",
        appVersion: "0.1.0+1",
        rulesetId: "kaj1-2021-simplified-v1",
        sources,
      }),
    ).toBe(expected);
  });

  it("names Pedoman 2002 as the rule source when it is active", () => {
    const report = buildFeedbackReport({
      description: "",
      appVersion: "0.1.0+1",
      rulesetId: pedomanRulesetId,
      sources: FEEDBACK_RULE_SOURCES[pedomanRulesetId],
    });
    expect(report).toContain("pedoman-2002-v1");
    expect(report).toContain(
      "Pedoman Penulisan Aksara Jawa (Yayasan Pustaka Nusatama, 2002)",
    );
  });
});
