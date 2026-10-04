import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
};

export default defineConfig({
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  test: {
    include: ["tests/{engine,unit,content,tools}/**/*.test.ts"],
    environment: "node",
  },
});
