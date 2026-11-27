import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { gzipSync } from "node:zlib";

const HEADER_ESTIMATE = 500;
const BUDGET = 1_000_000;
const DIST = "dist";

interface DistFile {
  /** Path relative to dist/, with `/` separators. */
  rel: string;
  /** Request path: `/` for the index, `/<rel>` otherwise. */
  urlPath: string;
  size: number;
  ext: string;
}

function distFiles(): DistFile[] {
  const out: DistFile[] = [];
  const walk = (dir: string): void => {
    for (const name of readdirSync(dir).sort()) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      const rel = relative(DIST, full).split("\\").join("/");
      out.push({
        rel,
        urlPath: rel === "index.html" ? "/" : `/${rel}`,
        size: statSync(full).size,
        ext: extname(rel),
      });
    }
  };
  walk(DIST);
  return out;
}

function readDist(rel: string): Buffer {
  return readFileSync(join(DIST, rel));
}

/** Extensions the estimate counts as gzip-compressed in transit. */
const COMPRESSIBLE = new Set([
  ".html",
  ".js",
  ".css",
  ".json",
  ".webmanifest",
  ".svg",
  ".txt",
  ".ttf",
]);

const MIN_COMPRESS_BYTES = 200;

let total = 0;
console.log("estimate (gzip level 6 for compressible types, +500 B headers)");
for (const f of distFiles()) {
  const compressed = COMPRESSIBLE.has(f.ext) && f.size >= MIN_COMPRESS_BYTES;
  const body = compressed
    ? gzipSync(readDist(f.rel), { level: 6 }).length
    : f.size;
  const wire = body + HEADER_ESTIMATE;
  total += wire;
  console.log(
    `${String(wire).padStart(9)}  ${compressed ? "gz " : "raw"}  ${f.urlPath}`,
  );
}
console.log(`total ${total} bytes (budget ${BUDGET})`);
process.exit(total > BUDGET ? 1 : 0);
