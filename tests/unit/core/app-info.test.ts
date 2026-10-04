import { expect, test } from "vitest";
import pkg from "../../../package.json";
import { appVersion } from "../../../src/core/app-info.ts";

test("appVersion is the package.json version, injected at build time", () => {
  expect(appVersion).toBe(pkg.version);
});
