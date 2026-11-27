import { describe, expect, it } from "vitest";
import { parsePrecache, workboxScript } from "../../tools/pages/sw-manifest.ts";

const REV_A = "0123456789abcdef0123456789abcdef";
const REV_B = "fedcba9876543210fedcba9876543210";

const sw = (entries: string): string =>
  `define(["./workbox-2fbc6a65"],(function(e){"use strict";self.skipWaiting(),e.clientsClaim(),e.precacheAndRoute([${entries}],{})}));`;

describe("parsePrecache", () => {
  it("parses revisioned and null entries in first-seen order, dropping same-revision repeats", () => {
    const text = sw(
      `{url:"manifest.webmanifest",revision:"${REV_A}"},` +
        `{url:"assets/index-abc123.js",revision:null},` +
        `{url:"index.html",revision:"${REV_B}"},` +
        `{url:"manifest.webmanifest",revision:"${REV_A}"}`,
    );
    expect(parsePrecache(text)).toEqual([
      { url: "manifest.webmanifest", revision: REV_A },
      { url: "assets/index-abc123.js", revision: null },
      { url: "index.html", revision: REV_B },
    ]);
  });

  it("throws on a url listed with conflicting revisions", () => {
    const text = sw(
      `{url:"index.html",revision:"${REV_A}"},` +
        `{url:"icon.png",revision:"${REV_A}"},` +
        `{url:"icon.png",revision:"${REV_B}"}`,
    );
    expect(() => parsePrecache(text)).toThrow(
      "conflicting revisions for icon.png",
    );
  });

  it("throws on a url listed both revisioned and unrevisioned", () => {
    const text = sw(
      `{url:"index.html",revision:"${REV_A}"},` +
        `{url:"index.html",revision:null}`,
    );
    expect(() => parsePrecache(text)).toThrow(
      "conflicting revisions for index.html",
    );
  });

  it("throws when sw.js lists no entries", () => {
    expect(() => parsePrecache(sw(""))).toThrow(
      "sw.js lists no precache entries",
    );
  });

  it("throws when index.html is not precached", () => {
    const text = sw(`{url:"manifest.webmanifest",revision:"${REV_A}"}`);
    expect(() => parsePrecache(text)).toThrow("index.html is not precached");
  });
});

describe("workboxScript", () => {
  it("returns the imported workbox runtime file name", () => {
    expect(workboxScript(sw(""))).toBe("workbox-2fbc6a65.js");
  });

  it("throws when sw.js imports no workbox runtime", () => {
    expect(() =>
      workboxScript(`self.addEventListener("install",()=>{});`),
    ).toThrow("sw.js imports no workbox-<hash> script");
  });
});
