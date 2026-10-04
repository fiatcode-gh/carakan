import { svelte } from "@sveltejs/vite-plugin-svelte";
import { readFileSync } from "node:fs";
import { defineConfig } from "vitest/config";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
};

export default defineConfig({
  plugins: [svelte()],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { sourcemap: false, target: "es2022" },
  test: {
    include: ["tests/{engine,unit,content,tools}/**/*.test.ts"],
    environment: "node",
  },
});
