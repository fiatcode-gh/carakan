import { defineConfig } from "vite";

// The prototype reads engine/content modules and fonts from the repo root, and
// serves ../public (content JSON, Jejeg) at "/".
export default defineConfig({
  root: "prototype",
  publicDir: "../public",
  server: { fs: { allow: [".."] } },
});
