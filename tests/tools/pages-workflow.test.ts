import { readdirSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const WORKFLOWS = ".github/workflows";
const read = (name: string): string =>
  readFileSync(`${WORKFLOWS}/${name}`, "utf8");

describe("pages workflow", () => {
  const wf = read("pages.yml");
  const deployAt = wf.indexOf("\n  deploy:\n");
  const beforeDeploy = wf.slice(0, deployAt);
  const deployJob = wf.slice(deployAt);

  it("the main ruleset's required checks are job ids `lint-and-test` and `build`", () => {
    expect(read("ci.yml")).toMatch(/^ {2}lint-and-test:$/m);
    const withBuildJob = readdirSync(WORKFLOWS)
      .filter((name) => name.endsWith(".yml"))
      .filter((name) => /^ {2}build:$/m.test(read(name)));
    expect(withBuildJob).toEqual(["pages.yml"]);
  });

  it("builds on pull requests and on pushes to main", () => {
    expect(wf).toContain("push:\n    branches: [main]");
    expect(wf).toContain("pull_request:\n    branches: [main]");
  });

  it("stamps the short commit as the build id", () => {
    expect(wf).toContain(
      'run: CARAKAN_BUILD_ID="${GITHUB_SHA::7}" npm run build',
    );
  });

  it("uploads and deploys only on push", () => {
    const upload = wf.slice(wf.indexOf("name: Upload Pages artifact"));
    const uploadStep = upload.slice(0, upload.indexOf("\n\n"));
    expect(uploadStep).toContain("if: github.event_name == 'push'");
    expect(uploadStep).toContain("path: dist");

    expect(deployAt).toBeGreaterThan(-1);
    for (const line of [
      "if: github.event_name == 'push'",
      "needs: build",
      "name: github-pages",
      "actions/configure-pages@v6",
      "actions/deploy-pages@v5",
    ]) {
      expect(deployJob).toContain(line);
    }
  });

  it("only the deploy job can publish", () => {
    expect(deployAt).toBeGreaterThan(-1);
    expect(beforeDeploy).not.toContain("pages: write");
    expect(beforeDeploy).not.toContain("id-token: write");
    expect(deployJob).toContain("pages: write");
    expect(deployJob).toContain("id-token: write");
  });

  it("serializes runs per ref at workflow level without cancelling queued deploys", () => {
    const topLevel = wf.slice(0, wf.indexOf("\njobs:\n"));
    expect(topLevel).toContain(
      "\nconcurrency:\n  group: pages-${{ github.ref }}\n",
    );
    expect(
      topLevel,
      "workflow concurrency must keep cancel-in-progress: false",
    ).toMatch(/^ {2}cancel-in-progress: false$/m);
    expect(deployJob).not.toContain("concurrency:");
  });
});
