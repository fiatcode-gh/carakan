// Pixel diff of two design:compare output directories. Evidence only; the
// output is not committed.
//
//   npm run design:diff -- <baseDir> <headDir>
//
// For every app-*.png in baseDir (sorted) the same file must exist in headDir
// with identical dimensions and identical RGBA bytes. A difference writes
// diff-<name>.png into headDir (differing pixels opaque red over a 25% alpha
// copy of the head image). One line per file, a summary, exit code 1 on any
// missing file, size mismatch or differing pixel. There is no tolerance.
import { chromium } from "@playwright/test";
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [baseDir, headDir] = process.argv.slice(2);
if (baseDir === undefined || headDir === undefined) {
  console.error("usage: npm run design:diff -- <baseDir> <headDir>");
  process.exit(2);
}

const names = readdirSync(baseDir)
  .filter((f) => f.startsWith("app-") && f.endsWith(".png"))
  .sort();
if (names.length === 0) {
  console.error(`no app-*.png in ${baseDir}`);
  process.exit(2);
}

const dataUrl = (path: string): string =>
  `data:image/png;base64,${readFileSync(path).toString("base64")}`;

type Result =
  | { kind: "same" }
  | { kind: "size"; base: string; head: string }
  | { kind: "diff"; count: number; png: string };

const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("about:blank");

let failures = 0;
for (const name of names) {
  const headPath = join(headDir, name);
  if (!existsSync(headPath)) {
    console.log(`${name}  missing`);
    failures++;
    continue;
  }
  const result: Result = await page.evaluate(
    async ([baseUrl, headUrl]) => {
      const decode = async (url: string) => {
        const bitmap = await createImageBitmap(await (await fetch(url)).blob());
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
        ctx.drawImage(bitmap, 0, 0);
        return {
          width: bitmap.width,
          height: bitmap.height,
          data: ctx.getImageData(0, 0, bitmap.width, bitmap.height).data,
        };
      };
      const a = await decode(baseUrl!);
      const b = await decode(headUrl!);
      if (a.width !== b.width || a.height !== b.height)
        return {
          kind: "size" as const,
          base: `${a.width}x${a.height}`,
          head: `${b.width}x${b.height}`,
        };
      const out = new ImageData(b.width, b.height);
      let count = 0;
      for (let i = 0; i < a.data.length; i += 4) {
        const same =
          a.data[i] === b.data[i] &&
          a.data[i + 1] === b.data[i + 1] &&
          a.data[i + 2] === b.data[i + 2] &&
          a.data[i + 3] === b.data[i + 3];
        if (same) {
          out.data[i] = b.data[i]!;
          out.data[i + 1] = b.data[i + 1]!;
          out.data[i + 2] = b.data[i + 2]!;
          out.data[i + 3] = Math.round(b.data[i + 3]! / 4);
        } else {
          count++;
          out.data[i] = 255;
          out.data[i + 1] = 0;
          out.data[i + 2] = 0;
          out.data[i + 3] = 255;
        }
      }
      if (count === 0) return { kind: "same" as const };
      const canvas = new OffscreenCanvas(b.width, b.height);
      canvas.getContext("2d")!.putImageData(out, 0, 0);
      const blob = await canvas.convertToBlob({ type: "image/png" });
      const bytes = new Uint8Array(await blob.arrayBuffer());
      let binary = "";
      for (const byte of bytes) binary += String.fromCharCode(byte);
      return { kind: "diff" as const, count, png: btoa(binary) };
    },
    [dataUrl(join(baseDir, name)), dataUrl(headPath)] as const,
  );
  if (result.kind === "same") {
    console.log(`${name}  OK`);
  } else if (result.kind === "size") {
    console.log(`${name}  size ${result.base} vs ${result.head}`);
    failures++;
  } else {
    writeFileSync(
      join(headDir, `diff-${name}`),
      Buffer.from(result.png, "base64"),
    );
    console.log(`${name}  ${result.count} px differ`);
    failures++;
  }
}
await browser.close();

console.log(
  failures === 0
    ? `${names.length} files, all identical`
    : `${failures} of ${names.length} files differ`,
);
process.exit(failures === 0 ? 0 : 1);
