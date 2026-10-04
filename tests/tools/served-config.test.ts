import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderLocal } from "../../tools/served/render-local.ts";

const read = (path: string): string => readFileSync(path, "utf8");

describe("local router rendering", () => {
  it("changes exactly host, entry point and tls of the production router", () => {
    const prod = read("tools/served/carakan.router.yml").split("\n");
    const local = renderLocal(read("tools/served/carakan.router.yml")).split(
      "\n",
    );

    const removed = prod.filter((l) => !local.includes(l));
    const added = local.filter((l) => !prod.includes(l));
    expect(removed.map((l) => l.trim())).toEqual([
      'rule: "Host(`carakan.fiatcode.dev`)"',
      "entryPoints: [web-secure]",
      "tls:",
      "certResolver: defaultResolver",
    ]);
    expect(added.map((l) => l.trim())).toEqual([
      'rule: "Host(`localhost`)"',
      "entryPoints: [web]",
    ]);
    expect(prod.length - local.length).toBe(2);
  });

  it("fails naming the anchor when a substitution does not match once", () => {
    expect(() => renderLocal("http: {}\n")).toThrow(/Host\(`carakan/);
  });
});

describe("sws.config.toml", () => {
  const toml = read("sws.config.toml");

  it("disables default cache headers and enables compression", () => {
    expect(toml).toMatch(/^cache-control-headers = false/m);
    expect(toml).toMatch(/^compression = true/m);
  });

  it("has exactly the two header rules, in order", () => {
    const rules = [
      ...toml.matchAll(
        /\[\[advanced\.headers\]\]\s*\nsource = "([^"]+)"\s*\n\[advanced\.headers\.headers\]\s*\nCache-Control = "([^"]+)"/g,
      ),
    ].map((m) => [m[1], m[2]]);
    expect(rules).toEqual([
      ["**", "no-cache"],
      ["/assets/**", "public, max-age=31536000, immutable"],
    ]);
    expect(toml.match(/\[\[advanced\.headers\]\]/g)).toHaveLength(2);
  });
});

describe("Dockerfile", () => {
  it("refuses to build without CARAKAN_BUILD_ID, before npm run build", () => {
    const docker = read("Dockerfile");
    const guard = docker.indexOf('test -n "$CARAKAN_BUILD_ID"');
    expect(guard).toBeGreaterThan(-1);
    expect(docker).toContain("ARG CARAKAN_BUILD_ID");
    expect(docker.indexOf("ARG CARAKAN_BUILD_ID")).toBeLessThan(guard);
    expect(guard).toBeLessThan(docker.indexOf("RUN npm run build"));
  });
});

describe("build workflow", () => {
  const wf = read(".github/workflows/build.yml");

  it("passes the build id to docker build", () => {
    expect(wf).toContain("--build-arg CARAKAN_BUILD_ID=$SHORT_SHA");
  });

  it("pushes only on push events", () => {
    expect(wf).toMatch(/if: github\.event_name == 'push'/);
    expect(wf.match(/docker push/g)).toHaveLength(2);
    expect(wf.split("Push image")[1]).toContain("event_name == 'push'");
  });
});
