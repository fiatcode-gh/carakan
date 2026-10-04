import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildFeedbackReport } from "../../../src/features/settings/feedback-report.ts";

describe("buildFeedbackReport [P-T06]", () => {
  it("names the ruleset id and version", () => {
    const report = buildFeedbackReport({
      description: "saté salah",
      appVersion: "0.1.0+1",
      rulesetId: "kaj1-2021-simplified-v1",
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
      }),
    ).toBe(expected);
  });
});
