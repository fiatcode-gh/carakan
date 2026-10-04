import { svelte } from "@sveltejs/vite-plugin-svelte";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { VitePWA } from "vite-plugin-pwa";
import { defineConfig, type Plugin } from "vitest/config";

const pkg = JSON.parse(readFileSync("package.json", "utf8")) as {
  version: string;
};

/** `CARAKAN_BUILD_ID`, else the short git head; never a placeholder. */
function buildId(): string {
  const fromEnv = process.env["CARAKAN_BUILD_ID"];
  if (fromEnv !== undefined && fromEnv !== "") return fromEnv;
  try {
    const head = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (head !== "") return head;
  } catch {
    // falls through to the error below
  }
  throw new Error("CARAKAN_BUILD_ID is not set and git is unavailable");
}

/**
 * Names the build in `meta[name=carakan-build]`. A rebuilt `index.html` then
 * differs per build, which is also what makes it a new precache revision.
 */
function buildMeta(): Plugin {
  return {
    name: "carakan-build-meta",
    apply: "build",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { name: "carakan-build", content: buildId() },
        injectTo: "head",
      },
    ],
  };
}

const paper = "#FAF3E7"; // --color-bg

export default defineConfig({
  plugins: [
    svelte(),
    buildMeta(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      strategies: "generateSW",
      manifest: {
        name: "Carakan",
        short_name: "Carakan",
        description: "Belajar aksara Jawa, sepenuhnya luring.",
        lang: "id",
        dir: "ltr",
        id: "/",
        start_url: "/",
        scope: "/",
        display: "standalone",
        background_color: paper,
        theme_color: paper,
        icons: [
          {
            src: "icons/icon-192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any",
          },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: [
          "**/*.{html,js,css,json,woff2,ttf,png,svg,webmanifest,txt}",
        ],
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        skipWaiting: false,
        clientsClaim: false,
      },
    }),
  ],
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  build: { sourcemap: false, target: "es2022" },
  test: {
    include: ["tests/{engine,unit,content,tools}/**/*.test.ts"],
    environment: "node",
  },
});
