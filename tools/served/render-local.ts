import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

/** The only differences between the production router and the local one. */
const substitutions: ReadonlyArray<readonly [string, string]> = [
  ["Host(`carakan.fiatcode.dev`)", "Host(`localhost`)"],
  ["entryPoints: [web-secure]", "entryPoints: [web]"],
  ["      tls:\n        certResolver: defaultResolver\n", ""],
];

function countOf(text: string, anchor: string): number {
  return text.split(anchor).length - 1;
}

export function renderLocal(production: string): string {
  let out = production;
  for (const [anchor, replacement] of substitutions) {
    if (countOf(out, anchor) !== 1) {
      throw new Error(
        `render-local: anchor must match exactly once: ${JSON.stringify(anchor)}`,
      );
    }
    out = out.replace(anchor, () => replacement);
  }
  return out;
}

if (import.meta.main) {
  try {
    const outDir = ".cache/served/dynamic";
    mkdirSync(outDir, { recursive: true });
    const rendered = renderLocal(
      readFileSync("tools/served/carakan.router.yml", "utf8"),
    );
    writeFileSync(`${outDir}/carakan.yml`, rendered);
    copyFileSync("tools/served/middlewares.yml", `${outDir}/middlewares.yml`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
