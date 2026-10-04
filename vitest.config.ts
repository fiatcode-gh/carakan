import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/{engine,unit,content,tools}/**/*.test.ts"],
    environment: "node",
  },
});
