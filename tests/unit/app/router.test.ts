import { describe, expect, test } from "vitest";
import {
  auditRoutes,
  href,
  isActivityRoute,
  isTabRoot,
  parseHash,
  tabOf,
  type Route,
} from "../../../src/app/router.ts";

const roundTrips: [string, Route][] = [
  ["#/", { kind: "ladder" }],
  ["#/chart", { kind: "chart" }],
  ["#/review", { kind: "review" }],
  ["#/converter", { kind: "converter" }],
  ["#/settings", { kind: "settings" }],
  ["#/teacher", { kind: "teacher" }],
  ["#/review-help", { kind: "reviewHelp" }],
  ["#/lesson/g1", { kind: "lesson", unitId: "g1" }],
  ["#/trace/pa", { kind: "trace", glyphId: "pa" }],
];

describe("[P-S05] hash routes", () => {
  test.each(roundTrips)("%s parses to its route and back", (hash, route) => {
    expect(parseHash(hash)).toEqual(route);
    expect(href(route)).toBe(hash);
  });

  test.each([
    "",
    "#",
    "#/nowhere",
    "#/lesson",
    "#/lesson/",
    "#/trace",
    "#/trace/",
    "#/trace/%E0%A4%A",
    "#/chart/x",
    "#settings",
  ])("unknown hash %j lands on the ladder", (hash) => {
    expect(parseHash(hash)).toEqual({ kind: "ladder" });
  });

  test("a lesson id survives URL encoding", () => {
    const route: Route = { kind: "lesson", unitId: "a b/c" };
    expect(parseHash(href(route))).toEqual(route);
  });

  test("a trace glyph id survives URL encoding", () => {
    const route: Route = { kind: "trace", glyphId: "a b/c" };
    expect(parseHash(href(route))).toEqual(route);
  });

  test("auditRoutes lists every route with lesson = g1 and trace = pa", () => {
    expect(auditRoutes.map(href)).toEqual(roundTrips.map(([hash]) => hash));
  });

  test("isActivityRoute is true for lesson and trace only", () => {
    expect(auditRoutes.filter(isActivityRoute).map((r) => r.kind)).toEqual([
      "lesson",
      "trace",
    ]);
  });
});

describe("[P-S04] tab roots and pushed routes", () => {
  test("only the four tab routes are tab roots", () => {
    expect(auditRoutes.filter(isTabRoot).map((r) => r.kind)).toEqual([
      "ladder",
      "chart",
      "review",
      "converter",
    ]);
  });

  test("tabOf maps tab roots to ids and pushed routes to null", () => {
    expect(tabOf({ kind: "chart" })).toBe("chart");
    expect(tabOf({ kind: "settings" })).toBeNull();
  });
});
